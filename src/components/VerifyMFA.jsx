import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function VerifyMFA({ onSuccess }) {
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleVerify(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    if (!/^\d{6}$/.test(code)) {
      setMessage('Masukkan kode 6 digit.')
      setLoading(false)
      return
    }

    const { data: factorData, error: factorError } =
      await supabase.auth.mfa.listFactors()

    if (factorError) {
      setMessage(factorError.message)
      setLoading(false)
      return
    }

    const factor = factorData.totp.find(
      (item) => item.status === 'verified'
    )

    if (!factor) {
      setMessage('Faktor TOTP tidak ditemukan.')
      setLoading(false)
      return
    }

    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({
        factorId: factor.id,
      })

    if (challengeError) {
      setMessage(challengeError.message)
      setLoading(false)
      return
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challengeData.id,
      code,
    })

    if (verifyError) {
      setMessage('Kode salah atau kedaluwarsa.')
      setLoading(false)
      return
    }

    setLoading(false)
    onSuccess()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleVerify}>
        <h1>Verifikasi 2FA</h1>

        <p>
          Masukkan kode dari aplikasi Google Authenticator.
        </p>

        <label htmlFor="mfa-code">Kode 6 Digit</label>
        <input
          id="mfa-code"
          type="text"
          inputMode="numeric"
          maxLength="6"
          value={code}
          required
          autoFocus
          onChange={(event) =>
            setCode(event.target.value.replace(/\D/g, ''))
          }
        />

        {message && <p className="error-message">{message}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Memverifikasi...' : 'Verifikasi'}
        </button>

        <button
          type="button"
          className="secondary-button"
          onClick={handleLogout}
        >
          Kembali ke Login
        </button>
      </form>
    </main>
  )
}