from __future__ import annotations
import json
import os
from pathlib import Path
from datetime import datetime

from sqlalchemy import DateTime, JSON, String, create_engine, select
from sqlalchemy.orm import Mapped, Session, declarative_base, mapped_column, sessionmaker

from models import Order, Product


def _build_database_url() -> str:
    url = os.getenv("DATABASE_URL", "sqlite:////tmp/app.db")
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg://", 1)
    elif url.startswith("postgresql://") and "+" not in url.split("://", 1)[0]:
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    elif url.startswith("postgresql+psycopg2://"):
        url = url.replace("postgresql+psycopg2://", "postgresql+psycopg://", 1)
    return url


Base = declarative_base()
_engine = None
_SessionLocal = None


def _get_engine():
    global _engine, _SessionLocal
    if _engine is None:
        url = _build_database_url()
        connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
        _engine = create_engine(url, pool_pre_ping=True, connect_args=connect_args)
        _SessionLocal = sessionmaker(bind=_engine, autoflush=False, autocommit=False, expire_on_commit=False)
    return _engine

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
PRODUCTS_FILE = DATA_DIR / "products.json"
ORDERS_FILE = DATA_DIR / "orders.json"
DATES_FILE = DATA_DIR / "available_dates.json"


class ProductRecord(Base):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    data: Mapped[dict] = mapped_column(JSON, nullable=False)


class OrderRecord(Base):
    __tablename__ = "orders"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    data: Mapped[dict] = mapped_column(JSON, nullable=False)


class MetaRecord(Base):
    __tablename__ = "meta"

    key: Mapped[str] = mapped_column(String(128), primary_key=True)
    value: Mapped[dict] = mapped_column(JSON, nullable=False)


def init_db() -> None:
    Base.metadata.create_all(bind=_get_engine())


def _session() -> Session:
    _get_engine()  # ensure engine initialized
    return _SessionLocal()


# ── Products ──────────────────────────────────────────────────────────────────

def read_products() -> list[Product]:
    with _session() as session:
        rows = session.execute(select(ProductRecord)).scalars().all()
    return [Product.model_validate(item.data) for item in rows]


def write_products(products: list[Product]) -> None:
    with _session() as session:
        session.query(ProductRecord).delete()
        for item in products:
            payload = {
                **item.model_dump(),
                "created_at": item.created_at.isoformat(),
                "updated_at": item.updated_at.isoformat(),
            }
            session.add(ProductRecord(id=item.id, data=payload))
        session.commit()


# ── Orders ────────────────────────────────────────────────────────────────────

def read_orders() -> list[Order]:
    with _session() as session:
        rows = session.execute(select(OrderRecord).order_by(OrderRecord.created_at.desc())).scalars().all()
    return [Order.model_validate(item.data) for item in rows]


def write_orders(orders: list[Order]) -> None:
    with _session() as session:
        session.query(OrderRecord).delete()
        for item in orders:
            payload = {**item.model_dump(), "created_at": item.created_at.isoformat()}
            session.add(
                OrderRecord(
                    id=item.id,
                    status=item.status,
                    created_at=item.created_at,
                    data=payload,
                )
            )
        session.commit()


# ── Available dates ───────────────────────────────────────────────────────────

def read_available_dates() -> list[str]:
    with _session() as session:
        row = session.get(MetaRecord, "available_dates")
    if not row:
        return []
    return row.value.get("dates", [])


def write_available_dates(dates: list[str]) -> None:
    with _session() as session:
        row = session.get(MetaRecord, "available_dates")
        payload = {"dates": dates}
        if not row:
            session.add(MetaRecord(key="available_dates", value=payload))
        else:
            row.value = payload
        session.commit()


def seed_products_from_file_if_empty(path: Path = PRODUCTS_FILE) -> None:
    with _session() as session:
        existing = session.execute(select(ProductRecord.id).limit(1)).first()
        if existing:
            return

    if not path.exists():
        return

    payload = json.loads(path.read_text(encoding="utf-8"))
    items = [Product.model_validate(item) for item in payload.get("products", [])]
    if not items:
        return
    write_products(items)


def seed_orders_from_file_if_empty(path: Path = ORDERS_FILE) -> None:
    with _session() as session:
        existing = session.execute(select(OrderRecord.id).limit(1)).first()
        if existing:
            return

    if not path.exists():
        return

    payload = json.loads(path.read_text(encoding="utf-8"))
    items = [Order.model_validate(item) for item in payload.get("orders", [])]
    if not items:
        return
    write_orders(items)


def seed_available_dates_from_file_if_empty(path: Path = DATES_FILE) -> None:
    with _session() as session:
        existing = session.get(MetaRecord, "available_dates")
        if existing:
            return

    if not path.exists():
        return

    payload = json.loads(path.read_text(encoding="utf-8"))
    dates = payload.get("dates", [])
    if not isinstance(dates, list):
        return
    write_available_dates([str(d) for d in dates])


def seed_legacy_data_if_empty() -> None:
    seed_products_from_file_if_empty()
    seed_orders_from_file_if_empty()
    seed_available_dates_from_file_if_empty()
