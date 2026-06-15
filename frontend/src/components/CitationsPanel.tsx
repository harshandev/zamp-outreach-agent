'use client'
import { ExternalLink, BookOpen } from 'lucide-react'

interface Citation { claim: string; source: string; url: string; date: string }

export default function CitationsPanel({ citations }: { citations: Citation[] }) {
  if (!citations?.length) {
    return (
      <div className="card p-6 text-center">
        <BookOpen size={28} className="text-gray-200 mx-auto mb-2" />
        <p className="text-sm text-gray-400">No citations — fallback/industry signals were used.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 animate-slide-up">
      <p className="text-xs text-gray-400">{citations.length} claim{citations.length > 1 ? 's' : ''} grounded in real sources</p>
      {citations.map((c, i) => (
        <div key={i} className="card p-4">
          <p className="text-sm font-medium text-gray-800 mb-2">"{c.claim}"</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="badge bg-blue-50 text-blue-700 border border-blue-100">{c.source}</span>
              {c.date && <span className="text-xs text-gray-400">{c.date}</span>}
            </div>
            {c.url && c.url.startsWith('http') && (
              <a href={c.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700">
                Source <ExternalLink size={11} />
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
