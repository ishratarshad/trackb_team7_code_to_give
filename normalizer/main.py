"""FastAPI app for the food normalization pipeline."""

from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from normalizer.ingest import process_results_to_profiles
from normalizer.models import BatchNormalizeRequest, NormalizeRequest, SupplyProfile
from normalizer.normalize import normalize_tags


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="Food Normalizer API",
    description="Layer 2: Raw food tags → normalized supply profile",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    """Basic health check."""
    return {"status": "ok", "service": "normalizer"}


@app.post("/normalize", response_model=SupplyProfile)
def normalize(request: NormalizeRequest):
    """
    Normalize raw food tags and return supply profile.

    Layer 1 calls this with pantry_id and raw_tags.
    Returns SupplyProfile compatible with Supabase pantry_supply_profiles.
    """
    profile = normalize_tags(
        raw_tags=request.raw_tags,
        pantry_id=request.pantry_id,
    )
    return profile


@app.post("/normalize/batch")
def normalize_batch(request: BatchNormalizeRequest):
    """
    Normalize Layer 1 results in batch. Groups by source.resourceId,
    combines labels per pantry, returns profiles for all pantries.
    """
    profiles = process_results_to_profiles(request.results)
    return {"pantries_processed": len(profiles), "profiles": profiles}
