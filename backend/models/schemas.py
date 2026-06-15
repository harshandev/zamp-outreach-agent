from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class ProspectRequest(BaseModel):
    prospect_name: str
    title: str
    company: str


class Signal(BaseModel):
    text: str
    type: str  # funding | hiring | news | product | competitive
    recency: str
    relevance_score: float
    source: str


class DraftOutput(BaseModel):
    subject_lines: List[str]
    body: str
    reasoning: str


class StageEvent(BaseModel):
    run_id: str
    stage: str
    status: str  # running | completed | failed
    message: str
    data: Optional[dict] = None
    timestamp: str


class RunSummary(BaseModel):
    id: str
    prospect_name: str
    title: str
    company: str
    status: str  # running | completed | failed | low_confidence
    quality_score: Optional[float] = None
    hook_type: Optional[str] = None
    hook_summary: Optional[str] = None
    created_at: str
    completed_at: Optional[str] = None


class RunDetail(RunSummary):
    icp_score: Optional[float] = None
    icp_breakdown: Optional[dict] = None
    icp_recommendation: Optional[str] = None
    signals: Optional[List[dict]] = None
    selected_hook: Optional[dict] = None
    citations: Optional[List[dict]] = None
    persona_angle: Optional[str] = None
    competitor_intel: Optional[dict] = None
    draft: Optional[dict] = None
    quality_feedback: Optional[str] = None
    compliance: Optional[dict] = None
    stages: Optional[List[dict]] = None
