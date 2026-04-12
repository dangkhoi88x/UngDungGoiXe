import StudioXLandingPage from './pages/studio-x-landing-page'
import AuthPage from './pages/AuthPage'
import CarRentalPage from './pages/CarRentalPage'
import VehicleDetailPage from './pages/VehicleDetailPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import UserAccountPage from './pages/UserAccountPage'
import UserAccountUpdatePage from './pages/UserAccountUpdatePage'
import './App.css'

function App() {
  if (typeof window === 'undefined') {
    return <StudioXLandingPage />
  }
  const path = window.location.pathname
  if (path === '/auth') return <AuthPage />
  if (path === '/account' || path === '/account/') return <UserAccountPage />
  if (path === '/account/update' || path === '/account/update/') return <UserAccountUpdatePage />
  if (path === '/admin' || path === '/admin/') return <AdminDashboardPage />
  const rentDetail = path.match(/^\/rent\/(\d+)\/?$/)
  if (rentDetail) {
    const id = Number(rentDetail[1])
    if (Number.isInteger(id) && id > 0) {
      return <VehicleDetailPage vehicleId={id} />
    }
  }
  if (path === '/rent' || path === '/rent/') return <CarRentalPage />
  return <StudioXLandingPage />
}

export default App
