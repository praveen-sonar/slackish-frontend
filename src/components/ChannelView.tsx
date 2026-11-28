import { useEffect, useState } from 'react'
import { api, Attachment, Channel, Message, User, Workspace } from '../api/client'
import AttachmentList, { fetchAttachments } from './AttachmentList'
import Composer from './Composer'

interface Props { readonly workspace: Workspace; readonly channelId: number; readonly channels: Channel[]; readonly me: User }
interface Thread { parent: Message; replies: Message[]; attachments: Record<number, Attachment[]> }

export default function ChannelView({ channelId, channels, me }: Props) {
  const channel = channels.find(c => c.id === channelId)
  const [messages, setMessages] = useState<Message[]>([])
  const [attachments, setAttachments] = useState<Record<number, Attachment[]>>({})
  const [error, setError] = useState('')
  const [thread, setThread] = useState<Thread | null>(null)
  const [lookupId, setLookupId] = useState('')

  const load = async () => {
    setError('')
    let top: Message[]
    try {
      top = (await api.channelMessages(channelId)).filter(x => x.parentId === null)
      setMessages(top)
    } catch (e: any) { setMessages([]); setError(e.message); return }
    try {
      setAttachments(await fetchAttachments(top.map(m => m.id), api.messageAttachments))
    } catch (e: any) { setError(`Could not load attachments: ${e.message}`) }
  }
  const reload = () => { void load() }
  useEffect(reload, [channelId])

  const openThread = async (m: Message) => {
    try {
      const replies = await api.thread(m.id)
      const atts = await fetchAttachments([m.id, ...replies.map(r => r.id)], api.messageAttachments)
      setThread({ parent: m, replies, attachments: atts })
    } catch (e: any) { setError(e.message) }
  }
  const reopenThread = () => { if (thread) void openThread(thread.parent) }

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
            {m.body && <div className="msg-body">{m.body}</div>}
            <AttachmentList attachments={attachments[m.id]} me={me} onChanged={reload} />
            <button className="link" onClick={() => { void openThread(m) }}>Reply in thread</button>
          </div>
        ))}
      </div>
      <Composer key={channelId} placeholder={`Message ${channel?.name ?? ''}`} submitLabel="Send"
        post={b => api.postMessage(channelId, b).then(m => m.id)}
        upload={api.uploadMessageAttachment} onSent={reload} />

      {thread && (
        <div className="thread-panel">
          <div className="thread-head">
            <strong>Thread</strong>
            <button className="ghost" onClick={() => setThread(null)}>✕</button>
          </div>
          <div className="msg">
            {thread.parent.body && <div className="msg-body">{thread.parent.body}</div>}
            <AttachmentList attachments={thread.attachments[thread.parent.id]} me={me}
              onChanged={() => { reopenThread(); reload() }} />
          </div>
          <div className="thread-replies">
            {thread.replies.map(r => (
              <div key={r.id} className="msg">
                {r.body && <div className="msg-body">{r.body}</div>}
                <AttachmentList attachments={thread.attachments[r.id]} me={me} onChanged={reopenThread} />
              </div>
            ))}
          </div>
          <Composer key={thread.parent.id} placeholder="Reply…" submitLabel="Reply"
            post={b => api.postMessage(channelId, b, thread.parent.id).then(m => m.id)}
            upload={api.uploadMessageAttachment} onSent={reopenThread} />
        </div>
      )}
    </div>
  )
}
