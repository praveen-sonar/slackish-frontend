import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth'

export default function Signup() {
  const { register } = useAuth()
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try { await register(email, displayName, password) } catch (err: any) { setError(err.message) }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>Create your account</h1>
        <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Display name" />
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
        {error && <div className="error">{error}</div>}
        <button type="submit">Sign up</button>
        <div className="auth-links"><Link to="/login">Back to sign in</Link></div>
      </form>
    </div>
  )
}
