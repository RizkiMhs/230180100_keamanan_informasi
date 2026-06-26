import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function EnrollMFA({ onSuccess }) {
  const hasStarted = useRef(false)

  const [factorId, setFactorId] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (hasStarted.current) {
      return
    }

    hasStarted.current = true

    async function enroll() {
      setMessage('')

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Google Authenticator',
      })

      if (error) {
        setMessage(error.message)
        return
      }

      setFactorId(data.id)
      setQrCode(data.totp.qr_code)
      setSecret(data.totp.secret)
    }

    enroll()
  }, [])

  async function handleVerify(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    if (!/^\d{6}$/.test(code)) {
      setMessage('Masukkan kode 6 digit.')
      setLoading(false)
      return
    }

    if (!factorId) {
      setMessage('Data 2FA belum siap. Tunggu beberapa saat.')
      setLoading(false)
      return
    }

    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({
        factorId,
      })

    if (challengeError) {
      setMessage(challengeError.message)
      setLoading(false)
      return
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    })

    if (verifyError) {
      setMessage('Kode tidak valid: ' + verifyError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    onSuccess()
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleVerify}>
        <div className="auth-header">
          <h1>Aktifkan 2FA</h1>
          <p>Pindai QR code berikut menggunakan Google Authenticator.</p>
        </div>

        {qrCode && (
          <img
            className="qr-code"
            src={qrCode}
            alt="QR Code Google Authenticator"
          />
        )}

        {secret && (
          <div className="secret-box">
            <strong>Kode manual:</strong>
            <span>{secret}</span>
          </div>
        )}

        <div className="auth-form-group">
          <label htmlFor="enroll-code">Kode 6 Digit</label>
          <input
            id="enroll-code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            required
            placeholder="Masukkan kode 6 digit"
            onChange={(event) =>
              setCode(event.target.value.replace(/\D/g, ''))
            }
          />
        </div>

        {message && <p className="error-message">{message}</p>}

        <button
          className="auth-submit"
          type="submit"
          disabled={!factorId || loading}
        >
          {loading ? 'Mengaktifkan...' : 'Aktifkan 2FA'}
        </button>
      </form>
    </main>
  )
}