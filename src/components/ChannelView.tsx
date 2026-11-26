import { FormEvent, useEffect, useState } from 'react'
import { api, Channel, Message, User, Workspace } from '../api/client'

interface Props { workspace: Workspace; channelId: number; channels: Channel[]; me: User }

export default function ChannelView({ channelId, channels, me }: Props) {
  const channel = channels.find(c => c.id === channelId)
  const [messages, setMessages] = useState<Message[]>([])
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [thread, setThread] = useState<{ parent: Message; replies: Message[] } | null>(null)
  const [lookupId, setLookupId] = useState('')

  const load = () => {
    setError('')
    api.channelMessages(channelId)
      .then(m => setMessages(m.filter(x => x.parentId === null)))
      .catch(e => { setMessages([]); setError(e.message) })
  }
  useEffect(load, [channelId])

  const send = async (e: FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return
    await api.postMessage(channelId, body.trim())
    setBody('')
    load()
  }

  const openThread = async (m: Message) => {
    const replies = await api.thread(m.id)
    setThread({ parent: m, replies })
  }

  const lookup = async () => {
    const id = Number(lookupId)
    if (!id) return
    try {
      const m = await api.message(id)
      alert(`Message #${m.id} (channel ${m.channelId}, user ${m.userId}):\n\n${m.body}`)
    } catch (e: any) { alert(e.message) }
  }

  return (
    <div className="channel">
      <header className="channel-head">
        <h2>{channel?.isPrivate ? '🔒' : '#'} {channel?.name ?? `channel ${channelId}`}</h2>
        <div className="lookup">
          <input value={lookupId} onChange={e => setLookupId(e.target.value)} placeholder="Open message by id…" />
          <button onClick={lookup}>Open</button>
        </div>
      </header>
      <div className="messages">
        {error && <div className="error">{error}</div>}
        {messages.map(m => (
          <div key={m.id} className="msg">
            <div className="msg-meta">user {m.userId} · {new Date(m.createdAt).toLocaleString()} · #{m.id}</div>
            <div className="msg-body">{m.body}</div>
            <button className="link" onClick={() => openThread(m)}>Reply in thread</button>
          </div>
        ))}
      </div>
      <form className="composer" onSubmit={send}>
        <input value={body} onChange={e => setBody(e.target.value)} placeholder={`Message ${channel?.name ?? ''}`} />
        <button type="submit">Send</button>
      </form>

      {thread && (
        <div className="thread-panel">
          <div className="thread-head">
            <strong>Thread</strong>
            <button className="ghost" onClick={() => setThread(null)}>✕</button>
          </div>
          <div className="msg"><div className="msg-body">{thread.parent.body}</div></div>
          <div className="thread-replies">
            {thread.replies.map(r => (
              <div key={r.id} className="msg"><div className="msg-body">{r.body}</div></div>
            ))}
          </div>
          <ThreadComposer parentId={thread.parent.id} channelId={channelId} onSent={() => openThread(thread.parent)} />
        </div>
      )}
    </div>
  )
}

function ThreadComposer({ parentId, channelId, onSent }: { parentId: number; channelId: number; onSent: () => void }) {
  const [body, setBody] = useState('')
  const send = async (e: FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return
    await api.postMessage(channelId, body.trim(), parentId)
    setBody('')
    onSent()
  }
  return (
    <form className="composer" onSubmit={send}>
      <input value={body} onChange={e => setBody(e.target.value)} placeholder="Reply…" />
      <button type="submit">Reply</button>
    </form>
  )
}
