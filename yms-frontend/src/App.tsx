import { Navigate, Route, Routes } from 'react-router-dom'

import './App.css'
import { useAuth } from './auth/AuthContext'
import { ProtectedRoute } from './auth/ProtectedRoute'
import AdminDashboard from './pages/Dashboard/AdminDashboard'
import LoginPage from './pages/LoginPage/LoginPage'

function HomeRedirect() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading…</div>
  }

  return user ? <Navigate to="/admin" replace /> : <Navigate to="/login" replace />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
