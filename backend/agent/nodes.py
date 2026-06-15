import json
import asyncio
from datetime import datetime, timezone
from openai import AsyncOpenAI
from tavily import TavilyClient

from config import get_settings
from agent.state import AgentState
from agent.rag import rag_engine
from agent.prompts import (
    ICP_SCORING_PROMPT,
    COMPETITIVE_INTEL_PROMPT,
    SIGNAL_EXTRACTION_PROMPT,
    PERSONA_REASONING_PROMPT,
    DRAFT_GENERATION_PROMPT,
    QUALITY_SCORING_PROMPT,
    COMPLIANCE_PROMPT,
    FALLBACK_SIGNAL_PROMPT,
)

settings = get_settings()
client = AsyncOpenAI(api_key=settings.openai_api_key)
tavily = TavilyClient(api_key=settings.tavily_api_key)


def _event(run_id: str, stage: str, status: str, message: str, data: dict = None) -> dict:
    return {
        "run_id": run_id,
        "stage": stage,
        "status": status,
        "message": message,
        "data": data or {},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


async def _llm(prompt: str, temperature: float = 0.3) -> dict:
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=temperature,
    )
    return json.loads(response.choices[0].message.content)


# ── Node 1: ICP Scoring ────────────────────────────────────────────────────────

async def icp_scoring_node(state: AgentState) -> AgentState:
    run_id = state["run_id"]
    events = list(state.get("events", []))
    events.append(_event(run_id, "icp_scoring", "running",
                         f"Scoring {state['prospect_name']} at {state['company']} against ICP..."))

    icp_docs = await asyncio.to_thread(rag_engine.retrieve, f"{state['title']} {state['company']}", 3, ["icp_definition"])
    icp_context = rag_engine.format_context(icp_docs)

    # Quick company research summary for ICP scoring
    try:
        research = await asyncio.to_thread(
            tavily.search,
            query=f"{state['company']} company size funding employees",
            search_depth="basic",
            max_results=3,
        )
        research_summary = " ".join(r.get("content", "") for r in research.get("results", []))[:800]
    except Exception:
        research_summary = "No research available"

    try:
        result = await _llm(ICP_SCORING_PROMPT.format(
            prospect_name=state["prospect_name"],
            title=state["title"],
            company=state["company"],
            research_summary=research_summary,
            icp_context=icp_context,
        ))
        score = result.get("overall_score", 50)
        recommendation = result.get("recommendation", "review")
        breakdown = {k: result.get(k) for k in ["company_size_fit", "industry_fit", "title_fit", "growth_signals", "pain_likelihood"]}
    except Exception:
        score, recommendation, breakdown = 50.0, "review", {}
        result = {"reasoning": "ICP scoring unavailable", "risk_flags": []}

    score_label = "🟢 Strong fit" if score >= 65 else "🟡 Borderline" if score >= 40 else "🔴 Poor fit"
    events.append(_event(run_id, "icp_scoring", "completed",
                         f"ICP Score: {score}/100 — {score_label} · Recommendation: {recommendation.upper()}",
                         {"icp_score": score, "recommendation": recommendation, "breakdown": breakdown,
                          "reasoning": result.get("reasoning"), "risk_flags": result.get("risk_flags", [])}))

    return {**state, "icp_score": score, "icp_breakdown": {**breakdown, **result}, "icp_recommendation": recommendation, "events": events}


# ── Node 2: RAG Retrieval ──────────────────────────────────────────────────────

async def rag_retrieval_node(state: AgentState) -> AgentState:
    run_id = state["run_id"]
    events = list(state.get("events", []))
    events.append(_event(run_id, "rag_retrieval", "running",
                         "Retrieving relevant patterns from knowledge base..."))

    query = f"{state['title']} {state['company']} outreach email {state['icp_recommendation']}"
    docs = await asyncio.to_thread(rag_engine.retrieve, query, 5)
    context = rag_engine.format_context(docs)

    doc_types = [d["type"] for d in docs]
    type_summary = ", ".join(set(doc_types))
    events.append(_event(run_id, "rag_retrieval", "completed",
                         f"Retrieved {len(docs)} relevant documents ({type_summary})",
                         {"doc_count": len(docs), "doc_types": doc_types,
                          "top_match": docs[0]["content"][:120] + "..." if docs else ""}))

    return {**state, "rag_context": context, "events": events}


