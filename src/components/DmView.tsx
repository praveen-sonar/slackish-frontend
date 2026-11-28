import { useEffect, useState } from 'react'
import { api, Attachment, ConversationDetail, User } from '../api/client'
import AttachmentList, { fetchAttachments } from './AttachmentList'
import Composer from './Composer'

export default function DmView({ conversationId, me }: { readonly conversationId: number; readonly me: User }) {
  const [detail, setDetail] = useState<ConversationDetail | null>(null)
  const [attachments, setAttachments] = useState<Record<number, Attachment[]>>({})
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    let d: ConversationDetail
    try {
      d = await api.conversation(conversationId)
      setDetail(d)
    } catch (e: any) { setDetail(null); setError(e.message); return }
    try {
      setAttachments(await fetchAttachments(d.messages.map(m => m.id), api.dmAttachments))
    } catch (e: any) { setError(`Could not load attachments: ${e.message}`) }
  }
  const reload = () => { void load() }
  useEffect(reload, [conversationId])

  return (
    <div className="channel">
      <header className="channel-head"><h2>💬 Conversation #{conversationId}</h2></header>
      <div className="messages">
        {error && <div className="error">{error}</div>}
        {detail?.messages.map(m => (
          <div key={m.id} className="msg">
            <div className="msg-meta">user {m.senderId} · {new Date(m.createdAt).toLocaleString()}</div>
            {m.body && <div className="msg-body">{m.body}</div>}
            <AttachmentList attachments={attachments[m.id]} me={me} onChanged={reload} />
          </div>
        ))}
      </div>
      <Composer key={conversationId} placeholder="Message…" submitLabel="Send"
        post={b => api.sendDm(conversationId, b).then(m => m.id)}
        upload={api.uploadDmAttachment} onSent={reload} />
    </div>
  )
}
