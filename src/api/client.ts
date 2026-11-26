export interface User { id: number; email: string; displayName: string; mfaEnabled: boolean }
export interface Workspace { id: number; name: string; slug: string; ownerId: number }
export interface Channel { id: number; workspaceId: number; name: string; isPrivate: boolean; createdBy: number }
export interface Message {
  id: number; channelId: number; userId: number; body: string
  parentId: number | null; createdAt: string; editedAt: string | null
}
export interface Member { userId: number; displayName: string; email: string; role: string; active: boolean }
export interface Conversation { id: number; workspaceId: number; userAId: number; userBId: number }
export interface DmMessage { id: number; conversationId: number; senderId: number; body: string; createdAt: string }
export interface ConversationDetail { conversation: Conversation; messages: DmMessage[] }
export interface Invitation {
  id: number; workspaceId: number; email: string; token: string
  role: string; status: string; expiresAt: string
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try { const j = await res.json(); if (j.error) msg = j.error } catch { /* ignore */ }
    throw new Error(msg)
  }
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export const api = {
  // auth
  login: (email: string, password: string) => req<User>('POST', '/api/auth/login', { email, password }),
  register: (email: string, displayName: string, password: string) =>
    req<User>('POST', '/api/auth/register', { email, displayName, password }),
  logout: () => req<void>('POST', '/api/auth/logout'),
  me: () => req<User>('GET', '/api/auth/me'),
  forgot: (email: string) => req<{ message: string; resetToken: string }>('POST', '/api/auth/forgot', { email }),
  reset: (token: string, newPassword: string) => req<void>('POST', '/api/auth/reset', { token, newPassword }),

  // workspaces
  workspaces: () => req<Workspace[]>('GET', '/api/workspaces'),
  createWorkspace: (name: string, slug: string) => req<Workspace>('POST', '/api/workspaces', { name, slug }),
  members: (wsId: number) => req<Member[]>('GET', `/api/workspaces/${wsId}/members`),
  updateMemberRole: (wsId: number, userId: number, role: string) =>
    req<Member>('PATCH', `/api/workspaces/${wsId}/members/${userId}`, { role }),

  // channels
  channels: (wsId: number) => req<Channel[]>('GET', `/api/workspaces/${wsId}/channels`),
  createChannel: (wsId: number, name: string, isPrivate: boolean) =>
    req<Channel>('POST', `/api/workspaces/${wsId}/channels`, { name, isPrivate }),
  joinChannel: (channelId: number) => req<void>('POST', `/api/channels/${channelId}/join`),
  deleteChannel: (channelId: number) => req<void>('DELETE', `/api/channels/${channelId}`),

  // messages
  channelMessages: (channelId: number) => req<Message[]>('GET', `/api/channels/${channelId}/messages`),
  message: (id: number) => req<Message>('GET', `/api/messages/${id}`),
  postMessage: (channelId: number, body: string, parentId?: number) =>
    req<Message>('POST', `/api/channels/${channelId}/messages`, { body, parentId: parentId ?? null }),
  thread: (id: number) => req<Message[]>('GET', `/api/messages/${id}/thread`),

  // dms
  conversations: () => req<Conversation[]>('GET', '/api/dms'),
  createConversation: (workspaceId: number, otherUserId: number) =>
    req<Conversation>('POST', '/api/dms', { workspaceId, otherUserId }),
  conversation: (id: number) => req<ConversationDetail>('GET', `/api/dms/${id}`),
  sendDm: (id: number, body: string) => req<DmMessage>('POST', `/api/dms/${id}/messages`, { body }),

  // invitations
  invite: (wsId: number, email: string, role: string) =>
    req<Invitation>('POST', `/api/workspaces/${wsId}/invitations`, { email, role }),
  invitations: (wsId: number) => req<Invitation[]>('GET', `/api/workspaces/${wsId}/invitations`),
  acceptInvite: (token: string) => req<unknown>('POST', '/api/invitations/accept', { token }),

  // admin
  audit: (wsId: number) => req<any[]>('GET', `/api/admin/workspaces/${wsId}/audit`),
  exportWorkspace: (wsId: number) => req<any>('GET', `/api/admin/workspaces/${wsId}/export`),
  changeRole: (wsId: number, userId: number, role: string) =>
    req<void>('POST', `/api/admin/workspaces/${wsId}/change-role`, { userId, role }),
  deactivateMember: (wsId: number, userId: number) =>
    req<void>('POST', `/api/admin/workspaces/${wsId}/deactivate-member`, { userId }),
}
