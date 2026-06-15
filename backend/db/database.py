from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, String, Float, DateTime, Text, JSON
from datetime import datetime, timezone
import uuid

from config import get_settings

settings = get_settings()
engine = create_async_engine(settings.database_url, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class RunRecord(Base):
    __tablename__ = "runs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    prospect_name = Column(String, nullable=False)
    title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    status = Column(String, default="running")
    quality_score = Column(Float, nullable=True)
    hook_type = Column(String, nullable=True)
    hook_summary = Column(String, nullable=True)
    icp_score = Column(Float, nullable=True)
    icp_breakdown = Column(JSON, nullable=True)
    icp_recommendation = Column(String, nullable=True)
    rag_context = Column(Text, nullable=True)
    signals = Column(JSON, nullable=True)
    selected_hook = Column(JSON, nullable=True)
    citations = Column(JSON, nullable=True)
    persona_angle = Column(Text, nullable=True)
    competitor_intel = Column(JSON, nullable=True)
    draft = Column(JSON, nullable=True)
    quality_feedback = Column(Text, nullable=True)
    compliance = Column(JSON, nullable=True)
    stages = Column(JSON, default=list)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
