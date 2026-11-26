import { useEffect, useState } from 'react'
import { api, Invitation, Workspace } from '../api/client'

export default function InviteModal({ workspace, onClose }: { workspace: Workspace; onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('MEMBER')
  const [invites, setInvites] = useState<Invitation[]>([])

  const load = () => api.invitations(workspace.id).then(setInvites).catch(() => setInvites([]))
  useEffect(() => { load() }, [workspace.id])

  const send = async () => {
    if (!email.trim()) return
    await api.invite(workspace.id, email.trim(), role)
    setEmail('')
    load()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Invite to {workspace.name}</h2>
        <div className="invite-form">
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="person@example.com" />
          <select value={role} onChange={e => setRole(e.target.value)}>
            <option>MEMBER</option><option>ADMIN</option><option>OWNER</option>
          </select>
          <button onClick={send}>Invite</button>
        </div>
        <h3>Pending invitations</h3>
        <table className="table">
          <thead><tr><th>Email</th><th>Role</th><th>Token</th><th>Status</th></tr></thead>
          <tbody>
            {invites.map(i => (
              <tr key={i.id}><td>{i.email}</td><td>{i.role}</td><td className="mono">{i.token}</td><td>{i.status}</td></tr>
            ))}
          </tbody>
        </table>
        <button className="ghost" onClick={onClose}>Close</button>
      </div>
    </div>
  )
}
