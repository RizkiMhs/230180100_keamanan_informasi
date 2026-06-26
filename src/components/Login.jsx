import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleLogin(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage('Login gagal: ' + error.message)
    }

    setLoading(false)
  }

  async function handleRegister(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    if (password.length < 6) {
      setMessage('Password minimal 6 karakter.')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setMessage('Konfirmasi password tidak sama.')
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setMessage('Register gagal: ' + error.message)
      setLoading(false)
      return
    }

    if (data.session) {
      setMessage('Register berhasil. Mengarahkan ke aktivasi MFA...')
    } else {
      setMessage(
        'Register berhasil, tetapi session belum dibuat. Pastikan Confirm Email sudah OFF di Supabase.'
      )
    }

    setLoading(false)
  }

  function switchMode(nextMode) {
    setMode(nextMode)
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setMessage('')
  }

  return (
    <main className="auth-page">
      <form
        className="auth-card"
        onSubmit={mode === 'login' ? handleLogin : handleRegister}
      >
        <div className="auth-header">
          <h1>Portal Dokumen Tugas</h1>
          <p>
            {mode === 'login'
              ? 'Masuk menggunakan akun yang telah terdaftar.'
              : 'Daftar akun baru untuk mengakses portal.'}
          </p>
        </div>

        <div className="auth-switch">
          <button
            type="button"
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Login
          </button>

          <button
            type="button"
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => switchMode('register')}
          >
            Register
          </button>
        </div>

        <div className="auth-form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            required
            autoComplete="email"
            placeholder="Masukkan email"
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="auth-form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder="Masukkan password"
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {mode === 'register' && (
          <div className="auth-form-group">
            <label htmlFor="confirmPassword">Konfirmasi Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              required
              autoComplete="new-password"
              placeholder="Ulangi password"
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>
        )}

        {message && (
          <p
            className={
              message.includes('berhasil') ? 'success-message' : 'error-message'
            }
          >
            {message}
          </p>
        )}

        <button className="auth-submit" type="submit" disabled={loading}>
          {loading
            ? 'Memproses...'
            : mode === 'login'
              ? 'Login'
              : 'Daftar Akun'}
        </button>
      </form>
    </main>
  )
}