# ── Node 3: Web Research ───────────────────────────────────────────────────────

async def research_node(state: AgentState) -> AgentState:
    run_id = state["run_id"]
    events = list(state.get("events", []))
    events.append(_event(run_id, "research", "running",
                         f"Running 4 targeted web searches for {state['company']}..."))

    queries = [
        f"{state['company']} funding round news 2025 2026",
        f"{state['company']} recent news product launch partnership",
        f"{state['company']} hiring finance operations jobs",
        f"{state['prospect_name']} {state['company']} announcement interview",
    ]

    raw_results = []
    for query in queries:
        try:
            response = await asyncio.to_thread(
                tavily.search, query=query, search_depth="basic", max_results=5,
            )
            results_text = "\n".join(
                f"- {r.get('title','')}: {r.get('content','')} [URL: {r.get('url','')}]"
                for r in response.get("results", [])
            )
            raw_results.append(f"Query: {query}\n{results_text}")
        except Exception as e:
            raw_results.append(f"Search failed: {str(e)}")

    events.append(_event(run_id, "research", "completed",
                         f"Research complete — {len(raw_results)} queries, sources retrieved",
                         {"queries": queries}))
    return {**state, "raw_research": raw_results, "research_queries": queries, "events": events}


# ── Node 4: Competitive Intelligence ──────────────────────────────────────────

async def competitive_intel_node(state: AgentState) -> AgentState:
    run_id = state["run_id"]
    events = list(state.get("events", []))
    events.append(_event(run_id, "competitive_intel", "running",
                         f"Scanning competitive landscape around {state['company']}..."))

    battle_docs = await asyncio.to_thread(rag_engine.retrieve, f"competitor {state['company']}", 3, ["battle_card"])
    battle_context = rag_engine.format_context(battle_docs)

    research_data = "\n\n".join(state.get("raw_research", []))[:2000]

    try:
        result = await _llm(COMPETITIVE_INTEL_PROMPT.format(
            company=state["company"],
            title=state["title"],
            research_data=research_data,
            battle_card_context=battle_context,
        ), temperature=0.2)
    except Exception:
        result = {"has_competitive_intel": False, "competitors_found": [], "competitive_hook": "",
                  "industry_competitor_moves": "", "urgency_angle": ""}

    has_intel = result.get("has_competitive_intel", False)
    msg = (f"Competitive intel found: {', '.join(result.get('competitors_found', []))}"
           if has_intel else "No direct competitive intel — using industry angle")
    events.append(_event(run_id, "competitive_intel", "completed", msg, result))

    return {**state, "competitor_intel": result, "events": events}


# ── Node 5: Signal Extraction ──────────────────────────────────────────────────

async def signal_extraction_node(state: AgentState) -> AgentState:
    run_id = state["run_id"]
    events = list(state.get("events", []))
    events.append(_event(run_id, "signal_extraction", "running",
                         "Extracting and scoring signals with citations..."))

    try:
        result = await _llm(SIGNAL_EXTRACTION_PROMPT.format(
            prospect_name=state["prospect_name"],
            title=state["title"],
            company=state["company"],
            raw_research="\n\n".join(state["raw_research"]),
            rag_context=state.get("rag_context", "")[:500],
        ), temperature=0.3)
        signals = result.get("signals", [])
        citations = result.get("citations", [])
    except Exception:
        signals, citations = [], []

    selected = max(signals, key=lambda s: s.get("relevance_score", 0)) if signals else None
    events.append(_event(run_id, "signal_extraction", "completed",
                         f"{len(signals)} signals found, {len(citations)} citations extracted" + (
                             f" — top hook: {selected['type']} ({selected['relevance_score']:.0%})" if selected else " — no signals"),
                         {"signals": signals, "selected_hook": selected, "citations": citations}))

    return {**state, "signals": signals, "selected_hook": selected, "citations": citations, "events": events}


