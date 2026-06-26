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

      const safeFileName = createSafeFileName(file.name)

      const uniqueFileName = [
        Date.now(),
        crypto.randomUUID(),
        safeFileName,
      ].join('-')

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(uniqueFileName, file, {
          contentType: file.type || 'application/pdf',
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        throw new Error('Gagal mengunggah file: ' + uploadError.message)
      }

      const uploadedFilePath = uploadData.path

      const { error: insertError } = await supabase.from('documents').insert({
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
      <div className="section-header">
        <div>
          <span className="section-label">Admin Panel</span>
          <h2>Tambah Dokumen</h2>
        </div>

        <span className="admin-badge">Admin Only</span>
      </div>

      <form className="admin-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="document-title">Judul Dokumen</label>

          <input
            id="document-title"
            type="text"
            value={title}
            required
            disabled={loading}
            placeholder="Contoh: Panduan Keamanan Informasi"
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <div className="form-field">
          <label htmlFor="document-file">File PDF</label>

          <label className="file-upload-box" htmlFor="document-file">
            <div className="file-upload-icon">PDF</div>

            <div>
              <strong>
                {file ? file.name : 'Klik untuk memilih file PDF'}
              </strong>

              <span>
                {file
                  ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
                  : 'Maksimal 10 MB, format PDF'}
              </span>
            </div>
          </label>

          <input
            id="document-file"
            className="file-input"
            type="file"
            accept=".pdf,application/pdf"
            required
            disabled={loading}
            onChange={handleFileChange}
          />
        </div>

        {message && (
          <p
            className={`form-message ${
              message.includes('berhasil') ? 'success' : 'error'
            }`}
          >
            {message}
          </p>
        )}

        <button
          className="upload-button"
          type="submit"
          disabled={loading || !file}
        >
          {loading ? 'Mengunggah...' : 'Upload Dokumen'}
        </button>
      </form>
    </section>
  )
}