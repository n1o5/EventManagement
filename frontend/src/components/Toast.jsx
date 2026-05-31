import { useUIStore } from '../store/useStore'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

const icons = {
  success: <CheckCircle size={16} className="text-emerald-400" />,
  error: <XCircle size={16} className="text-red-400" />,
  info: <Info size={16} className="text-amber-400" />,
}

const borders = {
  success: 'border-emerald-500/30',
  error: 'border-red-500/30',
  info: 'border-amber-500/30',
}

export default function Toast() {
  const { toast, showToast } = useUIStore()
  if (!toast) return null

  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-fade-up">
      <div className={`flex items-start gap-3 bg-ink-900 border ${borders[toast.type] || borders.info} rounded-xl shadow-2xl px-4 py-3 min-w-[280px] max-w-sm`}>
        <span className="mt-0.5">{icons[toast.type] || icons.info}</span>
        <p className="text-sm text-ink-200 flex-1">{toast.message}</p>
        <button onClick={() => showToast(null)} className="text-ink-500 hover:text-ink-300 transition-colors">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
