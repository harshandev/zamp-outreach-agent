'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Users, TrendingUp, Trash2, ExternalLink, RefreshCw } from 'lucide-react'
import { RunSummary } from '@/lib/types'
import { createRun, getRuns, deleteRun } from '@/lib/api'
import StatusBadge from '@/components/StatusBadge'
import clsx from 'clsx'
import { formatDistanceToNow } from 'date-fns'

const HOOK_TYPE_COLORS: Record<string, string> = {
  funding:     'bg-green-50 text-green-700 border-green-100',
  hiring:      'bg-blue-50 text-blue-700 border-blue-100',
  news:        'bg-purple-50 text-purple-700 border-purple-100',
  product:     'bg-orange-50 text-orange-700 border-orange-100',
  competitive: 'bg-red-50 text-red-700 border-red-100',
  executive:   'bg-indigo-50 text-indigo-700 border-indigo-100',
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</span>
        <span className="text-gray-300">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()
  const [runs, setRuns] = useState<RunSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ prospect_name: '', title: '', company: '' })
  const [errors, setErrors] = useState<Partial<typeof form>>({})

  const fetchRuns = useCallback(async () => {
    try {
      const data = await getRuns()
      setRuns(data)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchRuns()
    const interval = setInterval(fetchRuns, 5000)
    return () => clearInterval(interval)
  }, [fetchRuns])

  const validate = () => {
    const e: Partial<typeof form> = {}
    if (!form.prospect_name.trim()) e.prospect_name = 'Required'
    if (!form.title.trim()) e.title = 'Required'
    if (!form.company.trim()) e.company = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const { run_id } = await createRun(form)
      router.push(`/run/${run_id}`)
    } catch {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteRun(id)
    setRuns((prev) => prev.filter((r) => r.id !== id))
  }

  const stats = {
    total: runs.length,
    completed: runs.filter((r) => r.status === 'completed' || r.status === 'low_confidence').length,
    avgScore: runs.filter((r) => r.quality_score != null).reduce((acc, r, _, arr) =>
      acc + (r.quality_score ?? 0) / arr.length, 0),
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-lg leading-none">Zamp</h1>
              <p className="text-xs text-gray-500">AI Outreach Agent</p>
            </div>
          </div>
          <button onClick={fetchRuns} className="btn-ghost flex items-center gap-2 text-sm">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total Runs" value={stats.total} icon={<Users size={16} />} />
          <StatCard label="Completed" value={stats.completed} icon={<TrendingUp size={16} />} />
          <StatCard label="Avg Quality" value={stats.avgScore ? parseFloat(stats.avgScore.toFixed(1)) : 0} icon={<Zap size={16} />} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-1">New Prospect</h2>
              <p className="text-sm text-gray-500 mb-5">Enter a prospect to generate personalised outreach.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {(
                  [
                    { key: 'prospect_name', label: 'Full Name', placeholder: 'Sarah Chen' },
                    { key: 'title', label: 'Job Title', placeholder: 'VP of Finance' },
                    { key: 'company', label: 'Company', placeholder: 'Acme Corp' },
                  ] as const
                ).map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <input
                      type="text"
                      value={form[key]}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, [key]: e.target.value }))
                        setErrors((er) => ({ ...er, [key]: undefined }))
                      }}
                      placeholder={placeholder}
                      className={clsx(
                        'w-full px-3 py-2.5 rounded-lg border text-sm transition-colors outline-none',
                        errors[key]
                          ? 'border-red-300 focus:border-red-400 bg-red-50'
                          : 'border-gray-200 focus:border-blue-400 bg-white'
                      )}
                    />
                    {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
                  </div>
                ))}

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Zap size={15} /> Generate Outreach
                    </>
                  )}
                </button>
              </form>

              {/* Edge case presets */}
              <div className="mt-5 pt-5 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-3">Demo presets</p>
                <div className="space-y-2">
                  {[
                    { prospect_name: 'Sarah Chen', title: 'VP of Finance', company: 'Notion', label: 'Happy path' },
                    { prospect_name: 'James Wu', title: 'CTO', company: 'Linear', label: 'Tech exec' },
                    { prospect_name: 'Priya Sharma', title: 'Head of Operations', company: 'Zepto', label: 'No public presence' },
                    { prospect_name: 'Marcus Johnson', title: 'CEO', company: 'Stealth Startup', label: 'New company' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => setForm({ prospect_name: preset.prospect_name, title: preset.title, company: preset.company })}
                      className="w-full text-left px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-100"
                    >
                      <span className="text-xs font-medium text-gray-700">{preset.label}</span>
                      <span className="text-xs text-gray-400 ml-2">{preset.prospect_name} · {preset.company}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Run History</h2>
              <span className="text-sm text-gray-400">{runs.length} runs</span>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="card p-4 h-20 animate-pulse bg-gray-100" />
                ))}
              </div>
            ) : runs.length === 0 ? (
              <div className="card p-12 text-center">
                <Zap size={32} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No runs yet. Generate your first outreach draft.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {runs.map((run) => (
                  <div
                    key={run.id}
                    onClick={() => router.push(`/run/${run.id}`)}
                    className="card p-4 cursor-pointer hover:shadow-md transition-all hover:border-blue-100 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 text-sm">{run.prospect_name}</span>
                          <StatusBadge status={run.status} />
                          {run.hook_type && (
                            <span className={clsx('badge border text-xs', HOOK_TYPE_COLORS[run.hook_type] ?? 'bg-gray-50 text-gray-600 border-gray-100')}>
                              {run.hook_type}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{run.title} · {run.company}</p>
                        {run.hook_summary && (
                          <p className="text-xs text-gray-400 mt-1 truncate">{run.hook_summary}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {run.quality_score != null && (
                          <div className="text-right">
                            <div className={clsx(
                              'text-sm font-bold',
                              run.quality_score >= 8 ? 'text-green-600' : run.quality_score >= 7 ? 'text-blue-600' : 'text-amber-600'
                            )}>
                              {run.quality_score.toFixed(1)}
                            </div>
                            <div className="text-xs text-gray-400">/10</div>
                          </div>
                        )}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleDelete(run.id, e)}
                            className="p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                          <ExternalLink size={13} className="text-gray-300" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                      {run.created_at ? formatDistanceToNow(new Date(run.created_at), { addSuffix: true }) : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
