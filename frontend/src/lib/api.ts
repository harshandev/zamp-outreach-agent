import { RunSummary, RunDetail, StageEvent } from './types'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function createRun(data: { prospect_name: string; title: string; company: string }): Promise<{ run_id: string }> {
  const res = await fetch(`${API}/api/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create run')
  return res.json()
}

export async function getRuns(): Promise<RunSummary[]> {
  const res = await fetch(`${API}/api/runs`)
  if (!res.ok) throw new Error('Failed to fetch runs')
  return res.json()
}

export async function getRun(id: string): Promise<RunDetail> {
  const res = await fetch(`${API}/api/runs/${id}`)
  if (!res.ok) throw new Error('Run not found')
  return res.json()
}

export async function deleteRun(id: string): Promise<void> {
  await fetch(`${API}/api/runs/${id}`, { method: 'DELETE' })
}

export function streamRun(runId: string, onEvent: (event: StageEvent) => void, onDone: () => void): () => void {
  const es = new EventSource(`${API}/api/runs/${runId}/stream`)

  es.onmessage = (e) => {
    if (e.data === '[DONE]') {
      es.close()
      onDone()
      return
    }
    try {
      const event: StageEvent = JSON.parse(e.data)
      onEvent(event)
    } catch {}
  }

  es.onerror = () => {
    es.close()
    onDone()
  }

  return () => es.close()
}
