from __future__ import annotations
import json
from pathlib import Path
from threading import Lock
from models import Order, Product

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
PRODUCTS_FILE = DATA_DIR / "products.json"
ORDERS_FILE = DATA_DIR / "orders.json"
DATES_FILE = DATA_DIR / "available_dates.json"
_lock = Lock()


def _ensure_file(path: Path, default: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_text(default, encoding="utf-8")


# ── Products ──────────────────────────────────────────────────────────────────

def read_products() -> list[Product]:
    _ensure_file(PRODUCTS_FILE, '{"products": []}')
    with _lock:
        payload = json.loads(PRODUCTS_FILE.read_text(encoding="utf-8"))
    return [Product.model_validate(item) for item in payload.get("products", [])]


def write_products(products: list[Product]) -> None:
    _ensure_file(PRODUCTS_FILE, '{"products": []}')
    payload = {
        "products": [
            {
                **item.model_dump(),
                "created_at": item.created_at.isoformat(),
                "updated_at": item.updated_at.isoformat(),
            }
            for item in products
        ]
    }
    _atomic_write(PRODUCTS_FILE, payload)


# ── Orders ────────────────────────────────────────────────────────────────────

def read_orders() -> list[Order]:
    _ensure_file(ORDERS_FILE, '{"orders": []}')
    with _lock:
        payload = json.loads(ORDERS_FILE.read_text(encoding="utf-8"))
    return [Order.model_validate(item) for item in payload.get("orders", [])]


def write_orders(orders: list[Order]) -> None:
    _ensure_file(ORDERS_FILE, '{"orders": []}')
    payload = {
        "orders": [
            {**item.model_dump(), "created_at": item.created_at.isoformat()}
            for item in orders
        ]
    }
    _atomic_write(ORDERS_FILE, payload)


# ── Available dates ───────────────────────────────────────────────────────────

def read_available_dates() -> list[str]:
    _ensure_file(DATES_FILE, '{"dates": []}')
    with _lock:
        payload = json.loads(DATES_FILE.read_text(encoding="utf-8"))
    return payload.get("dates", [])


def write_available_dates(dates: list[str]) -> None:
    _ensure_file(DATES_FILE, '{"dates": []}')
    _atomic_write(DATES_FILE, {"dates": dates})


# ── Internal ──────────────────────────────────────────────────────────────────

def _atomic_write(path: Path, payload: dict) -> None:
    temp = path.with_suffix(".tmp")
    with _lock:
        temp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        temp.replace(path)
