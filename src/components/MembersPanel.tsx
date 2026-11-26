import { useEffect, useState } from 'react'
import { api, Member, Workspace } from '../api/client'

export default function MembersPanel({ workspace }: { workspace: Workspace }) {
  const [members, setMembers] = useState<Member[]>([])
  const [error, setError] = useState('')

  const load = () => {
    api.members(workspace.id).then(setMembers).catch(e => { setMembers([]); setError(e.message) })
  }
  useEffect(load, [workspace.id])

  const setRole = async (userId: number, role: string) => {
    await api.updateMemberRole(workspace.id, userId, role)
    load()
  }

  return (
    <div className="panel">
      <h2>Members of {workspace.name}</h2>
      {error && <div className="error">{error}</div>}
      <table className="table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead>
        <tbody>
          {members.map(m => (
            <tr key={m.userId}>
              <td>{m.displayName}</td>
              <td>{m.email}</td>
              <td>{m.role}{!m.active && ' (inactive)'}</td>
              <td>
                <select value={m.role} onChange={e => setRole(m.userId, e.target.value)}>
                  <option>OWNER</option><option>ADMIN</option><option>MEMBER</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
