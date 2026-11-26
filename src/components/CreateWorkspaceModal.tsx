import { useState } from 'react'
import { api, Workspace } from '../api/client'

export default function CreateWorkspaceModal(
  { onClose, onCreated }: { onClose: () => void; onCreated: (w: Workspace) => void }
) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [error, setError] = useState('')

  const create = async () => {
    setError('')
    try {
      const w = await api.createWorkspace(name.trim(), slug.trim() || name.trim().toLowerCase().replace(/\s+/g, '-'))
      onCreated(w)
    } catch (e: any) { setError(e.message) }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Create a workspace</h2>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Workspace name" />
        <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="slug (optional)" />
        {error && <div className="error">{error}</div>}
        <div className="modal-actions">
          <button onClick={create}>Create</button>
          <button className="ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
