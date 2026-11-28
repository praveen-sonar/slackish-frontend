import { useState } from 'react'
import { api, Attachment, User } from '../api/client'

interface Props {
  readonly attachments: Attachment[] | undefined
  readonly me: User
  readonly onChanged: () => void
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// The backend does not embed attachments in messages, so they are listed per message id.
export async function fetchAttachments(ids: number[], list: (id: number) => Promise<Attachment[]>) {
  const lists = await Promise.all(ids.map(id => list(id)))
  const byId: Record<number, Attachment[]> = {}
  ids.forEach((id, i) => { byId[id] = lists[i] })
  return byId
}

export default function AttachmentList({ attachments, me, onChanged }: Props) {
  const [error, setError] = useState('')
  if (!attachments?.length) return null

  const remove = async (a: Attachment) => {
    if (!confirm(`Delete ${a.filename}?`)) return
    setError('')
    try {
      await api.deleteAttachment(a.id)
      onChanged()
    } catch (e: any) { setError(e.message) }
  }

  return (
    <div className="attachments">
      {error && <div className="error">{error}</div>}
      {attachments.map(a => (
        <div key={a.id} className="attachment">
          {a.contentType.startsWith('image/') && (
            <a href={api.attachmentUrl(a.id)} download={a.filename}>
              <img className="attachment-thumb" src={api.attachmentUrl(a.id)} alt={a.filename} />
            </a>
          )}
          <div className="attachment-info">
            <a href={api.attachmentUrl(a.id)} download={a.filename}>📎 {a.filename}</a>
            <span className="muted">{formatSize(a.size)}</span>
            {a.uploaderId === me.id && (
              <button className="link" onClick={() => { void remove(a) }}>Delete</button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
