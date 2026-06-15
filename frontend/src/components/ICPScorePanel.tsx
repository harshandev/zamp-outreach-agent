'use client'
import clsx from 'clsx'
import { Target, TrendingUp, Building2, User, Zap, AlertTriangle } from 'lucide-react'

const DIM_META: Record<string, { label: string; icon: React.ReactNode }> = {
  company_size_fit: { label: 'Company Size',    icon: <Building2 size={13} /> },
  industry_fit:     { label: 'Industry',        icon: <TrendingUp size={13} /> },
  title_fit:        { label: 'Title Seniority', icon: <User size={13} /> },
  growth_signals:   { label: 'Growth Signals',  icon: <Zap size={13} /> },
  pain_likelihood:  { label: 'Pain Likelihood', icon: <Target size={13} /> },
}

function ScoreBar({ value, max = 20 }: { value: number; max?: number }) {
  const pct = (value / max) * 100
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div
          className={clsx('h-1.5 rounded-full transition-all duration-700',
            pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-400')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-600 w-8 text-right">{value}/20</span>
    </div>
  )
}

export default function ICPScorePanel({ icp }: { icp: Record<string, unknown> }) {
  const score = icp.overall_score as number ?? 0
  const recommendation = icp.recommendation as string ?? 'review'
  const breakdown = icp as Record<string, number>

  const REC_CONFIG = {
    pursue: { label: 'Strong Fit — Pursue',    classes: 'bg-green-50 text-green-800 border-green-200', ring: 'ring-green-500' },
    review: { label: 'Borderline — Review',    classes: 'bg-amber-50 text-amber-800 border-amber-200', ring: 'ring-amber-400' },
    skip:   { label: 'Poor Fit — Skip',        classes: 'bg-red-50 text-red-800 border-red-200',       ring: 'ring-red-400' },
  }
  const rec = REC_CONFIG[recommendation as keyof typeof REC_CONFIG] ?? REC_CONFIG.review

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Score circle + recommendation */}
      <div className="card p-5 flex items-center gap-5">
        <div className={clsx('w-20 h-20 rounded-full flex flex-col items-center justify-center ring-4 flex-shrink-0', rec.ring)}>
          <span className={clsx('text-2xl font-bold', score >= 65 ? 'text-green-700' : score >= 40 ? 'text-amber-600' : 'text-red-600')}>
            {score}
          </span>
          <span className="text-xs text-gray-400">/100</span>
        </div>
        <div>
          <span className={clsx('badge border px-3 py-1 text-sm font-medium', rec.classes)}>{rec.label}</span>
          <p className="text-sm text-gray-600 mt-2 leading-snug">{icp.reasoning as string}</p>
        </div>
      </div>

      {/* Dimension breakdown */}
      <div className="card p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Score Breakdown</h3>
        <div className="space-y-3">
          {Object.entries(DIM_META).map(([key, meta]) => (
            <div key={key}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-gray-400">{meta.icon}</span>
                <span className="text-xs text-gray-600">{meta.label}</span>
              </div>
              <ScoreBar value={breakdown[key] ?? 0} />
            </div>
          ))}
        </div>
      </div>

      {/* Risk flags */}
      {(icp.risk_flags as string[] ?? []).length > 0 && (
        <div className="card p-4 border-l-4 border-l-amber-400 bg-amber-50">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-amber-600" />
            <span className="text-xs font-semibold text-amber-700">Risk Flags</span>
          </div>
          <ul className="space-y-1">
            {(icp.risk_flags as string[]).map((flag, i) => (
              <li key={i} className="text-xs text-amber-700">• {flag}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
