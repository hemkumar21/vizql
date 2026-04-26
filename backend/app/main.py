"""
main.py
FastAPI application — all API routes.
"""
import os
from typing import Optional, List, Any
from contextlib import asynccontextmanager
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.database import init_db, execute_query
from app.nlq_parser import parse_nlq
from app.safety import validate_sql, sanitize_sql, validate_tables_and_columns
from app.viz_inference import infer_chart_type
from app.explain_builder import build_explain
from app.schema_registry import get_schema_for_api
from app.sessions import ensure_conversation, add_turn, get_last_sql


# ─── Lifespan ────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="NLQ Analytics API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Request / Response Models ────────────────────────────────────────────────

class ParseRequest(BaseModel):
    prompt: str
    conversation_id: Optional[str] = None


class ParseResponse(BaseModel):
    sql: str
    warnings: List[str]
    explain: dict
    conversation_id: str


class ExecuteRequest(BaseModel):
    sql: str
    result_format: str = "table"  # "table" | "series"


class ExecuteResponse(BaseModel):
    columns: List[str]
    rows: List[List[Any]]
    inferred_chart: Optional[str]


class QueryRequest(BaseModel):
    prompt: str
    conversation_id: Optional[str] = None


class QueryResponse(BaseModel):
    columns: List[str]
    rows: List[List[Any]]
    inferred_chart: Optional[str]
    explain: dict
    sql: str
    warnings: List[str]
    conversation_id: str


class RefineRequest(BaseModel):
    conversation_id: str
    followup: str


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/api/schema/describe")
def describe_schema():
    """Return the full schema with column types and labels."""
    return {"tables": get_schema_for_api()}


@app.post("/api/nlq/parse", response_model=ParseResponse)
def nlq_parse(req: ParseRequest):
    """Convert natural language to SQL. Does NOT execute."""
    try:
        result = parse_nlq(req.prompt, req.conversation_id)
        return ParseResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parse error: {e}")


@app.post("/api/nlq/execute", response_model=ExecuteResponse)
def nlq_execute(req: ExecuteRequest):
    """Execute a pre-validated SQL string."""
    is_safe, issues = validate_sql(req.sql)
    if not is_safe:
        raise HTTPException(status_code=422, detail=f"Unsafe SQL: {'; '.join(issues)}")

    tables_ok, table_errors = validate_tables_and_columns(req.sql)
    if not tables_ok:
        raise HTTPException(status_code=422, detail=f"Unknown tables: {'; '.join(table_errors)}")

    sql_clean = sanitize_sql(req.sql)

    try:
        columns, rows = execute_query(sql_clean)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"SQL execution error: {e}")

    chart = infer_chart_type(columns, rows)

    return ExecuteResponse(columns=columns, rows=rows, inferred_chart=chart)


@app.post("/api/nlq/query", response_model=QueryResponse)
def nlq_query(req: QueryRequest):
    """Convenience endpoint: parse + execute in one call."""
    try:
        parsed = parse_nlq(req.prompt, req.conversation_id)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parse error: {e}")

    sql = parsed["sql"]
    cid = parsed["conversation_id"]

    try:
        columns, rows = execute_query(sql)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"SQL execution error: {e}")

    chart = infer_chart_type(columns, rows)

    return QueryResponse(
        columns=columns,
        rows=rows,
        inferred_chart=chart,
        explain=parsed["explain"],
        sql=sql,
        warnings=parsed["warnings"],
        conversation_id=cid,
    )


@app.post("/api/conversation/refine", response_model=QueryResponse)
def conversation_refine(req: RefineRequest):
    """Follow-up query within an existing conversation."""
    if not req.conversation_id:
        raise HTTPException(status_code=422, detail="conversation_id is required")

    try:
        parsed = parse_nlq(req.followup, req.conversation_id)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parse error: {e}")

    sql = parsed["sql"]
    cid = parsed["conversation_id"]

    try:
        columns, rows = execute_query(sql)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"SQL execution error: {e}")

    chart = infer_chart_type(columns, rows)

    return QueryResponse(
        columns=columns,
        rows=rows,
        inferred_chart=chart,
        explain=parsed["explain"],
        sql=sql,
        warnings=parsed["warnings"],
        conversation_id=cid,
    )


@app.get("/health")
def health():
    return {"status": "ok"}
