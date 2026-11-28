import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Composer from './Composer'

const setup = (over: Partial<Parameters<typeof Composer>[0]> = {}) => {
  const props = {
    placeholder: 'Message general', submitLabel: 'Send',
    post: vi.fn().mockResolvedValue(42), upload: vi.fn().mockResolvedValue({}), onSent: vi.fn(), ...over,
  }
  const { container } = render(<Composer {...props} />)
  const fileInput = container.querySelector('input[type=file]') as HTMLInputElement
  const pick = (...files: File[]) => fireEvent.change(fileInput, { target: { files } })
  return { props, pick }
}

const file = (name: string, size?: number) => {
  const f = new File(['x'], name)
  if (size) Object.defineProperty(f, 'size', { value: size })
  return f
}

describe('Composer', () => {
  it('ignores an empty submit', async () => {
    const { props } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(props.post).not.toHaveBeenCalled()
  })

  it('posts trimmed text, clears the input and reports the send', async () => {
    const { props } = setup()
    await userEvent.type(screen.getByPlaceholderText('Message general'), '  hi there  ')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(props.post).toHaveBeenCalledWith('hi there')
    await waitFor(() => expect(props.onSent).toHaveBeenCalled())
    expect(screen.getByPlaceholderText('Message general')).toHaveValue('')
    expect(props.upload).not.toHaveBeenCalled()
  })

  it('sends file-only messages and uploads every file to the new message', async () => {
    const { props, pick } = setup()
    const a = file('a.txt')
    const b = file('b.txt')
    pick(a, b)
    expect(screen.getByText('a.txt')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    await waitFor(() => expect(props.onSent).toHaveBeenCalled())
    expect(props.post).toHaveBeenCalledWith('')
    expect(props.upload).toHaveBeenCalledWith(42, a)
    expect(props.upload).toHaveBeenCalledWith(42, b)
    expect(screen.queryByText('a.txt')).not.toBeInTheDocument()
  })

  it('rejects files over 10 MB and skips duplicates', () => {
    const { pick } = setup()
    const a = file('a.txt')
    pick(a, file('huge.bin', 11 * 1024 * 1024))
    expect(screen.getByText('Files are limited to 10 MB: huge.bin')).toBeInTheDocument()
    pick(a)
    expect(screen.getAllByText('a.txt')).toHaveLength(1)
  })

  it('removes a picked file', async () => {
    const { pick } = setup()
    pick(file('a.txt'))
    await userEvent.click(screen.getByRole('button', { name: 'Remove a.txt' }))
    expect(screen.queryByText('a.txt')).not.toBeInTheDocument()
  })

  it('opens the file picker from the attach button', async () => {
    setup()
    const click = vi.spyOn(HTMLInputElement.prototype, 'click')
    await userEvent.click(screen.getByRole('button', { name: 'Attach files' }))
    expect(click).toHaveBeenCalled()
  })

  it('keeps files that failed to upload and explains why', async () => {
    const upload = vi.fn((_id: number, f: File) => f.name === 'bad.txt' ? Promise.reject(new Error('Too large')) : Promise.resolve({}))
    const { props, pick } = setup({ upload })
    pick(file('ok.txt'), file('bad.txt'))
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByText('Message sent, but some files failed to upload (bad.txt: Too large)')).toBeInTheDocument()
    expect(screen.getByText('bad.txt')).toBeInTheDocument()
    expect(screen.queryByText('ok.txt')).not.toBeInTheDocument()
    expect(props.onSent).toHaveBeenCalled()
  })

  it('shows the error and keeps the draft when posting fails', async () => {
    const { props } = setup({ post: vi.fn().mockRejectedValue(new Error('Not a member')) })
    await userEvent.type(screen.getByPlaceholderText('Message general'), 'draft')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(await screen.findByText('Not a member')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Message general')).toHaveValue('draft')
    expect(props.onSent).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled()
  })
})