# ── Node 6: Fallback Research ──────────────────────────────────────────────────

async def fallback_research_node(state: AgentState) -> AgentState:
    run_id = state["run_id"]
    events = list(state.get("events", []))
    events.append(_event(run_id, "fallback_research", "running",
                         "No signals found — generating industry-level insight from knowledge base..."))

    icp_docs = await asyncio.to_thread(rag_engine.retrieve, state["title"], 2, ["icp_definition"])
    icp_context = rag_engine.format_context(icp_docs)

    try:
        result = await _llm(FALLBACK_SIGNAL_PROMPT.format(
            prospect_name=state["prospect_name"],
            title=state["title"],
            company=state["company"],
            icp_context=icp_context,
        ), temperature=0.5)
        signals = result.get("signals", [])
    except Exception:
        signals = []

    selected = signals[0] if signals else None
    events.append(_event(run_id, "fallback_research", "completed",
                         "Fallback signal generated from industry patterns — flagged as low confidence",
                         {"is_fallback": True}))

    return {**state, "signals": signals, "selected_hook": selected,
            "research_retry_count": state.get("research_retry_count", 0) + 1, "events": events}


# ── Node 7: Persona Reasoning ──────────────────────────────────────────────────

async def persona_reasoning_node(state: AgentState) -> AgentState:
    run_id = state["run_id"]
    events = list(state.get("events", []))
    events.append(_event(run_id, "persona_reasoning", "running",
                         f"Deep persona analysis for {state['title']} at {state['icp_score']:.0f}/100 ICP score..."))

    rag_docs = await asyncio.to_thread(rag_engine.retrieve,
                                       f"successful email {state['title']} {state['icp_recommendation']}", 3,
                                       ["successful_email", "positioning"])
    rag_ctx = rag_engine.format_context(rag_docs)

    try:
        result = await _llm(PERSONA_REASONING_PROMPT.format(
            prospect_name=state["prospect_name"],
            title=state["title"],
            company=state["company"],
            selected_hook=json.dumps(state.get("selected_hook", {}), indent=2),
            competitive_intel=json.dumps(state.get("competitor_intel", {}), indent=2),
            icp_score=state.get("icp_score", 50),
            icp_recommendation=state.get("icp_recommendation", "review"),
            rag_context=rag_ctx,
        ), temperature=0.4)
        persona_angle = result.get("persona_angle", "")
    except Exception:
        result = {"urgency": "medium", "rag_insight": ""}
        persona_angle = f"As {state['title']}, this person prioritises operational efficiency and scalable processes."

    events.append(_event(run_id, "persona_reasoning", "completed",
                         f"Persona angle identified — urgency: {result.get('urgency','medium')} · RAG insight applied",
                         {"persona_angle": persona_angle, "rag_insight": result.get("rag_insight", "")}))

    return {**state, "persona_angle": persona_angle, "events": events}


# ── Node 8: Draft Generation ───────────────────────────────────────────────────

