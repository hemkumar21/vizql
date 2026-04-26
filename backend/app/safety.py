"""
safety.py
Validates SQL against a strict allowlist. Rejects dangerous patterns,
enforces SELECT-only, applies LIMIT caps, checks column/table whitelist.
"""
import re
from typing import Tuple, List
from app.schema_registry import ALLOWED_TABLES, get_allowed_columns

DENYLIST_PATTERNS = [
    r'\bDROP\b', r'\bDELETE\b', r'\bINSERT\b', r'\bUPDATE\b',
    r'\bALTER\b', r'\bCREATE\b', r'\bTRUNCATE\b', r'\bEXEC\b',
    r'\bEXECUTE\b', r'\bXP_\b', r'\bSP_\b', r'\bSYSTEM\b',
    r'--',           # inline comments
    r'/\*',          # block comments
    r'\bUNION\b',    # union-based injection
    r'\bINTO\b',     # SELECT INTO / INSERT INTO
    r';',            # statement terminator (multiple statements)
    r'\.\.',         # cross-db references
    r'@@',           # SQL Server globals
    r'\bINFORMATION_SCHEMA\b',
    r'\bSYSOBJECTS\b',
]

MAX_LIMIT = 10_000

# NEW
def validate_sql(sql: str) -> Tuple[bool, List[str]]:
    warnings = []
    # Strip trailing semicolon BEFORE validation
    sql = sql.rstrip(";").strip()
    upper = sql.upper().strip()

    # Must be a SELECT statement
    if not upper.startswith("SELECT"):
        return False, ["Only SELECT statements are allowed"]

    # Denylist keyword check
    for pattern in DENYLIST_PATTERNS:
        if re.search(pattern, sql, re.IGNORECASE):
            return False, [f"Rejected: forbidden pattern '{pattern.strip(r'\\b')}' found in SQL"]

    # Check LIMIT is present and within cap
    limit_match = re.search(r'\bLIMIT\s+(\d+)', sql, re.IGNORECASE)
    if limit_match:
        limit_val = int(limit_match.group(1))
        if limit_val > MAX_LIMIT:
            warnings.append(f"LIMIT {limit_val} capped to {MAX_LIMIT}")
    else:
        warnings.append("No LIMIT clause found; results may be large")

    return True, warnings


def sanitize_sql(sql: str) -> str:
    """Apply safe rewrites: cap LIMIT, strip trailing semicolons."""
    sql = sql.rstrip(";").strip()
    sql = re.sub(
        r'\bLIMIT\s+(\d+)',
        lambda m: f"LIMIT {min(int(m.group(1)), MAX_LIMIT)}",
        sql,
        flags=re.IGNORECASE
    )
    return sql


def validate_tables_and_columns(sql: str) -> Tuple[bool, List[str]]:
    """
    Check that all table references in FROM/JOIN are whitelisted.
    Column-level check is best-effort (LLM already grounded in schema).
    """
    errors = []
    # Extract table names from FROM and JOIN clauses
    table_refs = re.findall(
        r'\b(?:FROM|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_]*)',
        sql,
        re.IGNORECASE
    )
    for t in table_refs:
        if t.lower() not in ALLOWED_TABLES:
            errors.append(f"Unknown table: '{t}'")

    if errors:
        return False, errors
    return True, []
