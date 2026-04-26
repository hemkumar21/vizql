"""
schema_registry.py
Whitelist of allowed tables/columns and their human-readable labels.
This is the single source of truth for both safety validation and LLM prompting.
"""
from typing import Dict, List, Any

SCHEMA: Dict[str, Dict[str, Any]] = {
    "orders": {
        "label": "Orders",
        "columns": {
            "order_id":    {"type": "int",     "label": "Order ID",       "pk": True},
            "customer_id": {"type": "int",     "label": "Customer ID",    "fk": "customers.customer_id"},
            "product_id":  {"type": "int",     "label": "Product ID",     "fk": "products.product_id"},
            "order_date":  {"type": "date",    "label": "Order Date"},
            "quantity":    {"type": "int",     "label": "Quantity"},
            "unit_price":  {"type": "decimal", "label": "Unit Price"},
            "region":      {"type": "text",    "label": "Region"},
        },
        "derived": {
            "revenue": {
                "expr": "quantity * unit_price",
                "label": "Revenue",
                "type": "decimal"
            }
        }
    },
    "customers": {
        "label": "Customers",
        "columns": {
            "customer_id": {"type": "int",  "label": "Customer ID", "pk": True},
            "name":        {"type": "text", "label": "Customer Name"},
            "segment":     {"type": "text", "label": "Segment"},
            "country":     {"type": "text", "label": "Country"},
        }
    },
    "products": {
        "label": "Products",
        "columns": {
            "product_id":   {"type": "int",  "label": "Product ID",   "pk": True},
            "product_line": {"type": "text", "label": "Product Line"},
            "category":     {"type": "text", "label": "Category"},
        }
    }
}

ALLOWED_TABLES = set(SCHEMA.keys())

def get_allowed_columns(table: str) -> set:
    if table not in SCHEMA:
        return set()
    cols = set(SCHEMA[table]["columns"].keys())
    if "derived" in SCHEMA[table]:
        cols.update(SCHEMA[table]["derived"].keys())
    return cols

def get_schema_prompt_context() -> str:
    """Format schema as a compact string for LLM prompts."""
    lines = []
    for table, info in SCHEMA.items():
        cols = []
        for col, meta in info["columns"].items():
            cols.append(f"{col} ({meta['type']})")
        if "derived" in info:
            for col, meta in info["derived"].items():
                cols.append(f"{col} [derived: {meta['expr']}] ({meta['type']})")
        lines.append(f"  {table}({', '.join(cols)})")
    return "\n".join(lines)

def get_schema_for_api() -> List[Dict]:
    """Return schema in API response format."""
    tables = []
    for table, info in SCHEMA.items():
        columns = []
        for col, meta in info["columns"].items():
            columns.append({"name": col, "type": meta["type"], "label": meta["label"]})
        if "derived" in info:
            for col, meta in info["derived"].items():
                columns.append({
                    "name": col,
                    "type": meta["type"],
                    "label": meta["label"],
                    "derived": meta["expr"]
                })
        tables.append({"name": table, "label": info["label"], "columns": columns})
    return tables
