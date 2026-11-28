import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './client'

const respond = (status: number, body = '') =>
  vi.fn((_path: string, _init?: RequestInit) => Promise.resolve(new Response(body || null, { status })))

describe('api client', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('sends JSON bodies with cookies and parses the response', async () => {
    const fetchMock = respond(200, JSON.stringify({ id: 5 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(api.postMessage(1, 'hi')).resolves.toEqual({ id: 5 })
    expect(fetchMock).toHaveBeenCalledWith('/api/channels/1/messages', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: 'hi', parentId: null }),
    })
  })

  it('resolves empty bodies to undefined', async () => {
    vi.stubGlobal('fetch', respond(200))
    await expect(api.deleteAttachment(3)).resolves.toBeUndefined()
  })

  it('throws the backend error message', async () => {
    vi.stubGlobal('fetch', respond(413, JSON.stringify({ error: 'Attachments are limited to 10 MB' })))
    await expect(api.messageAttachments(1)).rejects.toThrow('Attachments are limited to 10 MB')
  })

  it('falls back to the HTTP status when the error body is not JSON', async () => {
    vi.stubGlobal('fetch', respond(500, 'oops'))
    await expect(api.dmAttachments(1)).rejects.toThrow('HTTP 500')
  })

  it('uploads one file as multipart without a JSON content type', async () => {
    const fetchMock = respond(200, JSON.stringify({ id: 9 }))
    vi.stubGlobal('fetch', fetchMock)
    const file = new File(['data'], 'a.txt', { type: 'text/plain' })
    await expect(api.uploadMessageAttachment(7, file)).resolves.toEqual({ id: 9 })
    const [path, init] = fetchMock.mock.calls[0]
    expect(path).toBe('/api/messages/7/attachments')
    expect(init).toMatchObject({ method: 'POST', credentials: 'include' })
    expect(init?.headers).toBeUndefined()
    expect((init?.body as FormData).get('file')).toBe(file)
  })

  it('targets the DM attachment endpoints', async () => {
    const fetchMock = respond(200, '[]')
    vi.stubGlobal('fetch', fetchMock)
    await api.dmAttachments(4)
    await api.uploadDmAttachment(4, new File(['x'], 'b.txt'))
    expect(fetchMock.mock.calls.map(c => c[0])).toEqual(['/api/dms/messages/4/attachments', '/api/dms/messages/4/attachments'])
    expect(api.attachmentUrl(12)).toBe('/api/attachments/12')
  })
})
