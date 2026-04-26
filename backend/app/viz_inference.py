"""
viz_inference.py
Inspects the shape (columns + sample rows) of a query result
and proposes an appropriate chart type.

Rules:
- If there's exactly 1 text/date group column + ≥1 numeric column → "bar"
- If the group column looks temporal (date/year/month/quarter) → "line"
- If there are 2+ group columns or 0 numeric columns → null
"""
import re
from typing import List, Any, Optional


NUMERIC_TYPES = {"int", "float", "decimal", "numeric", "real", "double", "integer"}
TEXT_TYPES = {"text", "varchar", "char", "string"}
DATE_PATTERNS = re.compile(
    r'(date|year|month|quarter|week|day|period|time)',
    re.IGNORECASE
)


def infer_chart_type(
    columns: List[str],
    rows: List[List[Any]],
    col_types: Optional[List[str]] = None,
) -> Optional[str]:
    """
    Returns "bar", "line", or None.
    
    columns: list of column name strings
    rows: list of row arrays
    col_types: optional list of sqlite type strings (e.g. "TEXT", "INTEGER")
    """
    if not columns or not rows:
        return None

    if len(columns) < 2:
        return None

    # Classify columns by inspecting names + sample values
    numeric_cols = []
    group_cols = []

    for i, col in enumerate(columns):
        sample_vals = [row[i] for row in rows[:10] if row[i] is not None]

        if _is_numeric_column(col, sample_vals, col_types, i):
            numeric_cols.append((i, col))
        else:
            group_cols.append((i, col))

    if not numeric_cols:
        return None

    if len(group_cols) == 0:
        return None  # all numeric — no axis to group on

    if len(group_cols) > 2:
        return None  # too many dimensions for a simple chart

    # Determine bar vs line by the group column name/values
    group_col_name = group_cols[0][1].lower()
    if DATE_PATTERNS.search(group_col_name):
        return "line"

    # Check if values look like dates/time periods
    sample_group = [rows[r][group_cols[0][0]] for r in range(min(5, len(rows)))]
    if _looks_temporal(sample_group):
        return "line"

    return "bar"


def _is_numeric_column(
    col_name: str,
    sample_vals: List[Any],
    col_types: Optional[List[str]],
    idx: int
) -> bool:
    # Check declared type first
    if col_types and idx < len(col_types):
        ct = (col_types[idx] or "").lower()
        if any(t in ct for t in NUMERIC_TYPES):
            return True
        if any(t in ct for t in TEXT_TYPES):
            return False

    # Infer from sample values
    if sample_vals:
        numeric_count = sum(1 for v in sample_vals if isinstance(v, (int, float)))
        if numeric_count / len(sample_vals) >= 0.8:
            return True

    # Heuristic: revenue, count, total, sum, avg in name
    if re.search(r'(revenue|count|total|sum|avg|amount|qty|quantity|price|value)', col_name, re.IGNORECASE):
        return True

    return False


def _looks_temporal(values: List[Any]) -> bool:
    """Check if values look like years, quarters, or date strings."""
    str_vals = [str(v) for v in values if v is not None]
    if not str_vals:
        return False

    temporal_patterns = [
        re.compile(r'^\d{4}$'),               # 2024
        re.compile(r'^Q[1-4]\s+\d{4}$'),       # Q2 2024
        re.compile(r'^\d{4}-\d{2}'),            # 2024-01 or 2024-01-01
        re.compile(r'^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)', re.I),
    ]
    matches = sum(
        1 for v in str_vals
        if any(p.match(v) for p in temporal_patterns)
    )
    return matches / len(str_vals) >= 0.6
