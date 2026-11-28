import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { attachment, me } from '../test/fixtures'
import AttachmentList, { fetchAttachments, formatSize } from './AttachmentList'

describe('formatSize', () => {
  it('formats bytes, kilobytes and megabytes', () => {
    expect(formatSize(512)).toBe('512 B')
    expect(formatSize(2048)).toBe('2.0 KB')
    expect(formatSize(3 * 1024 * 1024)).toBe('3.0 MB')
  })
})

describe('fetchAttachments', () => {
  it('maps each message id to its attachments', async () => {
    const list = vi.fn((id: number) => Promise.resolve(id === 1 ? [attachment()] : []))
    await expect(fetchAttachments([1, 2], list)).resolves.toEqual({ 1: [attachment()], 2: [] })
  })
})

describe('AttachmentList', () => {
  it('renders nothing without attachments', () => {
    const { container } = render(<AttachmentList attachments={[]} me={me} onChanged={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a download link, size and an image thumbnail', () => {
    render(<AttachmentList me={me} onChanged={vi.fn()}
      attachments={[attachment(), attachment({ id: 101, filename: 'shot.png', contentType: 'image/png' })]} />)
    expect(screen.getByRole('link', { name: /notes\.txt/ })).toHaveAttribute('href', '/api/attachments/100')
    expect(screen.getAllByText('2.0 KB')).toHaveLength(2)
    expect(screen.getByRole('img', { name: 'shot.png' })).toHaveAttribute('src', '/api/attachments/101')
    expect(screen.queryByRole('img', { name: 'notes.txt' })).not.toBeInTheDocument()
  })

  it('only offers delete to the uploader', () => {
    render(<AttachmentList attachments={[attachment({ uploaderId: 2 })]} me={me} onChanged={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('deletes after confirmation and reports the change', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const del = vi.spyOn(api, 'deleteAttachment').mockResolvedValue(undefined)
    const onChanged = vi.fn()
    render(<AttachmentList attachments={[attachment()]} me={me} onChanged={onChanged} />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(del).toHaveBeenCalledWith(100)
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
  })

  it('does nothing when delete is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const del = vi.spyOn(api, 'deleteAttachment')
    render(<AttachmentList attachments={[attachment()]} me={me} onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(del).not.toHaveBeenCalled()
  })

  it('shows the error when delete fails', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(api, 'deleteAttachment').mockRejectedValue(new Error('Forbidden'))
    const onChanged = vi.fn()
    render(<AttachmentList attachments={[attachment()]} me={me} onChanged={onChanged} />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(await screen.findByText('Forbidden')).toBeInTheDocument()
    expect(onChanged).not.toHaveBeenCalled()
  })
})
