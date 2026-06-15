from typing import TypedDict, List, Optional


class AgentState(TypedDict):
    # Input
    run_id: str
    prospect_name: str
    company: str
    title: str

    # ICP scoring
    icp_score: float
    icp_breakdown: dict        # {company_size, industry, title_fit, growth_signals, overall}
    icp_recommendation: str    # pursue | review | skip

    # RAG
    rag_context: str           # retrieved knowledge base context

    # Research
    raw_research: List[str]
    research_queries: List[str]

    # Competitive intelligence
    competitor_intel: dict     # {competitors_found, insight, competitive_hook}

    # Signals with citations
    signals: List[dict]        # each has: text, type, recency, relevance_score, source, citation_url
    selected_hook: Optional[dict]
    citations: List[dict]      # [{claim, source, url, date}]

    # Reasoning
    persona_angle: str

    # Draft
    draft: Optional[dict]
    quality_score: float
    quality_feedback: str

    # Compliance
    compliance: dict           # {passed, risk_level, issues, suggestions}

    # Control flow
    retry_count: int
    research_retry_count: int
    status: str
    error: Optional[str]

    # Streaming events
    events: List[dict]
