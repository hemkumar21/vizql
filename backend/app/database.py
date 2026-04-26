"""
database.py
SQLite setup with SQLAlchemy. Creates tables and seeds sample data.
"""
import os
from sqlalchemy import create_engine, text
from sqlalchemy.pool import StaticPool

DB_PATH = os.environ.get("DB_PATH", "./nlq_app.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

CREATE_TABLES = """
CREATE TABLE IF NOT EXISTS customers (
    customer_id INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    segment     TEXT NOT NULL,
    country     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
    product_id   INTEGER PRIMARY KEY,
    product_line TEXT NOT NULL,
    category     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
    order_id    INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(customer_id),
    product_id  INTEGER NOT NULL REFERENCES products(product_id),
    order_date  DATE NOT NULL,
    quantity    INTEGER NOT NULL,
    unit_price  DECIMAL(10,2) NOT NULL,
    region      TEXT NOT NULL
);
"""

SEED_DATA = """
INSERT OR IGNORE INTO customers VALUES
(1,  'Acme Corp',        'Enterprise',  'USA'),
(2,  'Beta LLC',         'SMB',         'UK'),
(3,  'Gamma Inc',        'Enterprise',  'Germany'),
(4,  'Delta Co',         'SMB',         'USA'),
(5,  'Epsilon Ltd',      'Startup',     'France'),
(6,  'Zeta Partners',    'Enterprise',  'USA'),
(7,  'Eta Industries',   'SMB',         'Canada'),
(8,  'Theta Group',      'Startup',     'Australia'),
(9,  'Iota Solutions',   'Enterprise',  'UK'),
(10, 'Kappa Retail',     'SMB',         'USA');

INSERT OR IGNORE INTO products VALUES
(1,  'Hardware',     'Laptops'),
(2,  'Hardware',     'Monitors'),
(3,  'Software',     'Productivity'),
(4,  'Software',     'Security'),
(5,  'Services',     'Consulting'),
(6,  'Services',     'Support'),
(7,  'Hardware',     'Peripherals'),
(8,  'Software',     'Analytics'),
(9,  'Services',     'Training'),
(10, 'Hardware',     'Servers');

INSERT OR IGNORE INTO orders VALUES
(1,  1, 1,  '2024-01-15', 10, 1200.00, 'North'),
(2,  2, 3,  '2024-01-22', 5,  450.00,  'East'),
(3,  3, 2,  '2024-02-10', 8,  350.00,  'West'),
(4,  4, 5,  '2024-02-28', 3,  2000.00, 'South'),
(5,  5, 4,  '2024-03-05', 12, 200.00,  'East'),
(6,  1, 6,  '2024-04-01', 6,  500.00,  'North'),
(7,  6, 7,  '2024-04-14', 20, 80.00,   'West'),
(8,  7, 1,  '2024-04-20', 4,  1200.00, 'North'),
(9,  2, 8,  '2024-05-03', 7,  300.00,  'East'),
(10, 8, 9,  '2024-05-15', 2,  1500.00, 'South'),
(11, 3, 10, '2024-05-28', 1,  8000.00, 'West'),
(12, 9, 3,  '2024-06-02', 15, 450.00,  'East'),
(13, 4, 2,  '2024-06-10', 6,  350.00,  'South'),
(14, 5, 1,  '2024-06-25', 3,  1200.00, 'North'),
(15, 10,5,  '2024-06-30', 8,  2000.00, 'West'),
(16, 1, 4,  '2024-07-08', 10, 200.00,  'North'),
(17, 6, 6,  '2024-07-20', 5,  500.00,  'East'),
(18, 7, 3,  '2024-08-01', 18, 450.00,  'West'),
(19, 8, 7,  '2024-08-15', 30, 80.00,   'South'),
(20, 9, 1,  '2024-08-22', 6,  1200.00, 'North'),
(21, 10,8,  '2024-09-05', 9,  300.00,  'East'),
(22, 2, 10, '2024-09-18', 2,  8000.00, 'West'),
(23, 3, 5,  '2024-09-30', 4,  2000.00, 'South'),
(24, 4, 9,  '2024-10-10', 1,  1500.00, 'North'),
(25, 5, 2,  '2024-10-22', 10, 350.00,  'East'),
(26, 1, 3,  '2024-11-05', 8,  450.00,  'North'),
(27, 6, 4,  '2024-11-18', 14, 200.00,  'West'),
(28, 7, 6,  '2024-11-30', 6,  500.00,  'South'),
(29, 8, 1,  '2024-12-10', 5,  1200.00, 'East'),
(30, 9, 8,  '2024-12-20', 11, 300.00,  'North');
"""


def init_db():
    """Create tables and seed with sample data."""
    with engine.connect() as conn:
        for statement in CREATE_TABLES.strip().split(";"):
            s = statement.strip()
            if s:
                conn.execute(text(s))
        for statement in SEED_DATA.strip().split(";"):
            s = statement.strip()
            if s:
                try:
                    conn.execute(text(s))
                except Exception:
                    pass  # Already seeded
        conn.commit()


def execute_query(sql: str):
    """
    Execute a validated SQL query and return (columns, rows).
    Returns: (list[str], list[list[Any]])
    """
    with engine.connect() as conn:
        result = conn.execute(text(sql))
        columns = list(result.keys())
        rows = [list(row) for row in result.fetchall()]
    return columns, rows