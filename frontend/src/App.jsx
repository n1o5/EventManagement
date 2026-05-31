import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/useStore'
import Navbar from './components/Navbar'
import Toast from './components/Toast'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import EventDetail from './pages/EventDetail'
import BookTicket from './pages/BookTicket'
import CreateEvent from './pages/CreateEvent'
import MyBookings from './pages/MyBookings'
import OrganizerDashboard from './pages/OrganizerDashboard'
import AdminDashboard from './pages/AdminDashboard'

function PrivateRoute({ children }) {
  const token = useAuthStore(s => s.token)
  return token ? children : <Navigate to="/login" replace/>
}
function OrganizerRoute({ children }) {
  const user = useAuthStore(s => s.user)
  if (!user) return <Navigate to="/login" replace/>
  if (user.role !== 'organizer' && user.role !== 'admin') return <Navigate to="/" replace/>
  return children
}
function AdminRoute({ children }) {
  const user = useAuthStore(s => s.user)
  if (!user) return <Navigate to="/login" replace/>
  if (user.role !== 'admin') return <Navigate to="/" replace/>
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Navbar/>
        <main className="flex-1">
          <Routes>
            <Route path="/"                element={<Home/>}/>
            <Route path="/login"           element={<Login/>}/>
            <Route path="/register"        element={<Register/>}/>
            <Route path="/events/:id"      element={<EventDetail/>}/>
            <Route path="/events/:id/book" element={<PrivateRoute><BookTicket/></PrivateRoute>}/>
            <Route path="/my-bookings"     element={<PrivateRoute><MyBookings/></PrivateRoute>}/>
            <Route path="/create-event"    element={<OrganizerRoute><CreateEvent/></OrganizerRoute>}/>
            <Route path="/dashboard"       element={<OrganizerRoute><OrganizerDashboard/></OrganizerRoute>}/>
            <Route path="/admin"           element={<AdminRoute><AdminDashboard/></AdminRoute>}/>
          </Routes>
        </main>
        <Toast/>
      </div>
    </BrowserRouter>
  )
}
