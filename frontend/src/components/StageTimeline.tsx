'use client'
import { StageEvent } from '@/lib/types'
import clsx from 'clsx'
import { CheckCircle, XCircle, Loader2, Search, Zap, Brain, PenLine, Star } from 'lucide-react'

const STAGE_META: Record<string, { label: string; icon: React.ReactNode }> = {
  icp_scoring:       { label: 'ICP Scoring',         icon: <Star size={16} /> },
  rag_retrieval:     { label: 'RAG Retrieval',        icon: <Brain size={16} /> },
  research:          { label: 'Web Research',         icon: <Search size={16} /> },
  competitive_intel: { label: 'Competitor Intel',     icon: <Zap size={16} /> },
  signal_extraction: { label: 'Signal Extraction',   icon: <Zap size={16} /> },
  fallback_research: { label: 'Fallback Research',   icon: <Search size={16} /> },
  persona_reasoning: { label: 'Persona Reasoning',   icon: <Brain size={16} /> },
  draft_generation:  { label: 'Draft Generation',    icon: <PenLine size={16} /> },
  quality_scoring:   { label: 'Quality Scoring',     icon: <Star size={16} /> },
  compliance_check:  { label: 'Compliance Check',    icon: <CheckCircle size={16} /> },
  complete:          { label: 'Complete',             icon: <CheckCircle size={16} /> },
}

function StageIcon({ status }: { status: string }) {
  if (status === 'running')   return <Loader2 size={16} className="animate-spin text-blue-500" />
  if (status === 'completed') return <CheckCircle size={16} className="text-green-500" />
  if (status === 'failed')    return <XCircle size={16} className="text-red-500" />
  return <CheckCircle size={16} className="text-green-500" />
}

export default function StageTimeline({ events }: { events: StageEvent[] }) {
  // Deduplicate: keep last event per stage
  const stageMap = new Map<string, StageEvent>()
  for (const e of events) stageMap.set(e.stage, e)
  const stages = Array.from(stageMap.values())

  return (
    <div className="space-y-1">
      {stages.map((event, i) => {
        const meta = STAGE_META[event.stage] ?? { label: event.stage, icon: <Zap size={16} /> }
        const isLast = i === stages.length - 1

        return (
          <div key={event.stage} className="flex gap-3 animate-fade-in">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                event.status === 'running'   && 'bg-blue-50 text-blue-600',
                event.status === 'completed' && 'bg-green-50 text-green-600',
                event.status === 'failed'    && 'bg-red-50 text-red-600',
                (event.stage === 'complete') && 'bg-green-50 text-green-600',
              )}>
                <StageIcon status={event.status} />
              </div>
              {!isLast && <div className="w-px flex-1 bg-gray-100 my-1" />}
            </div>

            {/* Content */}
            <div className="pb-4 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">{meta.icon}</span>
                <span className="text-sm font-medium text-gray-800">{meta.label}</span>
                <span className="text-xs text-gray-400 ml-auto">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5 leading-snug">{event.message}</p>

              {/* Extra data pills */}
              {event.stage === 'signal_extraction' && event.data?.signals && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(event.data.signals as Array<{type: string; relevance_score: number}>).map((s, idx) => (
                    <span key={idx} className="badge bg-purple-50 text-purple-700 border border-purple-100">
                      {s.type} · {(s.relevance_score * 100).toFixed(0)}%
                    </span>
                  ))}
                </div>
              )}
              {event.stage === 'quality_scoring' && event.data?.score && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div
                      className={clsx('h-1.5 rounded-full transition-all', (event.data.score as number) >= 7 ? 'bg-green-500' : 'bg-amber-400')}
                      style={{ width: `${((event.data.score as number) / 10) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-700">{(event.data.score as number).toFixed(1)}/10</span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
