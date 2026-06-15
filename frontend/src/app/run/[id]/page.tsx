'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Target, Swords, BookOpen, ShieldCheck, FileText, AlertTriangle } from 'lucide-react'
import { StageEvent, RunDetail } from '@/lib/types'
import { getRun, streamRun } from '@/lib/api'
import StageTimeline from '@/components/StageTimeline'
import DraftOutput from '@/components/DraftOutput'
import ICPScorePanel from '@/components/ICPScorePanel'
import CompetitorIntelPanel from '@/components/CompetitorIntelPanel'
import CitationsPanel from '@/components/CitationsPanel'
import CompliancePanel from '@/components/CompliancePanel'
import StatusBadge from '@/components/StatusBadge'
import clsx from 'clsx'

const TABS = [
  { id: 'draft',      label: 'Draft',       icon: <FileText size={14} /> },
  { id: 'icp',        label: 'ICP Score',   icon: <Target size={14} /> },
  { id: 'competitor', label: 'Competitors', icon: <Swords size={14} /> },
  { id: 'citations',  label: 'Citations',   icon: <BookOpen size={14} /> },
  { id: 'compliance', label: 'Compliance',  icon: <ShieldCheck size={14} /> },
]

const STAGE_META: Record<string, { label: string }> = {
  icp_scoring:       { label: 'ICP Scoring' },
  rag_retrieval:     { label: 'RAG Retrieval' },
  research:          { label: 'Web Research' },
  competitive_intel: { label: 'Competitor Intel' },
  signal_extraction: { label: 'Signal Extraction' },
  fallback_research: { label: 'Fallback Research' },
  persona_reasoning: { label: 'Persona Reasoning' },
  draft_generation:  { label: 'Draft Generation' },
  quality_scoring:   { label: 'Quality Scoring' },
  compliance:        { label: 'Compliance Check' },
  complete:          { label: 'Complete' },
}

