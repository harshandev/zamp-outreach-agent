'use client'
import { useState } from 'react'
import { DraftOutput as Draft, Signal } from '@/lib/types'
import { Copy, Check, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import clsx from 'clsx'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="btn-ghost p-1.5 rounded-md">
      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
    </button>
  )
}

export default function DraftOutput({
  draft,
  selectedHook,
  personaAngle,
  qualityScore,
  qualityFeedback,
}: {
  draft: Draft
  selectedHook: Signal | null
  personaAngle: string | null
  qualityScore: number
  qualityFeedback: string
}) {
  const [activeSubject, setActiveSubject] = useState(0)
  const [showReasoning, setShowReasoning] = useState(false)

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Hook used */}
      {selectedHook && (
        <div className="card p-4 border-l-4 border-l-purple-400">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={14} className="text-purple-500" />
            <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Hook Used</span>
            <span className="badge bg-purple-50 text-purple-700 border border-purple-100 ml-auto">{selectedHook.type}</span>
          </div>
          <p className="text-sm text-gray-700 leading-snug">{selectedHook.text}</p>
          <p className="text-xs text-gray-400 mt-1">{selectedHook.recency} · {selectedHook.source}</p>
        </div>
      )}

      {/* Subject lines */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Subject Lines</h3>
          <span className="text-xs text-gray-400">{draft.subject_lines.length} variants</span>
        </div>
        <div className="space-y-2">
          {draft.subject_lines.map((subject, i) => (
            <div
              key={i}
              onClick={() => setActiveSubject(i)}
              className={clsx(
                'flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border',
                activeSubject === i
                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                  : 'bg-gray-50 border-transparent text-gray-700 hover:bg-gray-100'
              )}
            >
              <span className="text-sm font-medium">{subject}</span>
              <div className="flex items-center gap-2">
                {activeSubject === i && (
                  <span className="badge bg-blue-100 text-blue-700 border-0 text-xs">Selected</span>
                )}
                <CopyButton text={subject} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Email body */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Email Body</h3>
          <CopyButton text={`Subject: ${draft.subject_lines[activeSubject]}\n\n${draft.body}`} />
        </div>
        <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm text-gray-800 whitespace-pre-wrap leading-relaxed border border-gray-100">
          {draft.body}
        </div>
      </div>

      {/* Quality score */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">Quality Score</h3>
          <span className={clsx(
            'text-lg font-bold',
            qualityScore >= 8 ? 'text-green-600' : qualityScore >= 7 ? 'text-blue-600' : 'text-amber-600'
          )}>
            {qualityScore.toFixed(1)}<span className="text-sm font-normal text-gray-400">/10</span>
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
          <div
            className={clsx('h-2 rounded-full transition-all duration-500', qualityScore >= 7 ? 'bg-green-500' : 'bg-amber-400')}
            style={{ width: `${(qualityScore / 10) * 100}%` }}
          />
        </div>
        <p className="text-sm text-gray-600">{qualityFeedback}</p>
      </div>

      {/* Reasoning toggle */}
      <button
        onClick={() => setShowReasoning(!showReasoning)}
        className="w-full flex items-center justify-between p-3 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
      >
        <span>Why this draft was chosen</span>
        {showReasoning ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {showReasoning && (
        <div className="card p-4 bg-gray-50 animate-fade-in">
          {personaAngle && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Persona Analysis</p>
              <p className="text-sm text-gray-700">{personaAngle}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Draft Reasoning</p>
            <p className="text-sm text-gray-700">{draft.reasoning}</p>
          </div>
        </div>
      )}
    </div>
  )
}
