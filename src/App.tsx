import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth'
import Login from './routes/Login'
import Signup from './routes/Signup'
import Forgot from './routes/Forgot'
import Workspace from './routes/Workspace'

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <div className="center">Loading…</div>
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to="/" /> : <Signup />} />
      <Route path="/forgot" element={<Forgot />} />
      <Route path="/*" element={user ? <Workspace /> : <Navigate to="/login" />} />
    </Routes>
  )
}
