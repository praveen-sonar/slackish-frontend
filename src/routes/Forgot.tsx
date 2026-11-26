import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

export default function Forgot() {
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [msg, setMsg] = useState('')

  const request = async (e: FormEvent) => {
    e.preventDefault()
    const res = await api.forgot(email)
    setToken(res.resetToken)
    setMsg('Reset token issued below.')
  }
  const reset = async (e: FormEvent) => {
    e.preventDefault()
    await api.reset(token, newPassword)
    setMsg('Password updated. You can sign in now.')
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Reset password</h1>
        <form onSubmit={request}>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email" />
          <button type="submit">Send reset link</button>
        </form>
        <form onSubmit={reset}>
          <input value={token} onChange={e => setToken(e.target.value)} placeholder="Reset token" />
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password" />
          <button type="submit">Set new password</button>
        </form>
        {msg && <div className="muted">{msg}</div>}
        <div className="auth-links"><Link to="/login">Back to sign in</Link></div>
      </div>
    </div>
  )
}
