import os
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware

from app.db import create_pool, db_health_check
from app.models import (
    AnalyticsSummary,
    DatasetDetail,
    DatasetMetric,
    DatasetOut,
    FeedbackCreate,
    FeedbackOut,
    HeatmapPoint,
    IssueCategory,
    PantryCreate,
    PantryOut,
    ReportCreate,
    ReportOut,
    ResourceType,
    SupplyProfileOut,
    TrendPoint,
)

load_dotenv()


def _parse_cors_origins() -> list[str]:
    raw = (os.getenv("CORS_ORIGINS") or "").strip()
    if not raw:
        return []
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pool = await create_pool()
    yield
    await app.state.pool.close()


app = FastAPI(title="Food Access Insights API", version="0.2.0", lifespan=lifespan)

origins = _parse_cors_origins()
if origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


def _build_filters(
    pantry_id: str | None,
    neighborhood: str | None,
    resource_type: ResourceType | None,
    from_: datetime | None,
    to: datetime | None,
) -> tuple[str, list[Any]]:
    where = []
    values: list[Any] = []
    if pantry_id:
        values.append(pantry_id)
        where.append(f"f.pantry_id = ${len(values)}")
    if neighborhood:
        values.append(neighborhood)
        where.append(f"p.neighborhood = ${len(values)}")
    if resource_type:
        values.append(resource_type)
        where.append(f"f.resource_type = ${len(values)}")
    if from_:
        values.append(from_)
        where.append(f"f.created_at >= ${len(values)}")
    if to:
        values.append(to)
        where.append(f"f.created_at <= ${len(values)}")
    where_sql = f"where {' and '.join(where)}" if where else ""
    return where_sql, values


@app.get("/health")
async def health(request: Request) -> dict:
    try:
        ok = await db_health_check(request.app.state.pool)
        if not ok:
            return {"status": "degraded", "db": "error"}
        return {"status": "ok", "db": "ok"}
    except Exception as exc:
        return {"status": "degraded", "db": "error", "detail": str(exc)}


@app.post("/pantries", response_model=PantryOut)
async def create_pantry(request: Request, payload: PantryCreate) -> PantryOut:
    query = """
        insert into pantries (
            name,
            neighborhood,
            address,
            latitude,
            longitude
        )
        values ($1,$2,$3,$4,$5)
        returning *
    """
    async with request.app.state.pool.acquire() as conn:
        row = await conn.fetchrow(
            query,
            payload.name,
            payload.neighborhood,
            payload.address,
            payload.latitude,
            payload.longitude,
        )
    return PantryOut(**dict(row))


@app.get("/pantries", response_model=list[PantryOut])
async def list_pantries(
    request: Request,
    neighborhood: str | None = None,
) -> list[PantryOut]:
    where = ""
    values: list[Any] = []
    if neighborhood:
        values.append(neighborhood)
        where = f"where neighborhood = ${len(values)}"
    query = f"""
        select *
        from pantries
        {where}
        order by name
    """
    async with request.app.state.pool.acquire() as conn:
        rows = await conn.fetch(query, *values)
    return [PantryOut(**dict(row)) for row in rows]


@app.get("/pantries/{pantry_id}", response_model=PantryOut)
async def get_pantry(request: Request, pantry_id: str) -> PantryOut:
    query = "select * from pantries where id = $1"
    async with request.app.state.pool.acquire() as conn:
        row = await conn.fetchrow(query, pantry_id)
    if not row:
        raise HTTPException(status_code=404, detail="Pantry not found")
    return PantryOut(**dict(row))


@app.post("/feedback", response_model=FeedbackOut)
async def create_feedback(request: Request, payload: FeedbackCreate) -> FeedbackOut:
    query = """
        insert into feedback (
            pantry_id,
            rating,
            wait_time_min,
            resource_type,
            items_unavailable,
            comment,
            issue_categories,
            raw_payload,
            created_at
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8, coalesce($9, now()))
        returning *
    """
    async with request.app.state.pool.acquire() as conn:
        row = await conn.fetchrow(
            query,
            payload.pantry_id,
            payload.rating,
            payload.wait_time_min,
            payload.resource_type,
            payload.items_unavailable,
            payload.comment,
            payload.issue_categories,
            payload.raw_payload,
            payload.created_at,
        )
        pantry = await conn.fetchrow(
            "select name, neighborhood from pantries where id = $1",
            payload.pantry_id,
        )
    if not pantry:
        raise HTTPException(status_code=400, detail="Pantry not found")
    return FeedbackOut(
        **dict(row),
        pantry_name=pantry["name"],
        pantry_neighborhood=pantry["neighborhood"],
    )


