export type RunStatus = 'running' | 'completed' | 'failed' | 'low_confidence'

export type StageStatus = 'running' | 'completed' | 'failed'

export interface StageEvent {
  run_id: string
  stage: string
  status: StageStatus
  message: string
  data: Record<string, unknown>
  timestamp: string
}

export interface Signal {
  text: string
  type: string
  recency: string
  relevance_score: number
  source: string
}

export interface DraftOutput {
  subject_lines: string[]
  body: string
  reasoning: string
}

export interface RunSummary {
  id: string
  prospect_name: string
  title: string
  company: string
  status: RunStatus
  quality_score: number | null
  hook_type: string | null
  hook_summary: string | null
  created_at: string
  completed_at: string | null
}

export interface RunDetail extends RunSummary {
  signals: Signal[] | null
  selected_hook: Signal | null
  persona_angle: string | null
  draft: DraftOutput | null
  quality_feedback: string | null
  stages: StageEvent[] | null
}
