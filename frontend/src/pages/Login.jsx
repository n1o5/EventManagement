import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Calendar, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { authAPI } from '../api/client'
import { useAuthStore, useUIStore } from '../store/useStore'

export default function Login() {
  const [form, setForm]     = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError]   = useState('')
  const { setAuth } = useAuthStore()
  const { showToast } = useUIStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('')
    setLoading(true)
    try {
      const res = await authAPI.login(form)
      setAuth(res.data.user, res.data.access_token)
      showToast(`Welcome back, ${res.data.user.name}!`, 'success')
      navigate('/')
    } catch (err) {
      setError(err.response?.status === 401
        ? 'Incorrect email or password. Please try again.'
        : err.response?.data?.detail || 'Login failed. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calendar size={24} className="text-amber-400"/>
          </div>
          <h1 className="font-display text-3xl font-bold text-ink-50">Welcome back</h1>
          <p className="text-ink-400 mt-2 text-sm">Sign in to access your tickets</p>
        </div>

        {error && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5"/>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label">Email</label>
            <input type="email" required value={form.email}
              onChange={e => { setForm({...form, email: e.target.value}); setError('') }}
              placeholder="you@example.com"
              className={`input ${error ? 'border-red-500/60' : ''}`}/>
          </div>
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} required value={form.password}
                onChange={e => { setForm({...form, password: e.target.value}); setError('') }}
                placeholder="••••••••"
                className={`input pr-11 ${error ? 'border-red-500/60' : ''}`}/>
              <button type="button" onClick={() => setShowPwd(!showPwd)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-300 transition-colors">
                {showPwd ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="text-center text-sm text-ink-400 mt-5">
          Don't have an account?{' '}
          <Link to="/register" className="text-amber-400 hover:text-amber-300 font-medium">Create one</Link>
        </p>
      </div>
    </div>
  )
}
