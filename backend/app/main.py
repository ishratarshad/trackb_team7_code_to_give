import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware

from app.db import create_pool, db_health_check
from app.cleaning import clean_feedback_payload
from app.lemontree_proxy import (
    fetch_markers_within_bounds,
    fetch_resource,
    fetch_resources,
)
from feedback.routes import router as resource_reviews_router

from app.models import (
    AnalyticsSummary,
    AnalyticsInsights,
    DatasetDetail,
    DatasetMetric,
    DatasetOverlayPoint,
    DatasetOut,
    FeedbackCreate,
    FeedbackOut,
    HeatmapPoint,
    IssueCategory,
    PantryCreate,
    PantryOut,
    PhotoClassify,
    PhotoCreate,
    PhotoOut,
    ReportCreate,
    ReportOut,
    ResourceKind,
    ResourceType,
    SupplyProfileOut,
    TrendPoint,
    InsightPoint,
)

load_dotenv()
logger = logging.getLogger(__name__)


def _parse_cors_origins() -> list[str]:
    raw = (os.getenv("CORS_ORIGINS") or "").strip()
    origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
    # Ensure localhost dev origins for Next.js (3000) and Vite (5173)
    defaults = ["http://localhost:3000", "http://localhost:5173"]
    if not origins:
        origins = defaults
    else:
        for d in defaults:
            if d not in origins:
                origins = list(origins) + [d]
    return origins


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pool = await create_pool()
    if app.state.pool is None:
        logger.warning("Starting without database; DB-dependent endpoints will return 503")
    yield
    if app.state.pool is not None:
        await app.state.pool.close()


app = FastAPI(title="Food Access Insights API", version="0.2.0", lifespan=lifespan)

origins = _parse_cors_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(resource_reviews_router)


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


def _require_pool(request: Request):
    """Raise 503 if database is not configured. Returns pool otherwise."""
    pool = getattr(request.app.state, "pool", None)
    if pool is None:
        raise HTTPException(status_code=503, detail="Database not configured")
    return pool


@app.get("/health")
async def health(request: Request) -> dict:
    pool = getattr(request.app.state, "pool", None)
    if pool is None:
        return {"status": "degraded", "db": "not configured"}
    try:
        ok = await db_health_check(pool)
        if not ok:
            return {"status": "degraded", "db": "error"}
        return {"status": "ok", "db": "ok"}
    except Exception as exc:
        return {"status": "degraded", "db": "error", "detail": str(exc)}


@app.head("/health")
async def health_head(request: Request) -> None:
    await health(request)
    return None


@app.post("/pantries", response_model=PantryOut)
async def create_pantry(request: Request, payload: PantryCreate) -> PantryOut:
    pool = _require_pool(request)
    query = """
        insert into pantries (
            name,
            neighborhood,
            address,
            zip_code,
            latitude,
            longitude,
            resource_kind,
            schedule,
            is_open_now
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        returning *
    """
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            query,
            payload.name,
            payload.neighborhood,
            payload.address,
            payload.zip_code,
            payload.latitude,
            payload.longitude,
            payload.resource_kind,
            payload.schedule,
            payload.is_open_now,
        )
    return PantryOut(**dict(row))


@app.get("/pantries", response_model=list[PantryOut])
async def list_pantries(
    request: Request,
    neighborhood: str | None = None,
) -> list[PantryOut]:
    pool = _require_pool(request)
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
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *values)
    return [PantryOut(**dict(row)) for row in rows]


@app.get("/resources", response_model=list[PantryOut])
async def list_resources(
    request: Request,
    neighborhood: str | None = None,
    zip_code: str | None = Query(None, alias="zip"),
    resource_kind: ResourceKind | None = Query(None),
    open_now: bool | None = None,
) -> list[PantryOut]:
    pool = _require_pool(request)
    where = []
    values: list[Any] = []
    if neighborhood:
        values.append(neighborhood)
        where.append(f"neighborhood = ${len(values)}")
    if zip_code:
        values.append(zip_code)
        where.append(f"zip_code = ${len(values)}")
    if resource_kind:
        values.append(resource_kind)
        where.append(f"resource_kind = ${len(values)}")
    if open_now is not None:
        values.append(open_now)
        where.append(f"is_open_now = ${len(values)}")
    where_sql = f"where {' and '.join(where)}" if where else ""
    query = f"""
        select *
        from pantries
        {where_sql}
        order by name
    """
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *values)
    return [PantryOut(**dict(row)) for row in rows]


