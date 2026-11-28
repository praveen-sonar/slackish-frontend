import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, Channel, Workspace } from '../api/client'
import { attachment, me, message } from '../test/fixtures'
import ChannelView from './ChannelView'

const workspace: Workspace = { id: 1, name: 'Acme', slug: 'acme', ownerId: me.id }
const channels: Channel[] = [{ id: 1, workspaceId: 1, name: 'general', isPrivate: false, createdBy: me.id }]

const top = message()
const reply = message({ id: 11, body: 'a reply', parentId: 10 })

const renderView = () => render(<ChannelView workspace={workspace} channelId={1} channels={channels} me={me} />)

describe('ChannelView', () => {
  beforeEach(() => {
    vi.spyOn(api, 'channelMessages').mockResolvedValue([top, reply])
    vi.spyOn(api, 'messageAttachments').mockImplementation(id =>
      Promise.resolve(id === 10 ? [attachment()] : [attachment({ id: 101, messageId: 11, filename: 'reply.log' })]))
  })

  it('shows top-level messages with their attachments', async () => {
    renderView()
    expect(await screen.findByRole('link', { name: /notes\.txt/ })).toBeInTheDocument()
    expect(screen.getByText('hello')).toBeInTheDocument()
    expect(screen.queryByText('a reply')).not.toBeInTheDocument()
    expect(api.messageAttachments).toHaveBeenCalledWith(10)
  })

  it('keeps messages visible when attachments fail to load', async () => {
    vi.mocked(api.messageAttachments).mockRejectedValue(new Error('boom'))
    renderView()
    expect(await screen.findByText('Could not load attachments: boom')).toBeInTheDocument()
    expect(screen.getByText('hello')).toBeInTheDocument()
  })

  it('shows the error when messages fail to load', async () => {
    vi.mocked(api.channelMessages).mockRejectedValue(new Error('Not a member'))
    renderView()
    expect(await screen.findByText('Not a member')).toBeInTheDocument()
    expect(api.messageAttachments).not.toHaveBeenCalled()
  })

  it('posts a message with a file and reloads', async () => {
    const post = vi.spyOn(api, 'postMessage').mockResolvedValue(message({ id: 12 }))
    const upload = vi.spyOn(api, 'uploadMessageAttachment').mockResolvedValue(attachment({ id: 102 }))
    const { container } = renderView()
    await screen.findByText('hello')
    const f = new File(['x'], 'pic.png')
    await userEvent.upload(container.querySelector('input[type=file]') as HTMLInputElement, f)
    await userEvent.type(screen.getByPlaceholderText('Message general'), 'see attached')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    await waitFor(() => expect(upload).toHaveBeenCalledWith(12, f))
    expect(post).toHaveBeenCalledWith(1, 'see attached')
    await waitFor(() => expect(api.channelMessages).toHaveBeenCalledTimes(2))
  })

  it('opens a thread with reply attachments and replies into it', async () => {
    vi.spyOn(api, 'thread').mockResolvedValue([reply])
    const post = vi.spyOn(api, 'postMessage').mockResolvedValue(message({ id: 13, parentId: 10 }))
    renderView()
    await userEvent.click(await screen.findByRole('button', { name: 'Reply in thread' }))
    const panel = (await screen.findByText('Thread')).closest('.thread-panel') as HTMLElement
    expect(within(panel).getByText('a reply')).toBeInTheDocument()
    expect(within(panel).getByRole('link', { name: /reply\.log/ })).toBeInTheDocument()

    await userEvent.type(within(panel).getByPlaceholderText('Reply…'), 'thanks')
    await userEvent.click(within(panel).getByRole('button', { name: 'Reply' }))
    expect(post).toHaveBeenCalledWith(1, 'thanks', 10)
    await waitFor(() => expect(api.thread).toHaveBeenCalledTimes(2))

    await userEvent.click(within(panel).getByRole('button', { name: '✕' }))
    expect(screen.queryByText('Thread')).not.toBeInTheDocument()
  })

  it('refreshes the thread and channel after deleting an attachment in the thread', async () => {
    vi.spyOn(api, 'thread').mockResolvedValue([reply])
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(api, 'deleteAttachment').mockResolvedValue(undefined)
    renderView()
    await userEvent.click(await screen.findByRole('button', { name: 'Reply in thread' }))
    const panel = (await screen.findByText('Thread')).closest('.thread-panel') as HTMLElement
    const [parentDelete, replyDelete] = within(panel).getAllByRole('button', { name: 'Delete' })
    await userEvent.click(parentDelete)
    await waitFor(() => expect(api.channelMessages).toHaveBeenCalledTimes(2))
    await userEvent.click(replyDelete)
    await waitFor(() => expect(api.thread).toHaveBeenCalledTimes(3))
  })

  it('shows the error when a thread fails to open', async () => {
    vi.spyOn(api, 'thread').mockRejectedValue(new Error('Message not found'))
    renderView()
    await userEvent.click(await screen.findByRole('button', { name: 'Reply in thread' }))
    expect(await screen.findByText('Message not found')).toBeInTheDocument()
  })

  it('looks up a message by id', async () => {
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {})
    vi.spyOn(api, 'message').mockResolvedValueOnce(top).mockRejectedValueOnce(new Error('Message not found'))
    renderView()
    const input = screen.getByPlaceholderText('Open message by id…')
    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    expect(api.message).not.toHaveBeenCalled()
    await userEvent.type(input, '10')
    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    await waitFor(() => expect(alert).toHaveBeenCalledWith(expect.stringContaining('hello')))
    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    await waitFor(() => expect(alert).toHaveBeenCalledWith('Message not found'))
  })
})
