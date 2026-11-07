from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from kerf.auth.router import router as auth_router
from kerf.config import settings
from kerf.db.session import init_db
from kerf.queue import enqueue_job
from kerf.routes.projects import router as projects_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Ensure database schema on startup
    await init_db()
    yield


app = FastAPI(
    title="Kerf API",
    version="0.1.0",
    docs_url="/docs",
    openapi_url="/v1/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/v1")
app.include_router(projects_router, prefix="/v1")


@app.get("/health")
@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok", "app": "kerf-api"}


@app.post("/health/worker-smoke")
async def worker_smoke() -> dict[str, Any]:
    if not settings.TESTING:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Endpoint available only in test environment",
        )
    job = await enqueue_job("noop_job")
    return {"status": "enqueued", "job_id": job.job_id if job else None}