@app.get("/resources/{resource_id}", response_model=PantryOut)
async def get_resource(request: Request, resource_id: str) -> PantryOut:
    pool = _require_pool(request)
    query = "select * from pantries where id = $1"
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, resource_id)
    if not row:
        raise HTTPException(status_code=404, detail="Resource not found")
    return PantryOut(**dict(row))


@app.get("/pantries/{pantry_id}", response_model=PantryOut)
async def get_pantry(request: Request, pantry_id: str) -> PantryOut:
    pool = _require_pool(request)
    query = "select * from pantries where id = $1"
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, pantry_id)
    if not row:
        raise HTTPException(status_code=404, detail="Pantry not found")
    return PantryOut(**dict(row))


@app.post("/feedback", response_model=FeedbackOut)
async def create_feedback(request: Request, payload: FeedbackCreate) -> FeedbackOut:
    pool = _require_pool(request)
    cleaned = clean_feedback_payload(payload)
    async with pool.acquire() as conn:
        pantry = await conn.fetchrow(
            "select name, neighborhood from pantries where id = $1",
            cleaned["pantry_id"],
        )
        if not pantry:
            raise HTTPException(status_code=400, detail="Pantry not found")

        dedup_minutes = int(os.getenv("FEEDBACK_DEDUP_MINUTES", "5"))
        dedup_query = """
            select *
            from feedback
            where pantry_id = $1
              and rating = $2
              and resource_type = $3
              and coalesce(wait_time_min, -1) = coalesce($4, -1)
              and coalesce(lower(comment), '') = coalesce(lower($5), '')
              and coalesce(lower(items_unavailable), '') = coalesce(lower($6), '')
              and created_at >= ($7 - ($8 || ' minutes')::interval)
            order by created_at desc
            limit 1
        """
        duplicate = await conn.fetchrow(
            dedup_query,
            cleaned["pantry_id"],
            cleaned["rating"],
            cleaned["resource_type"],
            cleaned["wait_time_min"],
            cleaned["comment"],
            cleaned["items_unavailable"],
            cleaned["created_at"],
            dedup_minutes,
        )
        if duplicate:
            return FeedbackOut(
                **dict(duplicate),
                pantry_name=pantry["name"],
                pantry_neighborhood=pantry["neighborhood"],
            )

    query = """
        insert into feedback (
            pantry_id,
            author_id,
            attended,
            did_not_attend_reason,
            rating,
            wait_time_min,
            resource_type,
            items_unavailable,
            comment,
            information_accurate,
            photo_url,
            photo_public,
            share_text_with_resource,
            occurrence_id,
            user_id,
            reviewed_by_user_id,
            deleted_at,
            issue_categories,
            raw_payload,
            created_at
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19, coalesce($20, now()))
        returning *
    """
    row = await conn.fetchrow(
        query,
        cleaned["pantry_id"],
        cleaned.get("author_id"),
        cleaned.get("attended"),
        cleaned.get("did_not_attend_reason"),
        cleaned["rating"],
        cleaned["wait_time_min"],
        cleaned["resource_type"],
        cleaned["items_unavailable"],
        cleaned["comment"],
        cleaned.get("information_accurate"),
        cleaned.get("photo_url"),
        cleaned.get("photo_public"),
        cleaned.get("share_text_with_resource"),
        cleaned.get("occurrence_id"),
        cleaned.get("user_id"),
        cleaned.get("reviewed_by_user_id"),
        cleaned.get("deleted_at"),
        cleaned["issue_categories"],
        cleaned["raw_payload"],
        cleaned["created_at"],
    )
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
    pool = _require_pool(request)
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
    async with pool.acquire() as conn:
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
    pool = _require_pool(request)
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
    async with pool.acquire() as conn:
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
    pool = _require_pool(request)
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
    async with pool.acquire() as conn:
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
    pool = _require_pool(request)
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
    async with pool.acquire() as conn:
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
    pool = _require_pool(request)
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
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *values)
    return [HeatmapPoint(**dict(row)) for row in rows]


