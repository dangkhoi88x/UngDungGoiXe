import StudioXLandingPage from './pages/studio-x-landing-page'
import AuthPage from './pages/AuthPage'
import CarRentalPage from './pages/CarRentalPage'
import VehicleDetailPage from './pages/VehicleDetailPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import './App.css'

function App() {
  if (typeof window === 'undefined') {
    return <StudioXLandingPage />
  }
  const path = window.location.pathname
  if (path === '/auth') return <AuthPage />
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
