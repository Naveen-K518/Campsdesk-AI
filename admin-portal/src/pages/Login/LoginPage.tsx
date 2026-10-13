import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Building2,
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Sun,
  Moon,
  Info,
} from 'lucide-react'

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, loginWithGoogle, isAuthenticated } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Google OAuth Client ID validation
  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim()
  const isGoogleConfigured = Boolean(
    googleClientId && googleClientId.endsWith('.apps.googleusercontent.com')
  )

  // Startup check & dev logging
  React.useEffect(() => {
    if (!isGoogleConfigured) {
      console.warn(
        '[Google Auth] Google sign-in is not configured. Missing or invalid variable: VITE_GOOGLE_CLIENT_ID. Expected value ending with ".apps.googleusercontent.com".'
      )
    }

    if (import.meta.env.DEV) {
      console.log('[Google Auth Dev Debug] Admin Portal (Vite):')
      console.log('  configured:', isGoogleConfigured ? 'YES' : 'NO')
      console.log('  client_id:', googleClientId || '(VITE_GOOGLE_CLIENT_ID is not configured)')
      console.log('  redirect_uri (origin):', window.location.origin)
    }
  }, [isGoogleConfigured, googleClientId])

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleGoogleSuccess = async (idToken: string) => {
    setLoading(true)
    setErrorMessage(null)
    try {
      await loginWithGoogle(idToken)
      const from = (location.state as any)?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    } catch (err: any) {
      setErrorMessage(err.message || 'Google authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  const simulateGoogleSignIn = (targetEmail: string, name: string, role: string) => {
    const payload = {
      email: targetEmail,
      name,
      sub: `mock_google_sub_${targetEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
      email_verified: true,
      aud: googleClientId || 'mock_dev_aud',
      client_role: role,
    }
    const token = 'mock_google_token:' + btoa(JSON.stringify(payload))
    handleGoogleSuccess(token)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both administrative email and password.')
      return
    }

    setLoading(true)
    try {
      await login(email.trim(), password.trim())
      const from = (location.state as any)?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  // Quick fill helper
  const setDemoCredentials = (e: string, p: string) => {
    setEmail(e)
    setPassword(p)
    setErrorMessage(null)
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

      {/* Theme Toggle Top Right */}
      <div className="absolute top-5 right-5 z-10">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          className="rounded-full bg-card/80 backdrop-blur-xs"
        >
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-amber-400" />}
        </Button>
      </div>

      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Header Institution Emblem */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md ring-8 ring-primary/10">
            <Building2 className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
            CampusDesk AI
          </h1>
          <p className="mt-1 text-xs font-medium uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> System Administration Console
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-border shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-semibold">Sign in to console</CardTitle>
            <CardDescription>
              Enter authorized administrator credentials to manage mentors, students, and dockets.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {errorMessage && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive flex items-start gap-2.5 animate-in fade-in-50">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{errorMessage}</span>
              </div>
            )}

            {/* Google Sign-In Configuration Check Banner */}
            {!isGoogleConfigured && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2.5 animate-in fade-in-50">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div className="space-y-0.5">
                  <span className="font-semibold block">Google sign-in is not configured</span>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    Missing or invalid <code>VITE_GOOGLE_CLIENT_ID</code> in <code>admin-portal/.env</code> (must end with <code>.apps.googleusercontent.com</code>).
                  </p>
                </div>
              </div>
            )}

            {/* Official Google Sign-In Button */}
            <div className="space-y-2">
              <div className="flex justify-center w-full">
                {isGoogleConfigured ? (
                  <GoogleLogin
                    text="continue_with"
                    shape="rectangular"
                    theme={theme === 'dark' ? 'filled_black' : 'outline'}
                    size="large"
                    width="380"
                    auto_select={false}
                    onSuccess={(credentialResponse) => {
                      if (credentialResponse.credential) {
                        handleGoogleSuccess(credentialResponse.credential)
                      } else {
                        setErrorMessage('No credential token received from Google.')
                      }
                    }}
                    onError={() => {
                      setErrorMessage('Google sign-in was cancelled or encountered an error.')
                    }}
                  />
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    disabled
                    className="w-full max-w-[380px] h-10 justify-center gap-2 border-dashed border-border opacity-60 cursor-not-allowed text-xs text-muted-foreground"
                  >
                    <svg className="h-4 w-4 opacity-50" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Google sign-in is not configured</span>
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-center text-muted-foreground">
                {isGoogleConfigured
                  ? 'Institutional Google accounts only. System validates admin role directly from database.'
                  : 'Set VITE_GOOGLE_CLIENT_ID to connect to your live Google Cloud Console.'}
              </p>
            </div>

            {/* Divider */}
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground font-semibold">
                  Or sign in with password
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Official Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="admin@campus.edu"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="••••••••••••"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full gap-2 font-semibold" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifying Authority...</span>
                  </>
                ) : (
                  <span>Sign In with Password</span>
                )}
              </Button>
            </form>

            {/* Quick Testing Actions (Google SSO & Password) */}
            <div className="mt-5 border-t border-border pt-3.5 space-y-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  <span className="font-semibold text-foreground">Google SSO Simulation (Dev):</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-[11px] h-7 border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-medium"
                    onClick={() => simulateGoogleSignIn('admin@campus.edu', 'System Admin', 'admin')}
                    disabled={loading}
                  >
                    🛡️ Google Admin
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-[11px] h-7 border-destructive/30 text-destructive hover:bg-destructive/10"
                    onClick={() => simulateGoogleSignIn('mentor.radhakrishnan@campus.edu', 'Dr. Radhakrishnan', 'mentor')}
                    disabled={loading}
                  >
                    🚫 Google Mentor
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-[11px] h-7 border-destructive/30 text-destructive hover:bg-destructive/10"
                    onClick={() => simulateGoogleSignIn('kishorkumarp.cs24@bitsathy.ac.in', 'Kishor Kumar', 'student')}
                    disabled={loading}
                  >
                    🚫 Google Student
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-[11px] h-7 border-muted-foreground/30 text-muted-foreground hover:bg-muted/30"
                    onClick={() => simulateGoogleSignIn('stranger@gmail.com', 'Stranger', 'student')}
                    disabled={loading}
                  >
                    ❓ Unregistered
                  </Button>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">Password Autofill:</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-[10px] h-6 border border-border"
                    onClick={() => setDemoCredentials('admin@campus.edu', 'admin123')}
                  >
                    Admin
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-[10px] h-6 border border-border text-muted-foreground"
                    onClick={() => setDemoCredentials('faculty@campus.edu', 'faculty123')}
                  >
                    Mentor
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-[10px] h-6 border border-border text-muted-foreground"
                    onClick={() => setDemoCredentials('kishorkumarp.cs24@bitsathy.ac.in', 'password123')}
                  >
                    Student
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Notice */}
        <p className="text-center text-xs text-muted-foreground">
          CampusDesk Autonomous Platform • Role Engine 3.0
        </p>
      </div>
    </div>
  )
}