@app.get("/analytics/insights", response_model=AnalyticsInsights)
async def analytics_insights(request: Request) -> AnalyticsInsights:
    pool = _require_pool(request)
    longest_wait_query = """
        select p.id, p.name, p.neighborhood, avg(f.wait_time_min) as metric
        from feedback f
        join pantries p on p.id = f.pantry_id
        where f.wait_time_min is not null
        group by p.id, p.name, p.neighborhood
        order by metric desc nulls last
        limit 5
    """
    lowest_satisfaction_query = """
        select p.id, p.name, p.neighborhood, avg(f.rating) as metric
        from feedback f
        join pantries p on p.id = f.pantry_id
        group by p.id, p.name, p.neighborhood
        order by metric asc nulls last
        limit 5
    """
    unmet_demand_query = """
        select
            p.id,
            p.name,
            p.neighborhood,
            avg(case when f.wait_time_min >= 30 or f.rating <= 2 then 1 else 0 end) as metric
        from feedback f
        join pantries p on p.id = f.pantry_id
        group by p.id, p.name, p.neighborhood
        order by metric desc nulls last
        limit 5
    """
    async with pool.acquire() as conn:
        longest_wait = await conn.fetch(longest_wait_query)
        lowest_satisfaction = await conn.fetch(lowest_satisfaction_query)
        unmet_demand = await conn.fetch(unmet_demand_query)
    return AnalyticsInsights(
        longest_wait_times=[
            InsightPoint(
                pantry_id=row["id"],
                pantry_name=row["name"],
                neighborhood=row["neighborhood"],
                metric=row["metric"],
            )
            for row in longest_wait
        ],
        lowest_satisfaction=[
            InsightPoint(
                pantry_id=row["id"],
                pantry_name=row["name"],
                neighborhood=row["neighborhood"],
                metric=row["metric"],
            )
            for row in lowest_satisfaction
        ],
        highest_unmet_demand=[
            InsightPoint(
                pantry_id=row["id"],
                pantry_name=row["name"],
                neighborhood=row["neighborhood"],
                metric=row["metric"],
            )
            for row in unmet_demand
        ],
    )


@app.get("/pantries/{pantry_id}/supply", response_model=SupplyProfileOut)
async def pantry_supply(request: Request, pantry_id: str) -> SupplyProfileOut:
    pool = _require_pool(request)
    query = """
        select pantry_id, normalized_foods, category_distribution, updated_at
        from supply_profiles
        where pantry_id = $1
    """
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, pantry_id)
    if not row:
        raise HTTPException(status_code=404, detail="Supply profile not found")
    return SupplyProfileOut(**dict(row))


@app.post("/photos", response_model=PhotoOut)
async def create_photo(request: Request, payload: PhotoCreate) -> PhotoOut:
    pool = _require_pool(request)
    query = """
        insert into pantry_photos (pantry_id, image_url, captured_at)
        values ($1, $2, $3)
        returning *
    """
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            query,
            payload.pantry_id,
            payload.image_url,
            payload.captured_at,
        )
    return PhotoOut(
        id=row["id"],
        pantry_id=row["pantry_id"],
        image_url=row["image_url"],
        captured_at=row["captured_at"],
        raw_tags=row["raw_tags"],
        normalized_tags=row["normalized_tags"],
        created_at=row["created_at"],
    )


@app.get("/pantries/{pantry_id}/photos", response_model=list[PhotoOut])
async def list_photos(request: Request, pantry_id: str) -> list[PhotoOut]:
    pool = _require_pool(request)
    query = """
        select *
        from pantry_photos
        where pantry_id = $1
        order by created_at desc
    """
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, pantry_id)
    return [
        PhotoOut(
            id=row["id"],
            pantry_id=row["pantry_id"],
            image_url=row["image_url"],
            captured_at=row["captured_at"],
            raw_tags=row["raw_tags"],
            normalized_tags=row["normalized_tags"],
            created_at=row["created_at"],
        )
        for row in rows
    ]


@app.post("/photos/{photo_id}/classify", response_model=PhotoOut)
async def classify_photo(
    request: Request,
    photo_id: str,
    payload: PhotoClassify,
) -> PhotoOut:
    pool = _require_pool(request)
    query = """
        update pantry_photos
        set raw_tags = $1,
            normalized_tags = $2
        where id = $3
        returning *
    """
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            query,
            payload.raw_tags,
            payload.normalized_tags,
            photo_id,
        )
    if not row:
        raise HTTPException(status_code=404, detail="Photo not found")
    return PhotoOut(
        id=row["id"],
        pantry_id=row["pantry_id"],
        image_url=row["image_url"],
        captured_at=row["captured_at"],
        raw_tags=row["raw_tags"],
        normalized_tags=row["normalized_tags"],
        created_at=row["created_at"],
    )


