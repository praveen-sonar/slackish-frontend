import { useState } from 'react'
import { api, Channel, Conversation, User, Workspace } from '../api/client'

interface Props {
  user: User
  workspaces: Workspace[]
  current: Workspace | null
  channels: Channel[]
  conversations: Conversation[]
  onSelectWorkspace: (w: Workspace) => void
  onSelectView: (v: any) => void
  onCreateWorkspace: () => void
  onInvite: () => void
  onLogout: () => void
  onChannelsChanged: () => void
}

export default function Sidebar(p: Props) {
  const [newChannel, setNewChannel] = useState('')
  const [priv, setPriv] = useState(false)

  const createChannel = async () => {
    if (!p.current || !newChannel.trim()) return
    await api.createChannel(p.current.id, newChannel.trim(), priv)
    setNewChannel('')
    setPriv(false)
    p.onChannelsChanged()
  }

  return (
    <aside className="sidebar">
      <div className="ws-switcher">
        <select
          value={p.current?.id ?? ''}
          onChange={e => {
            const w = p.workspaces.find(x => x.id === Number(e.target.value))
            if (w) p.onSelectWorkspace(w)
          }}
        >
          {p.workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <button className="ghost" onClick={p.onCreateWorkspace}>＋</button>
      </div>

      <div className="section">
        <div className="section-head">Channels</div>
        {p.channels.map(c => (
          <button key={c.id} className="nav-item" onClick={() => p.onSelectView({ kind: 'channel', id: c.id })}>
            {c.isPrivate ? '🔒' : '#'} {c.name}
          </button>
        ))}
        <div className="new-channel">
          <input value={newChannel} onChange={e => setNewChannel(e.target.value)} placeholder="New channel" />
          <label className="priv"><input type="checkbox" checked={priv} onChange={e => setPriv(e.target.checked)} /> private</label>
          <button onClick={createChannel}>Add</button>
        </div>
      </div>

      <div className="section">
        <div className="section-head">Direct messages</div>
        {p.conversations.map(c => (
          <button key={c.id} className="nav-item" onClick={() => p.onSelectView({ kind: 'dm', id: c.id })}>
            💬 Conversation #{c.id}
          </button>
        ))}
      </div>

      <div className="section">
        <button className="nav-item" onClick={() => p.onSelectView({ kind: 'members' })}>👥 Members</button>
        <button className="nav-item" onClick={() => p.onSelectView({ kind: 'admin' })}>🛠️ Admin console</button>
        <button className="nav-item" onClick={p.onInvite}>✉️ Invite people</button>
      </div>

      <div className="sidebar-footer">
        <div className="me">{p.user.displayName}</div>
        <button className="ghost" onClick={p.onLogout}>Sign out</button>
      </div>
    </aside>
  )
}