export default function RunPage() {
  const { id } = useParams<{ id: string }>()
  const [events, setEvents] = useState<StageEvent[]>([])
  const [run, setRun] = useState<RunDetail | null>(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('draft')

  useEffect(() => {
    getRun(id).then((r) => {
      setRun(r)
      if (r.status !== 'running') {
        setEvents((r.stages ?? []) as StageEvent[])
        setDone(true)
        setLoading(false)
        return
      }
      setLoading(false)
      const cleanup = streamRun(
        id,
        (event) => {
          setEvents((prev) => {
            const idx = prev.findIndex((e) => e.stage === event.stage && e.status === 'running')
            if (idx >= 0) { const n = [...prev]; n[idx] = event; return n }
            return [...prev, event]
          })
          if (event.stage === 'complete' && event.data?.draft) {
            setRun((prev) => prev ? {
              ...prev,
              status: event.status as RunDetail['status'],
              draft: event.data!.draft as RunDetail['draft'],
              quality_score: event.data!.quality_score as number,
              quality_feedback: event.data!.quality_feedback as string,
              selected_hook: event.data!.selected_hook as RunDetail['selected_hook'],
              signals: event.data!.signals as RunDetail['signals'],
              ...(event.data as Record<string, unknown>),
            } : prev)
          }
        },
        () => { setDone(true); getRun(id).then(setRun).catch(() => {}) }
      )
      return cleanup
    }).catch(() => setLoading(false))
  }, [id])

  const icp = (run as unknown as Record<string, unknown>)?.icp_breakdown as Record<string, unknown> ?? {}
  const competitor = (run as unknown as Record<string, unknown>)?.competitor_intel as Record<string, unknown> ?? {}
  const citations = (run as unknown as Record<string, unknown>)?.citations as Array<{claim:string;source:string;url:string;date:string}> ?? []
  const compliance = (run as unknown as Record<string, unknown>)?.compliance as Record<string, string> ?? {}

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading run...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="btn-ghost flex items-center gap-2 text-sm">
            <ArrowLeft size={16} /> Back
          </Link>
          <div className="h-5 w-px bg-gray-200" />
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="min-w-0">
              <h1 className="font-semibold text-gray-900 truncate">{run?.prospect_name ?? 'Run'}</h1>
              <p className="text-xs text-gray-500 truncate">{run?.title} · {run?.company}</p>
            </div>
            {run && <StatusBadge status={run.status} />}
          </div>
          <div className="flex items-center gap-4">
            {icp.overall_score != null && (
              <div className="text-right">
                <div className="text-xs text-gray-400">ICP</div>
                <div className={clsx('font-bold text-sm',
                  (icp.overall_score as number) >= 65 ? 'text-green-600' : (icp.overall_score as number) >= 40 ? 'text-amber-600' : 'text-red-500')}>
                  {icp.overall_score as number}/100
                </div>
              </div>
            )}
            {run?.quality_score != null && (
              <div className="text-right">
                <div className="text-xs text-gray-400">Quality</div>
                <div className="font-bold text-gray-900 text-sm">{run.quality_score.toFixed(1)}/10</div>
              </div>
            )}
            {compliance.risk_level && (
              <div className="text-right">
                <div className="text-xs text-gray-400">Compliance</div>
                <div className={clsx('font-bold text-sm capitalize',
                  compliance.risk_level === 'low' ? 'text-green-600' :
                  compliance.risk_level === 'medium' ? 'text-amber-600' : 'text-red-600')}>
                  {compliance.risk_level as string}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left — Live run timeline (2/5 width) */}
          <div className="lg:col-span-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
              Agent Pipeline — {Object.keys(STAGE_META).length - 1} nodes
            </h2>
            <div className="card p-6">
              {events.length === 0 && !done && (
                <div className="flex items-center gap-3 text-gray-400 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  Initialising agent pipeline...
                </div>
              )}
              <StageTimeline events={events} />
            </div>
          </div>

          {/* Right — Tabbed output (3/5 width) */}
          <div className="lg:col-span-3">
            {/* Tabs */}
            <div className="flex gap-1 mb-4 bg-white border border-gray-200 rounded-xl p-1 w-fit">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  )}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div>
              {activeTab === 'draft' && (
                run?.draft ? (
                  <DraftOutput
                    draft={run.draft}
                    selectedHook={run.selected_hook ?? null}
                    personaAngle={(run as unknown as Record<string,unknown>).persona_angle as string ?? null}
                    qualityScore={run.quality_score ?? 0}
                    qualityFeedback={run.quality_feedback ?? ''}
                  />
                ) : done && run?.status === 'failed' ? (
                  <div className="card p-6 flex items-start gap-3">
                    <AlertTriangle size={18} className="text-red-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-800">Run failed</p>
                      <p className="text-sm text-gray-500 mt-1">Check the agent pipeline log on the left.</p>
                    </div>
                  </div>
                ) : (
                  <div className="card p-6 space-y-3">
                    {[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}
                    <p className="text-xs text-gray-400 text-center">Waiting for draft generation...</p>
                  </div>
                )
              )}

              {activeTab === 'icp' && (
                icp.overall_score != null
                  ? <ICPScorePanel icp={icp} />
                  : <div className="card p-6 text-center"><Target size={28} className="text-gray-200 mx-auto mb-2" /><p className="text-sm text-gray-400">ICP scoring in progress...</p></div>
              )}

              {activeTab === 'competitor' && <CompetitorIntelPanel intel={competitor} />}
              {activeTab === 'citations' && <CitationsPanel citations={citations} />}
              {activeTab === 'compliance' && (
                Object.keys(compliance).length > 0
                  ? <CompliancePanel compliance={compliance} />
                  : <div className="card p-6 text-center"><ShieldCheck size={28} className="text-gray-200 mx-auto mb-2" /><p className="text-sm text-gray-400">Compliance check in progress...</p></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
