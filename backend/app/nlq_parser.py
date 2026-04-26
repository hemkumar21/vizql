"""
nlq_parser.py
Converts a natural language prompt into a validated SQL query using
gpt-oss-120b via the Hugging Face router (OpenAI-compatible API).
Grounds the prompt in the schema registry so the model cannot
hallucinate unknown tables/columns.
"""
import os
import json
import re
from typing import Dict, Any, List, Optional
from openai import OpenAI

from app.schema_registry import get_schema_prompt_context
from app.safety import validate_sql, sanitize_sql, validate_tables_and_columns
from app.explain_builder import build_explain
from app.sessions import get_history_for_prompt, ensure_conversation, add_turn

# ── Config from environment ───────────────────────────────────────────────────
HF_TOKEN   = os.environ.get("HF_TOKEN", "")
HF_MODEL   = os.environ.get("HF_MODEL", "openai/gpt-oss-120b")
HF_TIMEOUT = float(os.environ.get("HF_TIMEOUT", "60"))

# ── OpenAI client pointed at HF router ───────────────────────────────────────
_client: Optional[OpenAI] = None

def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            base_url="https://router.huggingface.co/v1",
            api_key=HF_TOKEN,
            timeout=HF_TIMEOUT,
        )
    return _client


# ── System prompt ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are a SQL query generator for a business analytics platform.

Database schema (SQLite dialect):
{schema}

Rules you MUST follow:
1. Only generate SELECT statements.
2. Only reference tables and columns that exist in the schema above.
3. Use `quantity * unit_price` for revenue (no separate revenue column exists).
4. For Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec date filtering.
5. Always include a LIMIT clause (default 1000 if not specified).
6. Use proper SQLite date functions: strftime('%Y', order_date), etc.
7. When joining, always use proper ON clauses.
8. Return ONLY a JSON object with exactly these keys:
   - "sql": the complete SQL query string
   - "explanation": a 1-2 sentence plain English description of what the query does

Example response format:
{{"sql": "SELECT region, SUM(quantity * unit_price) as revenue FROM orders WHERE ...", "explanation": "Calculates total revenue grouped by region for Q2 2024."}}

Do not include markdown, code fences, or any other text — ONLY the JSON object."""


# ── HF router call ────────────────────────────────────────────────────────────
def _call_hf(messages: List[Dict[str, str]], schema_ctx: str) -> str:
    """
    POST to HF router via openai SDK.
    Returns the raw text content of the first choice.
    """
    system = SYSTEM_PROMPT.format(schema=schema_ctx)
    client = _get_client()

    response = client.chat.completions.create(
        model=HF_MODEL,
        messages=[{"role": "system", "content": system}] + messages,
        temperature=0.1,
        max_tokens=1024,
    )

    return response.choices[0].message.content.strip()


# ── Public API ────────────────────────────────────────────────────────────────
def parse_nlq(
    prompt: str,
    conversation_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Convert natural language prompt to SQL via gpt-oss-120b on HF router.

    Returns:
        {
            "sql": str,
            "warnings": [str],
            "explain": {...},
            "conversation_id": str,
        }
    Raises:
        ValueError  -- unsafe SQL or parse failure
        openai.*    -- network / auth errors surfaced to caller
    """
    cid = ensure_conversation(conversation_id)
    schema_ctx = get_schema_prompt_context()

    history  = get_history_for_prompt(cid)
    messages = history + [{"role": "user", "content": prompt}]

    raw = _call_hf(messages, schema_ctx)

    parsed      = _parse_llm_json(raw)
    sql_raw     = parsed.get("sql", "").strip()
    explanation = parsed.get("explanation", "")

    if not sql_raw:
        raise ValueError("Model returned empty SQL")

    is_safe, safety_issues = validate_sql(sql_raw)
    if not is_safe:
        raise ValueError(f"Unsafe SQL: {'; '.join(safety_issues)}")

    tables_ok, table_errors = validate_tables_and_columns(sql_raw)
    if not tables_ok:
        raise ValueError(f"Invalid table references: {'; '.join(table_errors)}")

    sql_clean = sanitize_sql(sql_raw)
    _, warnings = validate_sql(sql_clean)

    explain = build_explain(sql_clean, explanation)
    add_turn(cid, prompt, sql_clean)

    return {
        "sql":             sql_clean,
        "warnings":        [w for w in warnings if w],
        "explain":         explain,
        "conversation_id": cid,
    }


# ── JSON parser ───────────────────────────────────────────────────────────────
def _parse_llm_json(raw: str) -> Dict[str, Any]:
    """Robustly parse JSON from model output, tolerating code fences."""
    raw = re.sub(r'^```(?:json)?\s*', '', raw, flags=re.MULTILINE)
    raw = re.sub(r'```\s*$',          '', raw, flags=re.MULTILINE)
    raw = raw.strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise ValueError(f"Could not parse model response as JSON: {raw[:200]}")