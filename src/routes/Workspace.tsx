import { useEffect, useState } from 'react'
import { api, Channel, Conversation, Workspace as Ws } from '../api/client'
import { useAuth } from '../auth'
import Sidebar from '../components/Sidebar'
import ChannelView from '../components/ChannelView'
import DmView from '../components/DmView'
import MembersPanel from '../components/MembersPanel'
import AdminPanel from '../components/AdminPanel'
import InviteModal from '../components/InviteModal'
import CreateWorkspaceModal from '../components/CreateWorkspaceModal'

type View =
  | { kind: 'channel'; id: number }
  | { kind: 'dm'; id: number }
  | { kind: 'members' }
  | { kind: 'admin' }

export default function Workspace() {
  const { user, logout } = useAuth()
  const [workspaces, setWorkspaces] = useState<Ws[]>([])
  const [current, setCurrent] = useState<Ws | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [view, setView] = useState<View | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [showCreateWs, setShowCreateWs] = useState(false)

  const loadWorkspaces = async () => {
    const ws = await api.workspaces()
    setWorkspaces(ws)
    if (ws.length && !current) setCurrent(ws[0])
  }

  useEffect(() => { loadWorkspaces() }, [])

  useEffect(() => {
    if (!current) return
    api.channels(current.id).then(setChannels).catch(() => setChannels([]))
    api.conversations().then(setConversations).catch(() => setConversations([]))
    setView(null)
  }, [current])

  useEffect(() => {
    if (!view && channels.length) setView({ kind: 'channel', id: channels[0].id })
  }, [channels])

  const refreshChannels = () => current && api.channels(current.id).then(setChannels)

  return (
    <div className="app">
      <Sidebar
        user={user!}
        workspaces={workspaces}
        current={current}
        channels={channels}
        conversations={conversations}
        onSelectWorkspace={setCurrent}
        onSelectView={setView}
        onCreateWorkspace={() => setShowCreateWs(true)}
        onInvite={() => setShowInvite(true)}
        onLogout={logout}
        onChannelsChanged={refreshChannels}
      />
      <main className="main">
        {current && view?.kind === 'channel' && (
          <ChannelView workspace={current} channelId={view.id} channels={channels} me={user!} />
        )}
        {current && view?.kind === 'dm' && <DmView conversationId={view.id} me={user!} />}
        {current && view?.kind === 'members' && <MembersPanel workspace={current} />}
        {current && view?.kind === 'admin' && <AdminPanel workspace={current} />}
        {!current && <div className="center">No workspace yet. Create one to get started.</div>}
      </main>
      {showInvite && current && <InviteModal workspace={current} onClose={() => setShowInvite(false)} />}
      {showCreateWs && (
        <CreateWorkspaceModal
          onClose={() => setShowCreateWs(false)}
          onCreated={async (w) => { setShowCreateWs(false); await loadWorkspaces(); setCurrent(w) }}
        />
      )}
    </div>
  )
}
