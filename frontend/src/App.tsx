import StudioXLandingPage from './pages/studio-x-landing-page'
import { useEffect, type ReactElement } from 'react'
import AuthPage from './pages/AuthPage'
import CarRentalPage from './pages/CarRentalPage'
import VehicleDetailPage from './pages/VehicleDetailPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import UserAccountPage from './pages/UserAccountPage'
import UserAccountUpdatePage from './pages/UserAccountUpdatePage'
import { logoutRequest, rolesFromJwt } from './api/auth'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import './App.css'

function RequireAdmin({ children }: { children: ReactElement }) {
  const token = localStorage.getItem('accessToken')
  const roles = rolesFromJwt(token)
  const normalizedRoles = roles.map((r) => r.trim().toUpperCase())
  const isAdmin = normalizedRoles.some(
    (r) =>
      r === 'ROLE_ADMIN' ||
      r === 'ADMIN' ||
      r === 'ROLE_SUPER_ADMIN' ||
      r === 'SUPER_ADMIN' ||
      r.startsWith('ROLE_ADMIN'),
  )
  if (!isAdmin) {
    return <Navigate to="/" replace />
  }
  return children
}

function VehicleDetailRoute() {
  const { id } = useParams<{ id: string }>()
  const vehicleId = Number(id)
  if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
    return <Navigate to="/rent" replace />
  }
  return <VehicleDetailPage vehicleId={vehicleId} />
}

function LogoutRoute() {
  useEffect(() => {
    let ignore = false

    async function runLogout() {
      const token = localStorage.getItem('accessToken')
      try {
        if (token) {
          await logoutRequest(token)
        }
      } catch {
        // Dù API logout lỗi vẫn xóa local session phía client.
      } finally {
        if (ignore) return
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('userDisplayName')
        window.location.replace('/auth')
      }
    }

    void runLogout()
    return () => {
      ignore = true
    }
  }, [])

  return <div style={{ padding: 24 }}>Đang đăng xuất…</div>
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<StudioXLandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/logout" element={<LogoutRoute />} />
      <Route path="/account" element={<UserAccountPage />} />
      <Route path="/account/update" element={<UserAccountUpdatePage />} />
      <Route
        path="/admin/*"
        element={
          <RequireAdmin>
            <AdminDashboardPage />
          </RequireAdmin>
        }
      />
      <Route path="/rent" element={<CarRentalPage />} />
      <Route path="/rent/:id" element={<VehicleDetailRoute />} />
      <Route path="*" element={<StudioXLandingPage />} />
    </Routes>
  )
}

export default App
