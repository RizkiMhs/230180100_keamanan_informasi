import { useState } from 'react'
import { supabase } from '../lib/supabase'

const BUCKET_NAME = 'dokumen-tugas'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export default function AdminPanel({ onChanged }) {
  const [title, setTitle] = useState('')
  const [file, setFile] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0]

    setMessage('')

    if (!selectedFile) {
      setFile(null)
      return
    }

    const isPdf =
      selectedFile.type === 'application/pdf' ||
      selectedFile.name.toLowerCase().endsWith('.pdf')

    if (!isPdf) {
      event.target.value = ''
      setFile(null)
      setMessage('File yang dapat diunggah hanya PDF.')
      return
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      event.target.value = ''
      setFile(null)
      setMessage('Ukuran file maksimal 10 MB.')
      return
    }

    setFile(selectedFile)
  }

  function createSafeFileName(originalFileName) {
    return originalFileName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9._-]/g, '')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const form = event.currentTarget

    if (!file) {
      setMessage('Pilih file PDF terlebih dahulu.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      /*
       * Memeriksa pengguna yang sedang login.
       */
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw new Error(userError.message)
      }

      if (!user) {
        throw new Error('Pengguna tidak ditemukan.')
      }

      /*
       * Membuat nama file yang aman dan unik.
       *
       * Contoh:
       * 1750843000000-uuid-laporan-tugas.pdf
       */
      const safeFileName = createSafeFileName(file.name)

      const uniqueFileName = [
        Date.now(),
        crypto.randomUUID(),
        safeFileName,
      ].join('-')

      /*
       * Upload file lokal ke bucket dokumen-tugas.
       */
      const {
        data: uploadData,
        error: uploadError,
      } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(uniqueFileName, file, {
          contentType: file.type || 'application/pdf',
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        throw new Error(
          'Gagal mengunggah file: ' + uploadError.message
        )
      }

      /*
       * Path tidak diketik pengguna.
       * Path diambil langsung dari hasil upload.
       */
      const uploadedFilePath = uploadData.path

      /*
       * Menyimpan judul dan path file ke tabel documents.
       */
      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          title: title.trim(),
          file_path: uploadedFilePath,
          created_by: user.id,
        })

      if (insertError) {
        throw new Error(
          'File berhasil diunggah, tetapi data dokumen gagal disimpan: ' +
            insertError.message
        )
      }

      setTitle('')
      setFile(null)
      form.reset()

      setMessage('Dokumen berhasil diunggah.')

      if (typeof onChanged === 'function') {
        await onChanged()
      }
    } catch (error) {
      console.error('Upload file error:', error)

      setMessage(
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat mengunggah file.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="admin-panel">
      <h2>Tambah Dokumen</h2>

      <form onSubmit={handleSubmit}>
        <label htmlFor="document-title">
          Judul Dokumen
        </label>

        <input
          id="document-title"
          type="text"
          value={title}
          required
          disabled={loading}
          placeholder="Masukkan judul dokumen"
          onChange={(event) =>
            setTitle(event.target.value)
          }
        />

        <label htmlFor="document-file">
          Pilih File PDF
        </label>

        <input
          id="document-file"
          type="file"
          accept=".pdf,application/pdf"
          required
          disabled={loading}
          onChange={handleFileChange}
        />

        {file && (
          <div className="selected-file">
            <p>
              <strong>File:</strong> {file.name}
            </p>

            <p>
              <strong>Ukuran:</strong>{' '}
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        )}

        {message && (
          <p className="form-message">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !file}
        >
          {loading
            ? 'Mengunggah...'
            : 'Upload Dokumen'}
        </button>
      </form>
    </section>
  )
}