from dotenv import load_dotenv
from fastapi import FastAPI

from app.db import db_health_check

load_dotenv()

app = FastAPI()


@app.get("/health")
async def health() -> dict:
    try:
        ok = await db_health_check()
        if not ok:
            return {"status": "degraded", "db": "error"}
        return {"status": "ok", "db": "ok"}
    except Exception as exc:
        return {"status": "degraded", "db": "error", "detail": str(exc)}
