"""
explain_builder.py
Parses a SQL string and emits a structured provenance / explainability object.
Works via regex-based AST extraction — no external parser needed.
"""
import re
from typing import Dict, List, Any


def build_explain(sql: str, natural_explanation: str = "") -> Dict[str, Any]:
    """
    Returns:
      {
        "filters": [...],
        "groupBy": [...],
        "aggregates": [...],
        "sourceTables": [...],
        "naturalExplanation": "..."
      }
    """
    sql_clean = sql.strip().rstrip(";")

    return {
        "filters": _extract_filters(sql_clean),
        "groupBy": _extract_group_by(sql_clean),
        "aggregates": _extract_aggregates(sql_clean),
        "sourceTables": _extract_tables(sql_clean),
        "naturalExplanation": natural_explanation,
    }


def _extract_tables(sql: str) -> List[str]:
    tables = re.findall(
        r'\b(?:FROM|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_]*)',
        sql, re.IGNORECASE
    )
    return list(dict.fromkeys(t.lower() for t in tables))  # deduplicate, preserve order


def _extract_filters(sql: str) -> List[str]:
    """Extract WHERE clause conditions as human-readable strings."""
    where_match = re.search(
        r'\bWHERE\s+(.*?)(?:\bGROUP BY\b|\bHAVING\b|\bORDER BY\b|\bLIMIT\b|$)',
        sql, re.IGNORECASE | re.DOTALL
    )
    if not where_match:
        return []

    where_clause = where_match.group(1).strip()
    # Split on AND/OR at top level (simplified)
    conditions = re.split(r'\bAND\b|\bOR\b', where_clause, flags=re.IGNORECASE)
    result = []
    for c in conditions:
        c = c.strip()
        if c:
            result.append(_humanize_condition(c))
    return result


def _humanize_condition(cond: str) -> str:
    """Convert SQL condition to human-readable form."""
    # Q2 2024 pattern
    cond = re.sub(
        r"order_date\s*BETWEEN\s*'([^']+)'\s*AND\s*'([^']+)'",
        lambda m: f"order_date between {m.group(1)} and {m.group(2)}",
        cond, flags=re.IGNORECASE
    )
    cond = re.sub(
        r"strftime\('%Y',\s*order_date\)\s*=\s*'(\d+)'",
        r"year = \1",
        cond, flags=re.IGNORECASE
    )
    cond = re.sub(
        r"strftime\('%m',\s*order_date\)\s*(?:IN|BETWEEN)[^)]+",
        "quarter filter on order_date",
        cond, flags=re.IGNORECASE
    )
    return cond.strip()


def _extract_group_by(sql: str) -> List[str]:
    gb_match = re.search(
        r'\bGROUP BY\s+(.*?)(?:\bHAVING\b|\bORDER BY\b|\bLIMIT\b|$)',
        sql, re.IGNORECASE | re.DOTALL
    )
    if not gb_match:
        return []
    cols = [c.strip() for c in gb_match.group(1).split(",")]
    return [c for c in cols if c]


def _extract_aggregates(sql: str) -> List[str]:
    """Find aggregate function calls in the SELECT list."""
    select_match = re.search(
        r'\bSELECT\s+(.*?)\bFROM\b',
        sql, re.IGNORECASE | re.DOTALL
    )
    if not select_match:
        return []

    select_clause = select_match.group(1)
    agg_pattern = re.compile(
        r'(SUM|COUNT|AVG|MIN|MAX|TOTAL)\s*\([^)]+\)(?:\s+AS\s+\w+)?',
        re.IGNORECASE
    )
    return [m.group(0).strip() for m in agg_pattern.finditer(select_clause)]
