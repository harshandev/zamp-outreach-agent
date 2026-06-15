'use client'
import { Swords, TrendingUp, AlertCircle } from 'lucide-react'

interface CompetitorIntel {
  has_competitive_intel?: boolean
  competitors_found?: string[]
  prospect_using?: string
  competitive_hook?: string
  industry_competitor_moves?: string
  urgency_angle?: string
}

export default function CompetitorIntelPanel({ intel }: { intel: Record<string, unknown> }) {
  const data = intel as CompetitorIntel

  if (!data?.has_competitive_intel) {
    return (
      <div className="card p-6 text-center">
        <Swords size={28} className="text-gray-200 mx-auto mb-2" />
        <p className="text-sm text-gray-400">No competitive intelligence found for this prospect.</p>
        <p className="text-xs text-gray-300 mt-1">Industry-level angle was used instead.</p>
      </div>
    )
  }

  const competitors = data.competitors_found ?? []

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Competitors detected */}
      {competitors.length > 0 && (
        <div className="card p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Competitors Detected</h3>
          <div className="flex flex-wrap gap-2">
            {competitors.map((c) => (
              <span key={c} className="badge bg-red-50 text-red-700 border border-red-100 px-3 py-1">
                {c}
              </span>
            ))}
          </div>
          {data.prospect_using && (
            <p className="text-xs text-gray-500 mt-2">
              Currently using: <span className="font-medium text-gray-700">{data.prospect_using}</span>
            </p>
          )}
        </div>
      )}

      {/* Competitive hook */}
      {data.competitive_hook && (
        <div className="card p-4 border-l-4 border-l-orange-400">
          <div className="flex items-center gap-2 mb-1">
            <Swords size={14} className="text-orange-500" />
            <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Competitive Hook</span>
          </div>
          <p className="text-sm text-gray-700">{data.competitive_hook}</p>
        </div>
      )}

      {/* Industry moves */}
      {data.industry_competitor_moves && (
        <div className="card p-4 border-l-4 border-l-blue-400">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-blue-500" />
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Industry Moves</span>
          </div>
          <p className="text-sm text-gray-700">{data.industry_competitor_moves}</p>
        </div>
      )}

      {/* Urgency angle */}
      {data.urgency_angle && (
        <div className="card p-4 bg-gray-50">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={14} className="text-gray-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Urgency Angle</span>
          </div>
          <p className="text-sm text-gray-600">{data.urgency_angle}</p>
        </div>
      )}
    </div>
  )
}
