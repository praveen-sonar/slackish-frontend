import { Attachment, Message, User } from '../api/client'

export const me: User = { id: 1, email: 'alice@acme.io', displayName: 'Alice', mfaEnabled: false }

export const attachment = (over: Partial<Attachment> = {}): Attachment => ({
  id: 100, messageId: 10, dmMessageId: null, filename: 'notes.txt', contentType: 'text/plain',
  size: 2048, uploaderId: me.id, createdAt: '2026-11-28T00:00:00Z', ...over,
})

export const message = (over: Partial<Message> = {}): Message => ({
  id: 10, channelId: 1, userId: me.id, body: 'hello', parentId: null,
  createdAt: '2026-11-28T00:00:00Z', editedAt: null, ...over,
})
