'use client'
import { RunStatus } from '@/lib/types'
import clsx from 'clsx'

const config: Record<RunStatus, { label: string; classes: string; dot: string }> = {
  running:        { label: 'Running',        classes: 'bg-blue-50 text-blue-700 border border-blue-200',   dot: 'bg-blue-500 animate-pulse' },
  completed:      { label: 'Completed',      classes: 'bg-green-50 text-green-700 border border-green-200', dot: 'bg-green-500' },
  low_confidence: { label: 'Low Confidence', classes: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-500' },
  failed:         { label: 'Failed',         classes: 'bg-red-50 text-red-700 border border-red-200',       dot: 'bg-red-500' },
}

export default function StatusBadge({ status }: { status: RunStatus }) {
  const c = config[status] ?? config.failed
  return (
    <span className={clsx('badge', c.classes)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', c.dot)} />
      {c.label}
    </span>
  )
}