@app.get("/datasets", response_model=list[DatasetOut])
async def list_datasets(request: Request) -> list[DatasetOut]:
    pool = _require_pool(request)
    query = "select * from public_datasets order by ingested_at desc"
    async with pool.acquire() as conn:
        rows = await conn.fetch(query)
    return [DatasetOut(**dict(row)) for row in rows]


@app.get("/datasets/{dataset_id}", response_model=DatasetDetail)
async def get_dataset(
    request: Request,
    dataset_id: str,
    geo_unit_id: str | None = None,
    limit: int = Query(100, ge=1, le=1000),
) -> DatasetDetail:
    pool = _require_pool(request)
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
    async with pool.acquire() as conn:
        dataset = await conn.fetchrow(dataset_query, dataset_id)
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        metrics = await conn.fetch(metrics_query, *values)
    return DatasetDetail(
        dataset=DatasetOut(**dict(dataset)),
        metrics=[DatasetMetric(**dict(row)) for row in metrics],
    )


@app.get("/datasets/overlay", response_model=list[DatasetOverlayPoint])
async def dataset_overlay(
    request: Request,
    dataset_id: str,
) -> list[DatasetOverlayPoint]:
    pool = _require_pool(request)
    query = """
        select
            p.id as pantry_id,
            p.name as pantry_name,
            p.neighborhood,
            p.zip_code,
            p.latitude,
            p.longitude,
            m.metrics
        from pantries p
        join public_dataset_metrics m
            on p.zip_code = m.geo_unit_id
        where m.dataset_id = $1
        order by p.name
    """
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, dataset_id)
    return [DatasetOverlayPoint(**dict(row)) for row in rows]


@app.post("/reports", response_model=ReportOut)
async def create_report(request: Request, payload: ReportCreate) -> ReportOut:
    pool = _require_pool(request)
    query = """
        insert into reports (title, filters)
        values ($1, $2)
        returning *
    """
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, payload.title, payload.filters)
    return ReportOut(**dict(row))


@app.get("/reports/{report_id}", response_model=ReportOut)
async def get_report(request: Request, report_id: str) -> ReportOut:
    pool = _require_pool(request)
    query = "select * from reports where id = $1"
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, report_id)
    if not row:
        raise HTTPException(status_code=404, detail="Report not found")
    return ReportOut(**dict(row))


@app.get("/proxy/lemontree/resources")
async def proxy_lemontree_resources(request: Request) -> dict:
    params = dict(request.query_params)
    return await fetch_resources(params)


@app.get("/proxy/lemontree/resources/{resource_id}")
async def proxy_lemontree_resource(resource_id: str) -> dict:
    return await fetch_resource(resource_id)


@app.get("/proxy/lemontree/markersWithinBounds")
async def proxy_lemontree_markers(request: Request) -> dict:
    params = list(request.query_params.multi_items())
    return await fetch_markers_within_bounds(params)


async def _get_latest_dataset_id(conn) -> str | None:
    row = await conn.fetchrow(
        "select id from public_datasets order by ingested_at desc limit 1"
    )
    return row["id"] if row else None


@app.get("/fusion/lemontree/resources-with-demographics")
async def fusion_lemontree_resources_with_demographics(
    request: Request,
    dataset_id: str | None = None,
) -> dict:
    params = dict(request.query_params)
    params.pop("dataset_id", None)
    resources_payload = await fetch_resources(params)
    resources = resources_payload.get("resources") or []

    zip_codes = {
        (r.get("zipCode") or r.get("zip_code") or r.get("zip") or "").strip()
        for r in resources
        if (r.get("zipCode") or r.get("zip_code") or r.get("zip"))
    }
    zip_list = [z for z in zip_codes if z]

    metrics_by_zip: dict[str, dict[str, Any]] = {}
    if zip_list:
        pool = _require_pool(request)
        async with pool.acquire() as conn:
            resolved_dataset_id = dataset_id or await _get_latest_dataset_id(conn)
            if resolved_dataset_id:
                rows = await conn.fetch(
                    """
                    select geo_unit_id, metrics
                    from public_dataset_metrics
                    where dataset_id = $1
                      and geo_unit_id = any($2)
                    """,
                    resolved_dataset_id,
                    zip_list,
                )
                metrics_by_zip = {row["geo_unit_id"]: row["metrics"] for row in rows}
                resources_payload["dataset_id"] = resolved_dataset_id

    fused = []
    for resource in resources:
        zip_code = (
            resource.get("zipCode")
            or resource.get("zip_code")
            or resource.get("zip")
            or ""
        ).strip()
        fused.append(
            {
                **resource,
                "demographics": metrics_by_zip.get(zip_code),
            }
        )

    resources_payload["resources"] = fused
    return resources_payload


