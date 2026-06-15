import json
import uuid
import asyncio
from datetime import datetime, timezone
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from config import get_settings
from db.database import init_db, get_db, RunRecord
from models.schemas import ProspectRequest, RunSummary, RunDetail
from agent.graph import compiled_graph
from agent.state import AgentState

settings = get_settings()

app = FastAPI(title="Zamp Outreach Agent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await init_db()


@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.post("/api/runs", response_model=dict)
async def create_run(request: ProspectRequest, db: AsyncSession = Depends(get_db)):
    run_id = str(uuid.uuid4())
    record = RunRecord(
        id=run_id,
        prospect_name=request.prospect_name,
        title=request.title,
        company=request.company,
        status="running",
        stages=[],
    )
    db.add(record)
    await db.commit()
    return {"run_id": run_id}


@app.get("/api/runs/{run_id}/stream")
async def stream_run(run_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(RunRecord).where(RunRecord.id == run_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Run not found")

    initial_state: AgentState = {
        "run_id": run_id,
        "prospect_name": record.prospect_name,
        "company": record.company,
        "title": record.title,
        "icp_score": 0.0,
        "icp_breakdown": {},
        "icp_recommendation": "review",
        "rag_context": "",
        "raw_research": [],
        "research_queries": [],
        "competitor_intel": {},
        "signals": [],
        "selected_hook": None,
        "citations": [],
        "persona_angle": "",
        "draft": None,
        "quality_score": 0.0,
        "quality_feedback": "",
        "compliance": {},
        "retry_count": 0,
        "research_retry_count": 0,
        "status": "running",
        "error": None,
        "events": [],
    }

    async def event_stream() -> AsyncGenerator[str, None]:
        seen_event_count = 0
        final_state = None

        try:
            async for chunk in compiled_graph.astream(initial_state):
                for node_name, node_state in chunk.items():
                    events = node_state.get("events", [])
                    new_events = events[seen_event_count:]
                    seen_event_count = len(events)

                    for event in new_events:
                        yield f"data: {json.dumps(event)}\n\n"
                        await asyncio.sleep(0)

                    final_state = node_state

            # Persist final state to DB
            if final_state:
                score = final_state.get("quality_score", 0)
                hook = final_state.get("selected_hook") or {}
                status = "completed"
                if score < 7.0:
                    status = "low_confidence"
                if not final_state.get("draft"):
                    status = "failed"

                await db.execute(
                    RunRecord.__table__.update()
                    .where(RunRecord.id == run_id)
                    .values(
                        status=status,
                        quality_score=score,
                        hook_type=hook.get("type"),
                        hook_summary=hook.get("text", "")[:200],
                        icp_score=final_state.get("icp_score"),
                        icp_breakdown=final_state.get("icp_breakdown"),
                        icp_recommendation=final_state.get("icp_recommendation"),
                        rag_context=final_state.get("rag_context", "")[:2000],
                        signals=final_state.get("signals"),
                        selected_hook=final_state.get("selected_hook"),
                        citations=final_state.get("citations"),
                        persona_angle=final_state.get("persona_angle"),
                        competitor_intel=final_state.get("competitor_intel"),
                        draft=final_state.get("draft"),
                        quality_feedback=final_state.get("quality_feedback"),
                        compliance=final_state.get("compliance"),
                        stages=final_state.get("events", []),
                        completed_at=datetime.now(timezone.utc),
                    )
                )
                await db.commit()

                done_event = {
                    "run_id": run_id,
                    "stage": "complete",
                    "status": status,
                    "message": f"Run complete — quality score {score:.1f}/10",
                    "data": {
                        "draft": final_state.get("draft"),
                        "quality_score": score,
                        "quality_feedback": final_state.get("quality_feedback"),
                        "selected_hook": final_state.get("selected_hook"),
                        "signals": final_state.get("signals"),
                        "icp_breakdown": final_state.get("icp_breakdown"),
                        "icp_score": final_state.get("icp_score"),
                        "icp_recommendation": final_state.get("icp_recommendation"),
                        "competitor_intel": final_state.get("competitor_intel"),
                        "citations": final_state.get("citations"),
                        "compliance": final_state.get("compliance"),
                        "persona_angle": final_state.get("persona_angle"),
                    },
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
                yield f"data: {json.dumps(done_event)}\n\n"

        except Exception as e:
            error_event = {
                "run_id": run_id,
                "stage": "error",
                "status": "failed",
                "message": f"Agent error: {str(e)}",
                "data": {},
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            yield f"data: {json.dumps(error_event)}\n\n"

            await db.execute(
                RunRecord.__table__.update()
                .where(RunRecord.id == run_id)
                .values(status="failed", completed_at=datetime.now(timezone.utc))
            )
            await db.commit()

        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/runs", response_model=list[RunSummary])
async def list_runs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(RunRecord).order_by(desc(RunRecord.created_at)).limit(50)
    )
    records = result.scalars().all()
    return [
        RunSummary(
            id=r.id,
            prospect_name=r.prospect_name,
            title=r.title,
            company=r.company,
            status=r.status,
            quality_score=r.quality_score,
            hook_type=r.hook_type,
            hook_summary=r.hook_summary,
            created_at=r.created_at.isoformat() if r.created_at else "",
            completed_at=r.completed_at.isoformat() if r.completed_at else None,
        )
        for r in records
    ]


@app.get("/api/runs/{run_id}", response_model=RunDetail)
async def get_run(run_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(RunRecord).where(RunRecord.id == run_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Run not found")

    return RunDetail(
        id=record.id,
        prospect_name=record.prospect_name,
        title=record.title,
        company=record.company,
        status=record.status,
        quality_score=record.quality_score,
        hook_type=record.hook_type,
        hook_summary=record.hook_summary,
        icp_score=record.icp_score,
        icp_breakdown=record.icp_breakdown,
        icp_recommendation=record.icp_recommendation,
        signals=record.signals,
        selected_hook=record.selected_hook,
        citations=record.citations,
        persona_angle=record.persona_angle,
        competitor_intel=record.competitor_intel,
        draft=record.draft,
        quality_feedback=record.quality_feedback,
        compliance=record.compliance,
        stages=record.stages,
        created_at=record.created_at.isoformat() if record.created_at else "",
        completed_at=record.completed_at.isoformat() if record.completed_at else None,
    )


@app.delete("/api/runs/{run_id}")
async def delete_run(run_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(RunRecord).where(RunRecord.id == run_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Run not found")
    await db.delete(record)
    await db.commit()
    return {"deleted": True}