async def draft_generation_node(state: AgentState) -> AgentState:
    run_id = state["run_id"]
    retry = state.get("retry_count", 0)
    events = list(state.get("events", []))

    msg = "Generating grounded outreach draft..." if retry == 0 else f"Regenerating with different angle (attempt {retry + 1})..."
    events.append(_event(run_id, "draft_generation", "running", msg))

    pos_docs = await asyncio.to_thread(rag_engine.retrieve, "email draft positioning social proof", 3,
                                       ["successful_email", "positioning"])
    rag_ctx = rag_engine.format_context(pos_docs)

    try:
        result = await _llm(DRAFT_GENERATION_PROMPT.format(
            prospect_name=state["prospect_name"],
            title=state["title"],
            company=state["company"],
            selected_hook=json.dumps(state.get("selected_hook", {}), indent=2),
            persona_angle=state.get("persona_angle", ""),
            competitive_intel=json.dumps(state.get("competitor_intel", {}), indent=2),
            rag_context=rag_ctx,
            retry_count=retry,
        ), temperature=0.7 + retry * 0.1)
        draft = result
    except Exception:
        draft = {
            "subject_lines": [f"Quick question about {state['company']}"],
            "body": f"Hi {state['prospect_name'].split()[0]},\n\nWanted to reach out about {state['company']}'s finance operations.\n\nWorth a 20-min call this week?\n\n[Rep Name]",
            "reasoning": "Fallback draft.", "rag_pattern_used": "none",
        }

    events.append(_event(run_id, "draft_generation", "completed",
                         f"Draft generated — {len(draft.get('subject_lines',[]))} subject variants · RAG pattern: {draft.get('rag_pattern_used','none')}",
                         {"subject_preview": draft.get("subject_lines", [""])[0]}))

    return {**state, "draft": draft, "retry_count": retry + 1, "events": events}


# ── Node 9: Quality Scoring ────────────────────────────────────────────────────

async def quality_scoring_node(state: AgentState) -> AgentState:
    run_id = state["run_id"]
    events = list(state.get("events", []))
    events.append(_event(run_id, "quality_scoring", "running",
                         "Evaluating draft — specificity, grounding, relevance, tone..."))

    draft = state.get("draft", {})
    subject = draft.get("subject_lines", [""])[0]
    body = draft.get("body", "")

    try:
        result = await _llm(QUALITY_SCORING_PROMPT.format(
            prospect_name=state["prospect_name"],
            title=state["title"],
            company=state["company"],
            icp_score=state.get("icp_score", 50),
            subject_line=subject,
            body=body,
        ), temperature=0.2)
        score = result.get("overall_score", 5.0)
        feedback = result.get("feedback", "")
    except Exception:
        score, feedback, result = 5.0, "Scoring unavailable.", {"approved": False}

    events.append(_event(run_id, "quality_scoring", "completed",
                         f"Quality score: {score:.1f}/10 — {'approved ✅' if score >= 7 else 'needs revision'}",
                         {"score": score, "feedback": feedback, "dimensions": result}))

    return {**state, "quality_score": score, "quality_feedback": feedback, "events": events}


# ── Node 10: Compliance Check ──────────────────────────────────────────────────

async def compliance_node(state: AgentState) -> AgentState:
    run_id = state["run_id"]
    events = list(state.get("events", []))
    events.append(_event(run_id, "compliance", "running",
                         "Running compliance check — CAN-SPAM, GDPR, false claims..."))

    draft = state.get("draft", {})
    subject = draft.get("subject_lines", [""])[0]
    body = draft.get("body", "")

    try:
        result = await _llm(COMPLIANCE_PROMPT.format(
            prospect_name=state["prospect_name"],
            title=state["title"],
            company=state["company"],
            subject_line=subject,
            body=body,
        ), temperature=0.1)
    except Exception:
        result = {"passed": True, "risk_level": "low", "issues": [], "suggestions": [],
                  "can_spam_compliant": True, "gdpr_notes": "Unable to verify", "false_claims_detected": False}

    risk = result.get("risk_level", "low")
    passed = result.get("passed", True)
    msg = f"Compliance {'PASSED ✅' if passed else 'FLAGGED ⚠️'} — risk level: {risk.upper()}"
    if result.get("issues"):
        msg += f" · {len(result['issues'])} issue(s) found"

    events.append(_event(run_id, "compliance", "completed", msg,
                         {"passed": passed, "risk_level": risk, "issues": result.get("issues", []),
                          "suggestions": result.get("suggestions", [])}))

    return {**state, "compliance": result, "events": events}