@app.get("/demographics/tract/{geoid}")
async def get_demographics_by_tract(
    request: Request,
    geoid: str,
) -> dict:
    """
    Get demographics data for a specific census tract (GEOID).

    Returns combined ACS demographics and USDA food access data if available.
    """
    pool = _require_pool(request)
    async with pool.acquire() as conn:
        # Get all datasets that have data for this GEOID
        rows = await conn.fetch(
            """
            select
                pd.name as dataset_name,
                pd.source as dataset_source,
                pdm.metrics,
                pdm.recorded_at
            from public_dataset_metrics pdm
            join public_datasets pd on pd.id = pdm.dataset_id
            where pdm.geo_unit_id = $1
            order by pdm.recorded_at desc
            """,
            geoid,
        )

    if not rows:
        raise HTTPException(status_code=404, detail=f"No demographics data found for tract {geoid}")

    result = {
        "geoid": geoid,
        "datasets": {},
    }

    for row in rows:
        dataset_name = row["dataset_name"]
        if dataset_name not in result["datasets"]:
            result["datasets"][dataset_name] = {
                "source": row["dataset_source"],
                "metrics": row["metrics"],
                "recorded_at": row["recorded_at"].isoformat(),
            }

    return result


@app.get("/demographics/search")
async def search_demographics(
    request: Request,
    zip_code: str | None = None,
    state: str | None = None,
    limit: int = Query(50, ge=1, le=500),
) -> list[dict]:
    """
    Search demographics data by zip code prefix or state.

    Returns a list of matching census tracts with their demographics.
    """
    conditions = []
    values = []

    if zip_code:
        # Match tracts that start with this zip code prefix (first 5 chars of GEOID)
        values.append(f"{zip_code}%")
        conditions.append(f"pdm.geo_unit_id like ${len(values)}")

    if state:
        # Match by state in the metrics JSON
        values.append(state.upper())
        conditions.append(f"pdm.metrics->>'state' ilike ${len(values)}")

    where_sql = f"where {' and '.join(conditions)}" if conditions else ""

    values.extend([limit])

    query = f"""
        select distinct on (pdm.geo_unit_id)
            pdm.geo_unit_id as geoid,
            pd.name as dataset_name,
            pdm.metrics
        from public_dataset_metrics pdm
        join public_datasets pd on pd.id = pdm.dataset_id
        {where_sql}
        order by pdm.geo_unit_id, pdm.recorded_at desc
        limit ${len(values)}
    """

    pool = _require_pool(request)
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *values)

    return [
        {
            "geoid": row["geoid"],
            "dataset": row["dataset_name"],
            "metrics": row["metrics"],
        }
        for row in rows
    ]


