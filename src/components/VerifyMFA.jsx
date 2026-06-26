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
    setLoading(true)
    await supabase.auth.signOut()
    setLoading(false)
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleVerify}>
        <div className="auth-header">
          <h1>Verifikasi 2FA</h1>
          <p>Masukkan kode dari aplikasi Google Authenticator.</p>
        </div>

        <div className="auth-form-group">
          <label htmlFor="mfa-code">Kode 6 Digit</label>
          <input
            id="mfa-code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            required
            autoFocus
            placeholder="Masukkan kode 6 digit"
            onChange={(event) =>
              setCode(event.target.value.replace(/\D/g, ''))
            }
          />
        </div>

        {message && <p className="error-message">{message}</p>}

        <div className="auth-actions">
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'Memverifikasi...' : 'Verifikasi'}
          </button>

          <button
            type="button"
            className="auth-secondary"
            onClick={handleLogout}
            disabled={loading}
          >
            Kembali ke Login
          </button>
        </div>
      </form>
    </main>
  )
}