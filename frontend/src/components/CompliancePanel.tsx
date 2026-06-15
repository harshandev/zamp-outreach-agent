'use client'
import { ShieldCheck, ShieldAlert, ShieldX, CheckCircle, XCircle, Lightbulb } from 'lucide-react'
import clsx from 'clsx'

export default function CompliancePanel({ compliance }: { compliance: Record<string, unknown> }) {
  if (!compliance || Object.keys(compliance).length === 0) return null

  const passed = compliance.passed as boolean
  const risk = compliance.risk_level as string ?? 'low'
  const issues = compliance.issues as string[] ?? []
  const suggestions = compliance.suggestions as string[] ?? []

  const RISK_CONFIG = {
    low:    { label: 'Low Risk',    classes: 'bg-green-50 text-green-800 border-green-200', icon: <ShieldCheck size={16} className="text-green-600" /> },
    medium: { label: 'Medium Risk', classes: 'bg-amber-50 text-amber-800 border-amber-200', icon: <ShieldAlert size={16} className="text-amber-600" /> },
    high:   { label: 'High Risk',   classes: 'bg-red-50 text-red-800 border-red-200',       icon: <ShieldX size={16} className="text-red-600" /> },
  }
  const rc = RISK_CONFIG[risk as keyof typeof RISK_CONFIG] ?? RISK_CONFIG.low

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Status bar */}
      <div className={clsx('card p-4 flex items-center gap-3 border', rc.classes)}>
        {rc.icon}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{passed ? 'Compliance Passed' : 'Compliance Failed'}</span>
            <span className={clsx('badge border text-xs', rc.classes)}>{rc.label}</span>
          </div>
        </div>
      </div>

      {/* Checks */}
      <div className="card p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Compliance Checks</h3>
        <div className="space-y-2">
          {[
            { label: 'CAN-SPAM Compliant', value: compliance.can_spam_compliant as boolean },
            { label: 'No False Claims', value: !(compliance.false_claims_detected as boolean) },
            { label: 'GDPR Safe', value: risk !== 'high' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-2">
              {value
                ? <CheckCircle size={14} className="text-green-500" />
                : <XCircle size={14} className="text-red-500" />}
              <span className="text-sm text-gray-700">{label}</span>
            </div>
          ))}
        </div>
        {compliance.gdpr_notes && (
          <p className="text-xs text-gray-400 mt-3">{compliance.gdpr_notes as string}</p>
        )}
      </div>

      {/* Issues */}
      {issues.length > 0 ? (
        <div className="card p-4 border-l-4 border-l-red-400 bg-red-50">
          <h3 className="text-xs font-semibold text-red-700 mb-2">Issues Found</h3>
          <ul className="space-y-1">
            {issues.map((issue, i) => (
              <li key={i} className="text-xs text-red-700">• {issue}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Suggestions */}
      {suggestions.length > 0 ? (
        <div className="card p-4 bg-blue-50 border-l-4 border-l-blue-400">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb size={13} className="text-blue-600" />
            <h3 className="text-xs font-semibold text-blue-700">Suggestions</h3>
          </div>
          <ul className="space-y-1">
            {suggestions.map((s, i) => (
              <li key={i} className="text-xs text-blue-700">• {s}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
