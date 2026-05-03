import StudioXLandingPage from './pages/studio-x-landing-page'
import { useEffect, type ReactElement } from 'react'
import AuthPage from './pages/AuthPage'
import GoogleOAuthCallbackPage from './pages/GoogleOAuthCallbackPage'
import CarRentalPage from './pages/CarRentalPage'
import VehicleDetailPage from './pages/VehicleDetailPage'
import VehicleBookingPage from './pages/VehicleBookingPage'
import MomoReturnPage from './pages/MomoReturnPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import UserAccountPage from './pages/UserAccountPage'
import UserAccountUpdatePage from './pages/UserAccountUpdatePage'
import UserOrderHistoryPage from './pages/UserOrderHistoryPage'
import MapStationPage from './pages/MapStationPage'
import OwnerRegisterVehiclePage from './pages/OwnerRegisterVehiclePage'
import OwnerMyVehicleRequestsPage from './pages/OwnerMyVehicleRequestsPage'
import OwnerEditVehicleRequestPage from './pages/OwnerEditVehicleRequestPage'
import OwnerVehicleRequestDetailPage from './pages/OwnerVehicleRequestDetailPage'
import OwnerVehicleRequestBookingsPage from './pages/OwnerVehicleRequestBookingsPage'
import BlogListingPage from './pages/BlogListingPage'
import BlogPostPage from './pages/BlogPostPage'
import { logoutRequest } from './api/auth'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import './App.css'

function RequireAdmin({ children }: { children: ReactElement }) {
  const { isAdmin, isLoading } = useAuth()
  // Đang fetch user info lần đầu → chờ, không redirect ngay
  if (isLoading) return <div style={{ padding: 24 }}>Đang kiểm tra quyền…</div>
  if (!isAdmin) return <Navigate to="/" replace />
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

function VehicleBookingRoute() {
  const { vehicleId } = useParams<{ vehicleId: string }>()
  const id = Number(vehicleId)
  if (!Number.isInteger(id) || id <= 0) {
    return <Navigate to="/rent" replace />
  }
  return <VehicleBookingPage vehicleId={id} />
}

function BlogPostRoute() {
  const { slug } = useParams<{ slug: string }>()
  if (!slug || !slug.trim()) {
    return <Navigate to="/blog" replace />
  }
  return <BlogPostPage />
}

function LogoutRoute() {
  const { logout } = useAuth()

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
        // Xóa token trước, sau đó reset context state
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('userDisplayName')
        logout()
        window.location.replace('/auth')
      }
    }

    void runLogout()
    return () => {
      ignore = true
    }
  }, [logout])

  return <div style={{ padding: 24 }}>Đang đăng xuất…</div>
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<StudioXLandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth/google" element={<GoogleOAuthCallbackPage />} />
      <Route path="/logout" element={<LogoutRoute />} />
      <Route path="/account" element={<UserAccountPage />} />
      <Route path="/account/update" element={<UserAccountUpdatePage />} />
      <Route path="/account/orders" element={<UserOrderHistoryPage />} />
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
      <Route path="/booking/:vehicleId" element={<VehicleBookingRoute />} />
      <Route path="/payment/momo-return" element={<MomoReturnPage />} />
      <Route path="/blog" element={<BlogListingPage />} />
      <Route path="/blog/:slug" element={<BlogPostRoute />} />
      <Route path="/mapstation" element={<MapStationPage />} />
      <Route path="/owner/register-vehicle" element={<OwnerRegisterVehiclePage />} />
      <Route path="/owner/vehicle-requests" element={<OwnerMyVehicleRequestsPage />} />
      <Route path="/owner/vehicle-requests/:id" element={<OwnerVehicleRequestDetailPage />} />
      <Route path="/owner/vehicle-requests/:id/edit" element={<OwnerEditVehicleRequestPage />} />
      <Route path="/owner/vehicle-requests/:id/bookings" element={<OwnerVehicleRequestBookingsPage />} />
      <Route path="*" element={<StudioXLandingPage />} />
    </Routes>
  )
}

export default App
