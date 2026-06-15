from langgraph.graph import StateGraph, START, END

from agent.state import AgentState
from agent.nodes import (
    icp_scoring_node,
    rag_retrieval_node,
    research_node,
    competitive_intel_node,
    signal_extraction_node,
    fallback_research_node,
    persona_reasoning_node,
    draft_generation_node,
    quality_scoring_node,
    compliance_node as compliance_check_node,
)


def route_after_icp(state: AgentState) -> str:
    """Skip full pipeline if prospect is clearly out of ICP."""
    if state.get("icp_recommendation") == "skip":
        return "draft_generation"  # fast-track to a minimal draft with skip flag
    return "rag_retrieval"


def route_after_signals(state: AgentState) -> str:
    signals = state.get("signals", [])
    if not signals and state.get("research_retry_count", 0) < 1:
        return "fallback_research"
    return "persona_reasoning"


def route_after_quality(state: AgentState) -> str:
    score = state.get("quality_score", 0)
    retries = state.get("retry_count", 0)
    if score >= 7.0:
        return "compliance"
    if retries < 3:
        return "draft_generation"
    return "compliance"  # max retries — go to compliance anyway


def build_graph() -> StateGraph:
    graph = StateGraph(AgentState)

    graph.add_node("icp_scoring", icp_scoring_node)
    graph.add_node("rag_retrieval", rag_retrieval_node)
    graph.add_node("research", research_node)
    graph.add_node("competitive_intel", competitive_intel_node)
    graph.add_node("signal_extraction", signal_extraction_node)
    graph.add_node("fallback_research", fallback_research_node)
    graph.add_node("persona_reasoning", persona_reasoning_node)
    graph.add_node("draft_generation", draft_generation_node)
    graph.add_node("quality_scoring", quality_scoring_node)
    graph.add_node("compliance_check", compliance_check_node)

    graph.add_edge(START, "icp_scoring")
    graph.add_conditional_edges("icp_scoring", route_after_icp, {
        "rag_retrieval": "rag_retrieval",
        "draft_generation": "draft_generation",
    })
    graph.add_edge("rag_retrieval", "research")
    graph.add_edge("research", "competitive_intel")
    graph.add_edge("competitive_intel", "signal_extraction")
    graph.add_conditional_edges("signal_extraction", route_after_signals, {
        "fallback_research": "fallback_research",
        "persona_reasoning": "persona_reasoning",
    })
    graph.add_edge("fallback_research", "persona_reasoning")
    graph.add_edge("persona_reasoning", "draft_generation")
    graph.add_edge("draft_generation", "quality_scoring")
    graph.add_conditional_edges("quality_scoring", route_after_quality, {
        "compliance": "compliance_check",
        "draft_generation": "draft_generation",
    })
    graph.add_edge("compliance_check", END)

    return graph.compile()


compiled_graph = build_graph()