@app.get("/analytics/shortage")
async def analytics_shortage(
    request: Request,
    neighborhood: str | None = None,
    limit: int = Query(20, ge=1, le=100),
) -> dict:
    """
    Calculate shortage scores: foods most requested but least available.

    Shortage = demand (items_unavailable mentions) vs supply (pantries stocking item)

    Returns items ranked by shortage score (high = most needed, least available).
    """
    pool = _require_pool(request)
    async with pool.acquire() as conn:
        # 1. Get demand: aggregate items_unavailable mentions
        demand_query = """
            select
                lower(trim(item)) as item,
                count(*) as demand_count,
                count(distinct f.pantry_id) as pantries_requesting
            from feedback f
            join pantries p on p.id = f.pantry_id
            cross join lateral unnest(
                string_to_array(
                    regexp_replace(f.items_unavailable, '[,;/]', ',', 'g'),
                    ','
                )
            ) as item
            where f.items_unavailable is not null
              and trim(item) != ''
              {neighborhood_filter}
            group by lower(trim(item))
            having count(*) >= 1
            order by count(*) desc
        """.format(
            neighborhood_filter="and p.neighborhood = $1" if neighborhood else ""
        )

        if neighborhood:
            demand_rows = await conn.fetch(demand_query, neighborhood)
        else:
            demand_rows = await conn.fetch(demand_query)

        # 2. Get supply: which pantries have which food categories
        # Use supply_profiles if available, fall back to photo tags
        supply_query = """
            select
                p.id as pantry_id,
                p.neighborhood,
                coalesce(
                    sp.normalized_foods,
                    (select jsonb_agg(distinct tag)
                     from pantry_photos pp,
                     lateral jsonb_array_elements_text(pp.normalized_tags) as tag
                     where pp.pantry_id = p.id),
                    '[]'::jsonb
                ) as foods
            from pantries p
            left join supply_profiles sp on sp.pantry_id = p.id
            {neighborhood_filter}
        """.format(
            neighborhood_filter="where p.neighborhood = $1" if neighborhood else ""
        )

        if neighborhood:
            supply_rows = await conn.fetch(supply_query, neighborhood)
        else:
            supply_rows = await conn.fetch(supply_query)

        # Count total pantries for percentage calc
        total_pantries = len(supply_rows)

        # Build supply index: item -> set of pantry_ids that have it
        supply_index: dict[str, set] = {}
        for row in supply_rows:
            foods = row["foods"] or []
            if isinstance(foods, str):
                import json
                foods = json.loads(foods)
            for food in foods:
                if isinstance(food, dict):
                    food_name = food.get("name", "").lower()
                else:
                    food_name = str(food).lower()
                if food_name:
                    if food_name not in supply_index:
                        supply_index[food_name] = set()
                    supply_index[food_name].add(row["pantry_id"])

        # 3. Calculate shortage scores
        shortages = []
        for row in demand_rows:
            item = row["item"]
            demand_count = row["demand_count"]

            # Find supply - check for exact match or partial match
            supply_count = 0
            matched_supply_key = None
            for supply_item, pantry_set in supply_index.items():
                if item in supply_item or supply_item in item:
                    supply_count = max(supply_count, len(pantry_set))
                    matched_supply_key = supply_item

            # Supply percentage (what % of pantries have this item)
            supply_pct = (supply_count / total_pantries * 100) if total_pantries > 0 else 0

            # Shortage score: high demand + low supply = high shortage
            # Normalize demand to 0-100 scale, then: shortage = demand_score - supply_pct
            max_demand = demand_rows[0]["demand_count"] if demand_rows else 1
            demand_score = (demand_count / max_demand) * 100

            shortage_score = demand_score - supply_pct

            shortages.append({
                "item": item,
                "demand_mentions": demand_count,
                "pantries_requesting": row["pantries_requesting"],
                "pantries_supplying": supply_count,
                "supply_pct": round(supply_pct, 1),
                "shortage_score": round(shortage_score, 1),
            })

        # Sort by shortage score (highest first)
        shortages.sort(key=lambda x: x["shortage_score"], reverse=True)

        return {
            "neighborhood": neighborhood,
            "total_pantries": total_pantries,
            "shortages": shortages[:limit],
            "methodology": {
                "demand": "Count of items_unavailable mentions in feedback",
                "supply": "Binary presence in supply profiles or photo tags",
                "score": "Normalized demand (0-100) minus supply percentage",
            },
        }


@app.get("/demographics/summary")
async def demographics_summary(request: Request) -> dict:
    """
    Get a summary of available demographics datasets.
    """
    pool = _require_pool(request)
    query = """
        select
            pd.id,
            pd.name,
            pd.source,
            pd.description,
            count(distinct pdm.geo_unit_id) as tract_count,
            max(pdm.recorded_at) as last_updated
        from public_datasets pd
        left join public_dataset_metrics pdm on pdm.dataset_id = pd.id
        group by pd.id, pd.name, pd.source, pd.description
        order by pd.name
    """
    async with pool.acquire() as conn:
        rows = await conn.fetch(query)

    return {
        "datasets": [
            {
                "id": row["id"],
                "name": row["name"],
                "source": row["source"],
                "description": row["description"],
                "tract_count": row["tract_count"],
                "last_updated": row["last_updated"].isoformat() if row["last_updated"] else None,
            }
            for row in rows
        ]
    }