@app.get("/feedback", response_model=list[FeedbackOut])
async def list_feedback(
    request: Request,
    pantry_id: str | None = None,
    neighborhood: str | None = None,
    resource_type: ResourceType | None = None,
    from_: datetime | None = Query(None, alias="from"),
    to: datetime | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[FeedbackOut]:
    where_sql, values = _build_filters(
        pantry_id=pantry_id,
        neighborhood=neighborhood,
        resource_type=resource_type,
        from_=from_,
        to=to,
    )
    values.extend([limit, offset])
    query = f"""
        select
            f.*,
            p.name as pantry_name,
            p.neighborhood as pantry_neighborhood
        from feedback f
        join pantries p on p.id = f.pantry_id
        {where_sql}
        order by f.created_at desc
        limit ${len(values) - 1}
        offset ${len(values)}
    """
    async with request.app.state.pool.acquire() as conn:
        rows = await conn.fetch(query, *values)
    return [FeedbackOut(**dict(row)) for row in rows]


@app.get("/analytics/summary", response_model=AnalyticsSummary)
async def analytics_summary(
    request: Request,
    pantry_id: str | None = None,
    neighborhood: str | None = None,
    resource_type: ResourceType | None = None,
    from_: datetime | None = Query(None, alias="from"),
    to: datetime | None = Query(None),
) -> AnalyticsSummary:
    where_sql, values = _build_filters(
        pantry_id=pantry_id,
        neighborhood=neighborhood,
        resource_type=resource_type,
        from_=from_,
        to=to,
    )
    summary_query = f"""
        select
            count(*) as total_feedback,
            avg(f.rating) as avg_rating,
            avg(f.wait_time_min) as avg_wait_time_min
        from feedback f
        join pantries p on p.id = f.pantry_id
        {where_sql}
    """
    by_resource_query = f"""
        select f.resource_type, count(*) as count
        from feedback f
        join pantries p on p.id = f.pantry_id
        {where_sql}
        group by f.resource_type
    """
    async with request.app.state.pool.acquire() as conn:
        summary = await conn.fetchrow(summary_query, *values)
        by_resource = await conn.fetch(by_resource_query, *values)
    feedback_by_resource = {r["resource_type"]: r["count"] for r in by_resource}
    return AnalyticsSummary(
        total_feedback=summary["total_feedback"] or 0,
        avg_rating=summary["avg_rating"],
        avg_wait_time_min=summary["avg_wait_time_min"],
        feedback_by_resource_type=feedback_by_resource,
    )


@app.get("/analytics/issues", response_model=list[IssueCategory])
async def analytics_issues(
    request: Request,
    pantry_id: str | None = None,
    neighborhood: str | None = None,
    resource_type: ResourceType | None = None,
    from_: datetime | None = Query(None, alias="from"),
    to: datetime | None = Query(None),
) -> list[IssueCategory]:
    where_sql, values = _build_filters(
        pantry_id=pantry_id,
        neighborhood=neighborhood,
        resource_type=resource_type,
        from_=from_,
        to=to,
    )
    json_query = f"""
        select issue, count(*) as count
        from (
            select jsonb_array_elements_text(f.issue_categories) as issue
            from feedback f
            join pantries p on p.id = f.pantry_id
            {where_sql}
            and f.issue_categories is not null
        ) as issues
        group by issue
    """
    async with request.app.state.pool.acquire() as conn:
        rows = await conn.fetch(json_query, *values)
        if rows:
            return [IssueCategory(issue=r["issue"], count=r["count"]) for r in rows]

        fallback_query = f"""
            select comment, items_unavailable
            from feedback f
            join pantries p on p.id = f.pantry_id
            {where_sql}
        """
        fallback_rows = await conn.fetch(fallback_query, *values)
    issue_map = {
        "long_wait_times": ["long wait", "waiting", "line", "queue"],
        "inventory_shortages": ["out of stock", "shortage", "missing", "unavailable"],
        "service_disruptions": ["closed", "cancelled", "canceled", "rescheduled"],
        "access_barriers": ["transport", "bus", "car", "distance", "far"],
    }
    counts = {key: 0 for key in issue_map}
    for row in fallback_rows:
        text = " ".join([row["comment"] or "", row["items_unavailable"] or ""]).lower()
        for issue, keywords in issue_map.items():
            if any(k in text for k in keywords):
                counts[issue] += 1
    return [
        IssueCategory(issue=issue, count=count)
        for issue, count in counts.items()
        if count > 0
    ]


@app.get("/analytics/trends", response_model=list[TrendPoint])
async def analytics_trends(
    request: Request,
    pantry_id: str | None = None,
    neighborhood: str | None = None,
    resource_type: ResourceType | None = None,
    from_: datetime | None = Query(None, alias="from"),
    to: datetime | None = Query(None),
    interval: str = Query("day", pattern="^(day|week|month)$"),
) -> list[TrendPoint]:
    where_sql, values = _build_filters(
        pantry_id=pantry_id,
        neighborhood=neighborhood,
        resource_type=resource_type,
        from_=from_,
        to=to,
    )
    query = f"""
        select
            date_trunc('{interval}', f.created_at) as bucket,
            count(*) as total_feedback,
            avg(f.rating) as avg_rating,
            avg(f.wait_time_min) as avg_wait_time_min
        from feedback f
        join pantries p on p.id = f.pantry_id
        {where_sql}
        group by bucket
        order by bucket
    """
    async with request.app.state.pool.acquire() as conn:
        rows = await conn.fetch(query, *values)
    return [TrendPoint(**dict(row)) for row in rows]


@app.get("/analytics/heatmap", response_model=list[HeatmapPoint])
async def analytics_heatmap(
    request: Request,
    pantry_id: str | None = None,
    neighborhood: str | None = None,
    resource_type: ResourceType | None = None,
    from_: datetime | None = Query(None, alias="from"),
    to: datetime | None = Query(None),
) -> list[HeatmapPoint]:
    where_sql, values = _build_filters(
        pantry_id=pantry_id,
        neighborhood=neighborhood,
        resource_type=resource_type,
        from_=from_,
        to=to,
    )
    query = f"""
        select
            p.id as pantry_id,
            p.name as pantry_name,
            p.neighborhood,
            p.latitude,
            p.longitude,
            count(f.id) as total_feedback
        from feedback f
        join pantries p on p.id = f.pantry_id
        {where_sql}
        group by p.id, p.name, p.neighborhood, p.latitude, p.longitude
        order by total_feedback desc
    """
    async with request.app.state.pool.acquire() as conn:
        rows = await conn.fetch(query, *values)
    return [HeatmapPoint(**dict(row)) for row in rows]


@app.get("/pantries/{pantry_id}/supply", response_model=SupplyProfileOut)
async def pantry_supply(request: Request, pantry_id: str) -> SupplyProfileOut:
    query = """
        select pantry_id, normalized_foods, category_distribution, updated_at
        from supply_profiles
        where pantry_id = $1
    """
    async with request.app.state.pool.acquire() as conn:
        row = await conn.fetchrow(query, pantry_id)
    if not row:
        raise HTTPException(status_code=404, detail="Supply profile not found")
    return SupplyProfileOut(**dict(row))


@app.get("/datasets", response_model=list[DatasetOut])
async def list_datasets(request: Request) -> list[DatasetOut]:
    query = "select * from public_datasets order by ingested_at desc"
    async with request.app.state.pool.acquire() as conn:
        rows = await conn.fetch(query)
    return [DatasetOut(**dict(row)) for row in rows]


@app.get("/datasets/{dataset_id}", response_model=DatasetDetail)
async def get_dataset(
    request: Request,
    dataset_id: str,
    geo_unit_id: str | None = None,
    limit: int = Query(100, ge=1, le=1000),
) -> DatasetDetail:
    dataset_query = "select * from public_datasets where id = $1"
    metrics_where = "where dataset_id = $1"
    values: list[Any] = [dataset_id]
    if geo_unit_id:
        values.append(geo_unit_id)
        metrics_where += f" and geo_unit_id = ${len(values)}"
    metrics_query = f"""
        select geo_unit_id, metrics, recorded_at
        from public_dataset_metrics
        {metrics_where}
        order by recorded_at desc
        limit ${len(values) + 1}
    """
    values.append(limit)
    async with request.app.state.pool.acquire() as conn:
        dataset = await conn.fetchrow(dataset_query, dataset_id)
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        metrics = await conn.fetch(metrics_query, *values)
    return DatasetDetail(
        dataset=DatasetOut(**dict(dataset)),
        metrics=[DatasetMetric(**dict(row)) for row in metrics],
    )


@app.post("/reports", response_model=ReportOut)
async def create_report(request: Request, payload: ReportCreate) -> ReportOut:
    query = """
        insert into reports (title, filters)
        values ($1, $2)
        returning *
    """
    async with request.app.state.pool.acquire() as conn:
        row = await conn.fetchrow(query, payload.title, payload.filters)
    return ReportOut(**dict(row))


@app.get("/reports/{report_id}", response_model=ReportOut)
async def get_report(request: Request, report_id: str) -> ReportOut:
    query = "select * from reports where id = $1"
    async with request.app.state.pool.acquire() as conn:
        row = await conn.fetchrow(query, report_id)
    if not row:
        raise HTTPException(status_code=404, detail="Report not found")
    return ReportOut(**dict(row))
