import { useEffect, useState } from 'react'
import { api, Workspace } from '../api/client'

export default function AdminPanel({ workspace }: { workspace: Workspace }) {
  const [audit, setAudit] = useState<any[]>([])
  const [error, setError] = useState('')
  const [exportData, setExportData] = useState<string>('')

  useEffect(() => {
    api.audit(workspace.id).then(setAudit).catch(e => { setAudit([]); setError(e.message) })
  }, [workspace.id])

  const doExport = async () => {
    const data = await api.exportWorkspace(workspace.id)
    setExportData(JSON.stringify(data, null, 2))
  }

  return (
    <div className="panel">
      <h2>Admin console — {workspace.name}</h2>
      {error && <div className="error">{error}</div>}
      <section>
        <h3>Audit log</h3>
        <table className="table">
          <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Target</th></tr></thead>
          <tbody>
            {audit.map(a => (
              <tr key={a.id}>
                <td>{new Date(a.createdAt).toLocaleString()}</td>
                <td>{a.actorId}</td><td>{a.action}</td><td>{a.targetId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section>
        <h3>Export workspace</h3>
        <button onClick={doExport}>Export all data</button>
        {exportData && <pre className="export">{exportData}</pre>}
      </section>
    </div>
  )
}
