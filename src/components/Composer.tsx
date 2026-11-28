import { FormEvent, useRef, useState } from 'react'
import { formatSize } from './AttachmentList'

const MAX_SIZE = 10 * 1024 * 1024

interface Props {
  readonly placeholder: string
  readonly submitLabel: string
  /** Creates the message and resolves to its id; files are then uploaded to it. */
  readonly post: (body: string) => Promise<number>
  readonly upload: (messageId: number, file: File) => Promise<unknown>
  readonly onSent: () => void
}

const fileKey = (f: File) => `${f.name}:${f.size}:${f.lastModified}`

export default function Composer({ placeholder, submitLabel, post, upload, onSent }: Props) {
  const [body, setBody] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const picker = useRef<HTMLInputElement>(null)

  const pick = (list: FileList | null) => {
    const picked = Array.from(list ?? [])
    const tooBig = picked.filter(f => f.size > MAX_SIZE)
    setError(tooBig.length ? `Files are limited to 10 MB: ${tooBig.map(f => f.name).join(', ')}` : '')
    setFiles(fs => {
      const have = new Set(fs.map(fileKey))
      return [...fs, ...picked.filter(f => f.size <= MAX_SIZE && !have.has(fileKey(f)))]
    })
    if (picker.current) picker.current.value = ''
  }

  const send = async (e: FormEvent) => {
    e.preventDefault()
    if (busy || (!body.trim() && !files.length)) return
    setBusy(true)
    setError('')
    try {
      const id = await post(body.trim())
      setBody('')
      const results = await Promise.allSettled(files.map(f => upload(id, f)))
      const failed: File[] = []
      const reasons: string[] = []
      results.forEach((r, i) => {
        if (r.status === 'rejected') { failed.push(files[i]); reasons.push(`${files[i].name}: ${r.reason?.message ?? r.reason}`) }
      })
      setFiles(failed)
      if (reasons.length) setError(`Message sent, but some files failed to upload (${reasons.join('; ')})`)
      onSent()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="composer" onSubmit={e => { void send(e) }}>
      {error && <div className="error">{error}</div>}
      {files.length > 0 && (
        <div className="composer-files">
          {files.map(f => (
            <span key={fileKey(f)} className="chip">
              {f.name} <span className="muted">{formatSize(f.size)}</span>
              <button type="button" className="chip-x" aria-label={`Remove ${f.name}`}
                onClick={() => setFiles(fs => fs.filter(x => x !== f))}>✕</button>
            </span>
          ))}
        </div>
      )}
      <div className="composer-row">
        <input type="file" multiple hidden ref={picker} onChange={e => pick(e.target.files)} />
        <button type="button" className="attach" aria-label="Attach files" title="Attach files"
          disabled={busy} onClick={() => picker.current?.click()}>📎</button>
        <input value={body} onChange={e => setBody(e.target.value)} placeholder={placeholder} disabled={busy} />
        <button type="submit" disabled={busy}>{busy ? 'Sending…' : submitLabel}</button>
      </div>
    </form>
  )
}
