"""
test_backend.py
Pytest suite covering: safety, explain_builder, viz_inference,
schema_registry, and API endpoints (with mocked HF/OpenAI client).
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from unittest.mock import patch, MagicMock

os.environ.setdefault("HF_TOKEN", "hf_test_token")
os.environ["DB_PATH"] = ":memory:"

from app.safety import validate_sql, sanitize_sql, validate_tables_and_columns
from app.explain_builder import build_explain
from app.viz_inference import infer_chart_type
from app.schema_registry import get_schema_prompt_context, get_allowed_columns


# ─── Safety Tests ─────────────────────────────────────────────────────────────

class TestSafety:
    def test_valid_select(self):
        sql = "SELECT region, SUM(quantity * unit_price) FROM orders GROUP BY region LIMIT 100"
        ok, _ = validate_sql(sql)
        assert ok

    def test_reject_drop(self):
        ok, issues = validate_sql("DROP TABLE orders")
        assert not ok

    def test_reject_insert(self):
        ok, _ = validate_sql("INSERT INTO orders VALUES (1,1,1,'2024-01-01',1,1,'North')")
        assert not ok

    def test_reject_semicolon(self):
        ok, _ = validate_sql("SELECT * FROM orders; DROP TABLE orders")
        assert not ok

    def test_reject_union(self):
        ok, _ = validate_sql("SELECT * FROM orders UNION SELECT * FROM customers")
        assert not ok

    def test_reject_comment(self):
        ok, _ = validate_sql("SELECT * FROM orders -- bypass")
        assert not ok

    def test_limit_capped(self):
        sql = sanitize_sql("SELECT * FROM orders LIMIT 99999")
        assert "LIMIT 10000" in sql

    def test_table_whitelist_pass(self):
        ok, _ = validate_tables_and_columns(
            "SELECT o.order_id FROM orders o JOIN customers c ON o.customer_id=c.customer_id"
        )
        assert ok

    def test_table_whitelist_fail(self):
        ok, errors = validate_tables_and_columns("SELECT * FROM secret_table")
        assert not ok
        assert any("secret_table" in e for e in errors)


# ─── Explain Builder Tests ────────────────────────────────────────────────────

class TestExplainBuilder:
    def test_basic_explain(self):
        sql = """SELECT region, SUM(quantity * unit_price) as revenue
                 FROM orders
                 WHERE order_date BETWEEN '2024-04-01' AND '2024-06-30'
                 GROUP BY region
                 ORDER BY revenue DESC
                 LIMIT 100"""
        result = build_explain(sql, "Shows revenue by region in Q2 2024")
        assert "orders" in result["sourceTables"]
        assert "region" in result["groupBy"]
        assert any("revenue" in a.lower() for a in result["aggregates"])
        assert len(result["filters"]) > 0
        assert result["naturalExplanation"] == "Shows revenue by region in Q2 2024"

    def test_multi_table_explain(self):
        sql = """SELECT p.product_line, SUM(o.quantity * o.unit_price) as revenue
                 FROM orders o
                 JOIN products p ON o.product_id = p.product_id
                 GROUP BY p.product_line
                 LIMIT 100"""
        result = build_explain(sql)
        assert "orders" in result["sourceTables"]
        assert "products" in result["sourceTables"]

    def test_no_where_clause(self):
        sql = "SELECT region, COUNT(*) as cnt FROM orders GROUP BY region LIMIT 50"
        result = build_explain(sql)
        assert result["filters"] == []

    def test_aggregate_extraction(self):
        sql = "SELECT SUM(quantity) as total_qty, AVG(unit_price) as avg_price FROM orders LIMIT 1"
        result = build_explain(sql)
        aggs = [a.upper() for a in result["aggregates"]]
        assert any("SUM" in a for a in aggs)
        assert any("AVG" in a for a in aggs)


# ─── Viz Inference Tests ──────────────────────────────────────────────────────

class TestVizInference:
    def test_bar_chart(self):
        cols = ["region", "revenue"]
        rows = [["North", 15000], ["South", 12000], ["East", 9000], ["West", 11000]]
        assert infer_chart_type(cols, rows) == "bar"

    def test_line_chart_temporal(self):
        cols = ["order_date", "revenue"]
        rows = [["2024-01", 5000], ["2024-02", 6200], ["2024-03", 7100]]
        assert infer_chart_type(cols, rows) == "line"

    def test_line_chart_year(self):
        cols = ["year", "total_revenue"]
        rows = [["2022", 100000], ["2023", 120000], ["2024", 140000]]
        assert infer_chart_type(cols, rows) == "line"

    def test_no_chart_all_numeric(self):
        cols = ["total_revenue", "avg_price"]
        rows = [[145000, 450.00]]
        assert infer_chart_type(cols, rows) is None

    def test_no_chart_empty(self):
        assert infer_chart_type([], []) is None

    def test_no_chart_single_col(self):
        assert infer_chart_type(["region"], [["North"]]) is None

    def test_bar_chart_product_line(self):
        cols = ["product_line", "revenue"]
        rows = [["Hardware", 50000], ["Software", 30000], ["Services", 20000]]
        assert infer_chart_type(cols, rows) == "bar"


# ─── Schema Registry Tests ────────────────────────────────────────────────────

class TestSchemaRegistry:
    def test_allowed_tables(self):
        from app.schema_registry import ALLOWED_TABLES
        assert "orders" in ALLOWED_TABLES
        assert "customers" in ALLOWED_TABLES
        assert "products" in ALLOWED_TABLES
        assert "secret" not in ALLOWED_TABLES

    def test_allowed_columns(self):
        cols = get_allowed_columns("orders")
        assert "order_id" in cols
        assert "revenue" in cols   # derived column
        assert "nonexistent" not in cols

    def test_schema_prompt_context(self):
        ctx = get_schema_prompt_context()
        assert "orders" in ctx
        assert "customers" in ctx
        assert "revenue" in ctx


# ─── API Integration Tests ────────────────────────────────────────────────────



class TestAPIEndpoints:
    @pytest.fixture(autouse=True)
    def setup_client(self):
        from fastapi.testclient import TestClient
        from app.main import app
        with TestClient(app) as client:
            self.client = client
            yield

    def test_health(self):
        r = self.client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_schema_describe(self):
        r = self.client.get("/api/schema/describe")
        assert r.status_code == 200
        names = [t["name"] for t in r.json()["tables"]]
        assert "orders" in names
        assert "customers" in names

    def test_execute_valid_sql(self):
        sql = "SELECT region, SUM(quantity * unit_price) as revenue FROM orders GROUP BY region LIMIT 10"
        r = self.client.post("/api/nlq/execute", json={"sql": sql})
        assert r.status_code == 200
        data = r.json()
        assert "columns" in data
        assert "rows" in data
        assert "inferred_chart" in data
        assert len(data["rows"]) > 0

    def test_execute_unsafe_sql_rejected(self):
        r = self.client.post("/api/nlq/execute", json={"sql": "DROP TABLE orders"})
        assert r.status_code == 422

    def test_execute_unknown_table_rejected(self):
        r = self.client.post("/api/nlq/execute", json={"sql": "SELECT * FROM hackers LIMIT 1"})
        assert r.status_code == 422

    def test_execute_returns_chart_type(self):
        sql = "SELECT region, SUM(quantity * unit_price) as revenue FROM orders GROUP BY region LIMIT 10"
        r = self.client.post("/api/nlq/execute", json={"sql": sql})
        assert r.json()["inferred_chart"] == "bar"

    @patch('app.nlq_parser._call_hf')
    def test_parse_returns_explain(self, mock_call_hf):
        import json as _json
        mock_call_hf.return_value = _json.dumps({
            "sql": "SELECT region, SUM(quantity * unit_price) as revenue "
                   "FROM orders WHERE order_date BETWEEN '2024-04-01' AND '2024-06-30' "
                   "GROUP BY region LIMIT 100",
            "explanation": "Revenue by region in Q2 2024"
        })
        r = self.client.post("/api/nlq/parse", json={"prompt": "revenue by region in Q2 2024"})
        assert r.status_code == 200, r.json()
        data = r.json()
        assert "sql" in data
        assert "explain" in data
        assert "conversation_id" in data
        explain = data["explain"]
        assert "filters" in explain
        assert "groupBy" in explain
        assert "aggregates" in explain
        assert "sourceTables" in explain

    @patch('app.nlq_parser._call_hf')
    def test_query_backward_compat(self, mock_call_hf):
        """columns/rows/inferred_chart/sql must always be present."""
        import json as _json
        mock_call_hf.return_value = _json.dumps({
            "sql": "SELECT region, SUM(quantity * unit_price) as revenue "
                   "FROM orders GROUP BY region LIMIT 50",
            "explanation": "All revenue by region"
        })
        r = self.client.post("/api/nlq/query", json={"prompt": "revenue by region"})
        assert r.status_code == 200, r.json()
        data = r.json()
        assert "columns" in data
        assert "rows" in data
        assert "inferred_chart" in data
        assert "sql" in data
        assert "explain" in data   # additive — must also be present

    @patch('app.nlq_parser._call_hf')
    def test_conversation_refine(self, mock_call_hf):
        """Follow-up uses conversation history correctly."""
        import json as _json
        mock_call_hf.return_value = _json.dumps({
            "sql": "SELECT region, SUM(quantity * unit_price) as revenue "
                   "FROM orders GROUP BY region LIMIT 100",
            "explanation": "Revenue by region"
        })
        r1 = self.client.post("/api/nlq/query", json={"prompt": "revenue by region"})
        assert r1.status_code == 200, r1.json()
        cid = r1.json()["conversation_id"]

        mock_call_hf.return_value = _json.dumps({
            "sql": "SELECT region, p.product_line, SUM(o.quantity * o.unit_price) as revenue "
                   "FROM orders o JOIN products p ON o.product_id=p.product_id "
                   "GROUP BY region, p.product_line LIMIT 100",
            "explanation": "Revenue by region and product line"
        })
        r2 = self.client.post("/api/conversation/refine", json={
            "conversation_id": cid,
            "followup": "break it down by product line"
        })
        assert r2.status_code == 200, r2.json()
        data = r2.json()
        assert "columns" in data
        assert "rows" in data