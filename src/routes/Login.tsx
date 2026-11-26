import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('alice@acme.io')
  const [password, setPassword] = useState('password123')
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try { await login(email, password) } catch (err: any) { setError(err.message) }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>Slackish</h1>
        <p className="muted">Sign in to your workspace</p>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
        {error && <div className="error">{error}</div>}
        <button type="submit">Sign in</button>
        <div className="auth-links">
          <Link to="/signup">Create account</Link>
          <Link to="/forgot">Forgot password?</Link>
        </div>
      </form>
    </div>
  )
}
