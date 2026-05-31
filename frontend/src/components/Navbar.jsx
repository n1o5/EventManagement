import { Link, useNavigate } from 'react-router-dom'
import { Calendar, Ticket, LayoutDashboard, LogOut, User, Menu, X, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '../store/useStore'

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const handleLogout = () => { logout(); navigate('/login') }
  const isAdmin     = user?.role === 'admin'
  const isOrganizer = user?.role === 'organizer'

  return (
    <nav className="border-b border-ink-800 bg-ink-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
              <Calendar size={16} className="text-ink-950"/>
            </div>
            <span className="font-display text-xl font-bold text-ink-50">EventHub</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <Link to="/" className="btn-ghost text-sm">Browse</Link>
            {user && !isAdmin && (
              <Link to="/my-bookings" className="btn-ghost text-sm flex items-center gap-1.5">
                <Ticket size={13}/>My Tickets
              </Link>
            )}
            {isOrganizer && (
              <Link to="/dashboard" className="btn-ghost text-sm flex items-center gap-1.5">
                <LayoutDashboard size={13}/>My Dashboard
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin" className="btn-ghost text-sm flex items-center gap-1.5 text-purple-400 hover:text-purple-300">
                <ShieldCheck size={13}/>Admin Panel
              </Link>
            )}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-ink-300">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isAdmin?'bg-purple-500/20':'bg-amber-500/20'}`}>
                    {isAdmin
                      ? <ShieldCheck size={13} className="text-purple-400"/>
                      : <User size={13} className="text-amber-400"/>}
                  </div>
                  <span>{user.name}</span>
                  {isAdmin     && <span className="badge bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[10px]">Admin</span>}
                  {isOrganizer && <span className="badge bg-amber-500/20  text-amber-400  border border-amber-500/30  text-[10px]">Organizer</span>}
                </div>
                <button onClick={handleLogout} className="btn-ghost text-sm flex items-center gap-1.5 text-ink-400">
                  <LogOut size={14}/>Sign out
                </button>
              </div>
            ) : (
              <>
                <Link to="/login" className="btn-ghost text-sm">Sign in</Link>
                <Link to="/register" className="btn-primary text-sm">Get started</Link>
              </>
            )}
          </div>

          <button className="md:hidden btn-ghost p-2" onClick={()=>setOpen(!open)}>
            {open?<X size={20}/>:<Menu size={20}/>}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-ink-800 bg-ink-950 px-4 py-3 space-y-1">
          <Link to="/" className="block btn-ghost text-sm py-2" onClick={()=>setOpen(false)}>Browse</Link>
          {user ? (
            <>
              {!isAdmin && <Link to="/my-bookings" className="block btn-ghost text-sm py-2" onClick={()=>setOpen(false)}>My Tickets</Link>}
              {isOrganizer && <Link to="/dashboard" className="block btn-ghost text-sm py-2" onClick={()=>setOpen(false)}>My Dashboard</Link>}
              {isAdmin && <Link to="/admin" className="block btn-ghost text-sm py-2 text-purple-400" onClick={()=>setOpen(false)}>Admin Panel</Link>}
              <button onClick={()=>{handleLogout();setOpen(false)}} className="w-full text-left btn-ghost text-sm py-2 text-ink-400">Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="block btn-ghost text-sm py-2" onClick={()=>setOpen(false)}>Sign in</Link>
              <Link to="/register" className="block btn-primary text-sm text-center mt-1" onClick={()=>setOpen(false)}>Get started</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
