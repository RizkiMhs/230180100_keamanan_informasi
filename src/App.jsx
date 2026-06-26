import { useCallback, useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './components/Login'
import EnrollMFA from './components/EnrollMFA'
import VerifyMFA from './components/VerifyMFA'
import Dashboard from './components/Dashboard'
import './App.css'

export default function App() {
  const [session, setSession] = useState(null)
  const [screen, setScreen] = useState('loading')

  const determineScreen = useCallback(async () => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession()

    setSession(currentSession)

    if (!currentSession) {
      setScreen('login')
      return
    }

    const { data: aalData, error: aalError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

    if (aalError) {
      console.error(aalError)
      setScreen('login')
      return
    }

    if (
      aalData.currentLevel === 'aal2' &&
      aalData.nextLevel === 'aal2'
    ) {
      setScreen('dashboard')
      return
    }

    if (
      aalData.currentLevel === 'aal1' &&
      aalData.nextLevel === 'aal2'
    ) {
      setScreen('verify-mfa')
      return
    }

    setScreen('enroll-mfa')
  }, [])

  useEffect(() => {
    determineScreen()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      setTimeout(() => {
        determineScreen()
      }, 0)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [determineScreen])

  if (screen === 'loading') {
    return <p className="loading-page">Memuat aplikasi...</p>
  }

  if (!session || screen === 'login') {
    return <Login />
  }

  if (screen === 'enroll-mfa') {
    return <EnrollMFA onSuccess={determineScreen} />
  }

  if (screen === 'verify-mfa') {
    return <VerifyMFA onSuccess={determineScreen} />
  }

  return <Dashboard />
}