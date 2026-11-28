import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ConversationDetail, DmMessage } from '../api/client'
import { attachment, me } from '../test/fixtures'
import DmView from './DmView'

const dm = (over: Partial<DmMessage> = {}): DmMessage => ({
  id: 20, conversationId: 5, senderId: me.id, body: 'hey adam', createdAt: '2026-11-28T00:00:00Z', ...over,
})
const detail: ConversationDetail = {
  conversation: { id: 5, workspaceId: 1, userAId: me.id, userBId: 2 },
  messages: [dm(), dm({ id: 21, body: '' })],
}

describe('DmView', () => {
  beforeEach(() => {
    vi.spyOn(api, 'conversation').mockResolvedValue(detail)
    vi.spyOn(api, 'dmAttachments').mockImplementation(id =>
      Promise.resolve(id === 21 ? [attachment({ id: 200, messageId: null, dmMessageId: 21, filename: 'log.txt' })] : []))
  })

  it('shows messages with their attachments', async () => {
    render(<DmView conversationId={5} me={me} />)
    expect(await screen.findByRole('link', { name: /log\.txt/ })).toBeInTheDocument()
    expect(screen.getByText('hey adam')).toBeInTheDocument()
    expect(api.dmAttachments).toHaveBeenCalledWith(20)
    expect(api.dmAttachments).toHaveBeenCalledWith(21)
  })

  it('keeps messages visible when attachments fail to load', async () => {
    vi.mocked(api.dmAttachments).mockRejectedValue(new Error('boom'))
    render(<DmView conversationId={5} me={me} />)
    expect(await screen.findByText('Could not load attachments: boom')).toBeInTheDocument()
    expect(screen.getByText('hey adam')).toBeInTheDocument()
  })

  it('shows the error when the conversation fails to load', async () => {
    vi.mocked(api.conversation).mockRejectedValue(new Error('Conversation not found'))
    render(<DmView conversationId={5} me={me} />)
    expect(await screen.findByText('Conversation not found')).toBeInTheDocument()
    expect(api.dmAttachments).not.toHaveBeenCalled()
  })

  it('sends a DM with a file and reloads', async () => {
    const send = vi.spyOn(api, 'sendDm').mockResolvedValue(dm({ id: 22 }))
    const upload = vi.spyOn(api, 'uploadDmAttachment').mockResolvedValue(attachment({ id: 201 }))
    const { container } = render(<DmView conversationId={5} me={me} />)
    await screen.findByText('hey adam')
    const f = new File(['x'], 'report.pdf')
    await userEvent.upload(container.querySelector('input[type=file]') as HTMLInputElement, f)
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    await waitFor(() => expect(upload).toHaveBeenCalledWith(22, f))
    expect(send).toHaveBeenCalledWith(5, '')
    await waitFor(() => expect(api.conversation).toHaveBeenCalledTimes(2))
  })

  it('reloads after deleting an attachment', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(api, 'deleteAttachment').mockResolvedValue(undefined)
    render(<DmView conversationId={5} me={me} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    expect(api.deleteAttachment).toHaveBeenCalledWith(200)
    await waitFor(() => expect(api.conversation).toHaveBeenCalledTimes(2))
  })
})
