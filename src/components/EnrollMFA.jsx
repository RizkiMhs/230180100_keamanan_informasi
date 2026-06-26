import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function EnrollMFA({ onSuccess }) {
  const hasStarted = useRef(false)

  const [factorId, setFactorId] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (hasStarted.current) {
      return
    }

    hasStarted.current = true

    async function enroll() {
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
    setMessage('')

    if (!/^\d{6}$/.test(code)) {
      setMessage('Masukkan kode 6 digit.')
      return
    }

    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({
        factorId,
      })

    if (challengeError) {
      setMessage(challengeError.message)
      return
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    })

    if (verifyError) {
      setMessage('Kode tidak valid: ' + verifyError.message)
      return
    }

    onSuccess()
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleVerify}>
        <h1>Aktifkan 2FA</h1>

        <p>
          Pindai QR code berikut menggunakan Google Authenticator.
        </p>

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

        <label htmlFor="enroll-code">Kode 6 Digit</label>
        <input
          id="enroll-code"
          type="text"
          inputMode="numeric"
          maxLength="6"
          value={code}
          required
          onChange={(event) =>
            setCode(event.target.value.replace(/\D/g, ''))
          }
        />

        {message && <p className="error-message">{message}</p>}

        <button type="submit" disabled={!factorId}>
          Aktifkan 2FA
        </button>
      </form>
    </main>
  )
}