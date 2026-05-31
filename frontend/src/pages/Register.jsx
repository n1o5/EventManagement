import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Calendar, Ticket, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { authAPI } from '../api/client'
import { useAuthStore, useUIStore } from '../store/useStore'

const ROLES = [
  { value: 'participant', icon: <Ticket size={18}/>, label: 'Attendee',  desc: 'Browse and book tickets' },
  { value: 'organizer',  icon: <Calendar size={18}/>, label: 'Organizer', desc: 'Create and manage events' },
]

export default function Register() {
  const [form, setForm]     = useState({ name:'', email:'', password:'', role:'participant' })
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError]   = useState('')
  const { setAuth } = useAuthStore()
  const { showToast } = useUIStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('')
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    try {
      const res = await authAPI.register(form)
      setAuth(res.data.user, res.data.access_token)
      showToast('Account created! Welcome to EventHub 🎉', 'success')
      navigate('/')
    } catch (err) {
      const msg = err.response?.data?.detail
      setError(err.response?.status === 400 && msg?.includes('already')
        ? 'An account with this email already exists.'
        : msg || 'Registration failed. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-ink-50">Create your account</h1>
          <p className="text-ink-400 mt-2 text-sm">Join thousands of event lovers</p>
        </div>

        {error && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5"/>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label">I am a…</label>
            <div className="grid grid-cols-2 gap-3">
              {ROLES.map(r => (
                <button key={r.value} type="button" onClick={() => setForm({...form, role: r.value})}
                  className={`p-3 rounded-lg border text-left transition-all duration-200
                    ${form.role === r.value ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                                            : 'border-ink-600 bg-ink-800 text-ink-300 hover:border-ink-500'}`}>
                  <div className="mb-1">{r.icon}</div>
                  <div className="font-medium text-sm">{r.label}</div>
                  <div className="text-xs text-ink-500 mt-0.5">{r.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Full name</label>
            <input type="text" required value={form.name}
              onChange={e => { setForm({...form, name: e.target.value}); setError('') }}
              placeholder="Priya Sharma" className="input"/>
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" required value={form.email}
              onChange={e => { setForm({...form, email: e.target.value}); setError('') }}
              placeholder="you@example.com"
              className={`input ${error && error.includes('email') ? 'border-red-500/60' : ''}`}/>
          </div>
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} required value={form.password}
                onChange={e => { setForm({...form, password: e.target.value}); setError('') }}
                placeholder="At least 6 characters"
                className={`input pr-11 ${error && error.includes('Password') ? 'border-red-500/60' : ''}`}/>
              <button type="button" onClick={() => setShowPwd(!showPwd)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-300 transition-colors">
                {showPwd ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
            <p className="text-ink-600 text-xs mt-1">Minimum 6 characters</p>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="text-center text-sm text-ink-400 mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-amber-400 hover:text-amber-300 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
