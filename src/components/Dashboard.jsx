
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import AdminPanel from './AdminPanel'

export default function Dashboard() {
  const [documents, setDocuments] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setMessage('')

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        setMessage(
          'Gagal mendapatkan data pengguna: ' +
            userError.message
        )
        setLoading(false)
        return
      }

      if (!user) {
        setMessage('Sesi pengguna tidak ditemukan.')
        setLoading(false)
        return
      }

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('id', user.id)
        .single()

      if (profileError) {
        setMessage(
          'Gagal memuat profil: ' +
            profileError.message
        )
        setLoading(false)
        return
      }

      const {
        data: documentData,
        error: documentError,
      } = await supabase
        .from('documents')
        .select('id, title, file_path, created_at')
        .order('created_at', {
          ascending: false,
        })

      if (documentError) {
        setMessage(
          'Gagal memuat dokumen: ' +
            documentError.message
        )
        setLoading(false)
        return
      }

      setProfile(profileData)
      setDocuments(documentData ?? [])
    } catch (error) {
      console.error('Load data error:', error)

      setMessage(
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan ketika memuat data.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function requestFile(documentItem, mode) {
    setMessage('')

    try {
      if (!documentItem?.file_path) {
        setMessage('Path file tidak ditemukan.')
        return
      }

      const {
        data: fileBlob,
        error: downloadError,
      } = await supabase.storage
        .from('dokumen-tugas')
        .download(documentItem.file_path)

      if (downloadError) {
        setMessage(
          `${
            mode === 'download'
              ? 'Gagal mengunduh dokumen'
              : 'Gagal membuka dokumen'
          }: ${downloadError.message}`
        )
        return
      }

      if (!fileBlob) {
        setMessage('Data file tidak ditemukan.')
        return
      }

      const objectUrl = URL.createObjectURL(fileBlob)

      const fileName =
        documentItem.file_path
          .split('/')
          .pop() || 'dokumen.pdf'

      /*
       * Membuka file di tab baru.
       */
      if (mode === 'inline') {
        const newWindow = window.open(
          objectUrl,
          '_blank',
          'noopener,noreferrer'
        )

        if (!newWindow) {
          URL.revokeObjectURL(objectUrl)
          setMessage(
            'Dokumen gagal dibuka. Izinkan pop-up pada browser.'
          )
          return
        }

        /*
         * Object URL tidak langsung dihapus karena masih
         * digunakan oleh tab baru.
         */
        setTimeout(() => {
          URL.revokeObjectURL(objectUrl)
        }, 60000)

        return
      }

      /*
       * Mengunduh file.
       *
       * window.document digunakan agar tidak bertabrakan
       * dengan data dokumen dari database.
       */
      if (mode === 'download') {
        const anchor =
          window.document.createElement('a')

        anchor.href = objectUrl
        anchor.download = fileName
        anchor.style.display = 'none'

        window.document.body.appendChild(anchor)

        anchor.click()
        anchor.remove()

        /*
         * Berikan waktu kepada browser untuk memulai
         * proses download sebelum URL dihapus.
         */
        setTimeout(() => {
          URL.revokeObjectURL(objectUrl)
        }, 1000)

        return
      }

      URL.revokeObjectURL(objectUrl)
      setMessage('Mode akses dokumen tidak valid.')
    } catch (error) {
      console.error('Request file error:', error)

      setMessage(
        `Terjadi kesalahan ketika ${
          mode === 'download'
            ? 'mengunduh'
            : 'membuka'
        } dokumen: ${
          error instanceof Error
            ? error.message
            : 'Kesalahan tidak diketahui'
        }`
      )
    }
  }

  async function handleLogout() {
    setMessage('')

    const { error } =
      await supabase.auth.signOut()

    if (error) {
      setMessage(
        'Gagal logout: ' + error.message
      )
    }
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Portal Dokumen Tugas</h1>

          <p>
            {profile?.email} · {profile?.role}
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
        >
          Logout
        </button>
      </header>

      {message && (
        <p className="error-message">
          {message}
        </p>
      )}

      {profile?.role === 'admin' && (
        <AdminPanel onChanged={loadData} />
      )}

      <section className="document-section">
        <h2>Daftar Dokumen</h2>

        {loading && (
          <p>Memuat dokumen...</p>
        )}

        {!loading &&
          documents.length === 0 && (
            <p>Belum ada dokumen.</p>
          )}

        <div className="document-list">
          {documents.map((documentItem) => (
            <article
              className="document-card"
              key={documentItem.id}
            >
              <div>
                <h3>{documentItem.title}</h3>

                <small>
                  Ditambahkan pada{' '}
                  {new Date(
                    documentItem.created_at
                  ).toLocaleString('id-ID')}
                </small>
              </div>

              <div className="document-actions">
                <button
                  type="button"
                  onClick={() =>
                    requestFile(
                      documentItem,
                      'inline'
                    )
                  }
                >
                  Buka
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    requestFile(
                      documentItem,
                      'download'
                    )
                  }
                >
                  Download
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

