import { FormEvent, useEffect, useState } from 'react'
import { api, ConversationDetail, User } from '../api/client'

export default function DmView({ conversationId, me }: { conversationId: number; me: User }) {
  const [detail, setDetail] = useState<ConversationDetail | null>(null)
  const [body, setBody] = useState('')
  const [error, setError] = useState('')

  const load = () => {
    setError('')
    api.conversation(conversationId).then(setDetail).catch(e => { setDetail(null); setError(e.message) })
  }
  useEffect(load, [conversationId])

  const send = async (e: FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return
    await api.sendDm(conversationId, body.trim())
    setBody('')
    load()
  }

  return (
    <div className="channel">
      <header className="channel-head"><h2>💬 Conversation #{conversationId}</h2></header>
      <div className="messages">
        {error && <div className="error">{error}</div>}
        {detail?.messages.map(m => (
          <div key={m.id} className="msg">
            <div className="msg-meta">user {m.senderId} · {new Date(m.createdAt).toLocaleString()}</div>
            <div className="msg-body">{m.body}</div>
          </div>
        ))}
      </div>
      <form className="composer" onSubmit={send}>
        <input value={body} onChange={e => setBody(e.target.value)} placeholder="Message…" />
        <button type="submit">Send</button>
      </form>
    </div>
  )
}
