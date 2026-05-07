from __future__ import annotations
import json
import os
import uuid
from pathlib import Path
from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, JSON, String, create_engine, select
from sqlalchemy.orm import Mapped, Session, declarative_base, mapped_column, sessionmaker

from models import Order, Product


def _build_database_url() -> str:
    url = os.getenv("DATABASE_URL", "sqlite:////tmp/app.db")
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif url.startswith("postgresql://") and "+" not in url.split("://", 1)[0]:
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
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


class ReservationRecord(Base):
    """Tracks how many units of a product are reserved per date."""
    __tablename__ = "reservations"

    product_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    date: Mapped[str] = mapped_column(String(10), primary_key=True)  # YYYY-MM-DD
    count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class NotificationRecord(Base):
    """Stores restock notification requests from customers."""
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    email: Mapped[str] = mapped_column(String(256), nullable=False, index=True)
    product_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    product_name: Mapped[str] = mapped_column(String(256), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class UserRecord(Base):
    """Registered customer accounts."""
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    email: Mapped[str] = mapped_column(String(256), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    phone: Mapped[str] = mapped_column(String(30), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


def init_db() -> None:
    Base.metadata.create_all(bind=_get_engine())
    _migrate_reservations_from_orders()


def _session() -> Session:
    _get_engine()  # ensure engine initialized
    return _SessionLocal()


def _rebuild_reservations_from_orders(session: Session) -> None:
    """Rebuild reservations table from active orders. Called inside an open session."""
    active_orders = [
        Order.model_validate(r.data)
        for r in session.execute(select(OrderRecord)).scalars().all()
        if r.status in ("pending", "confirmed")
    ]
    counts: dict[tuple[str, str], int] = {}
    for order in active_orders:
        for item in order.items:
            for date in order.dates:
                key = (item.product_id, date)
                counts[key] = counts.get(key, 0) + 1

    # DELETE first, flush immediately so the SQL is sent before any INSERT
    session.query(ReservationRecord).delete(synchronize_session=False)
    session.flush()

    if not counts:
        return

    records = [
        {"product_id": pid, "date": date, "count": cnt}
        for (pid, date), cnt in counts.items()
    ]

    # Use ON CONFLICT DO NOTHING so concurrent cold-starts don't crash
    try:
        from sqlalchemy.dialects.postgresql import insert as _pg_insert
        stmt = _pg_insert(ReservationRecord).values(records).on_conflict_do_nothing()
        session.execute(stmt)
    except ImportError:
        # SQLite fallback
        for r in records:
            session.add(ReservationRecord(**r))


def _migrate_reservations_from_orders() -> None:
    """Always rebuild reservations from active orders on startup."""
    with _session() as session:
        _rebuild_reservations_from_orders(session)
        session.commit()


def get_reserved_counts(product_ids: list[str], dates: list[str]) -> dict[tuple[str, str], int]:
    """Returns {(product_id, date): count} for the given products and dates."""
    if not product_ids or not dates:
        return {}
    with _session() as session:
        rows = session.execute(
            select(ReservationRecord).where(
                ReservationRecord.product_id.in_(product_ids),
                ReservationRecord.date.in_(dates),
            )
        ).scalars().all()
    return {(r.product_id, r.date): r.count for r in rows}


def reserve_if_available(
    items: list[tuple[str, str, int]],  # [(product_id, product_name, stock), ...]
    dates: list[str],
) -> str | None:
    """
    Atomically check availability and reserve in ONE transaction.
    Returns None on success, or an error message string if any item is unavailable.
    """
    if not items or not dates:
        return None
    product_ids = [pid for pid, _, _ in items]
    with _session() as session:
        # Lock rows for update (PostgreSQL) or just read (SQLite)
        rows = {
            (r.product_id, r.date): r
            for r in session.execute(
                select(ReservationRecord).where(
                    ReservationRecord.product_id.in_(product_ids),
                    ReservationRecord.date.in_(dates),
                ).with_for_update()
            ).scalars().all()
        }
        # Check each item
        for product_id, product_name, stock in items:
            for date in dates:
                current = rows.get((product_id, date))
                count = current.count if current else 0
                if count >= stock:
                    return f"Товар «{product_name}» недоступен на {date}"
        # All OK — increment
        for product_id, _, _ in items:
            for date in dates:
                row = rows.get((product_id, date))
                if row:
                    row.count += 1
                else:
                    new_row = ReservationRecord(product_id=product_id, date=date, count=1)
                    session.add(new_row)
        session.commit()
    return None


def increment_reservations(product_ids: list[str], dates: list[str], delta: int = 1) -> None:
    """Atomically increment (or decrement if delta<0) reservation counts."""
    if not product_ids or not dates:
        return
    with _session() as session:
        for pid in product_ids:
            for date in dates:
                row = session.get(ReservationRecord, (pid, date))
                if row:
                    row.count = max(0, row.count + delta)
                elif delta > 0:
                    session.add(ReservationRecord(product_id=pid, date=date, count=delta))
        session.commit()



# ── Products ──────────────────────────────────────────────────────────────────

def read_products() -> list[Product]:
    with _session() as session:
        rows = session.execute(select(ProductRecord)).scalars().all()
    result = []
    for item in rows:
        try:
            data = item.data
            # Normalize options: filter out any non-dict entries
            if isinstance(data, dict) and isinstance(data.get("options"), list):
                data["options"] = [
                    o for o in data["options"] if isinstance(o, dict)
                ]
            result.append(Product.model_validate(data))
        except Exception:
            pass
    return result


def _serialize_product(item: Product) -> dict:
    return json.loads(item.model_dump_json())


def write_products(products: list[Product]) -> None:
    """Full replace — only used by seed. Prefer upsert_product/delete_product for API calls."""
    with _session() as session:
        existing_ids = set(row[0] for row in session.execute(select(ProductRecord.id)).all())
        incoming_ids = {item.id for item in products}
        # Delete removed
        for dead_id in existing_ids - incoming_ids:
            session.query(ProductRecord).filter(ProductRecord.id == dead_id).delete()
        # Upsert
        for item in products:
            payload = _serialize_product(item)
            row = session.get(ProductRecord, item.id)
            if row:
                row.data = payload
            else:
                session.add(ProductRecord(id=item.id, data=payload))
        session.commit()


def upsert_product(item: Product) -> None:
    """Insert or update a single product by id."""
    with _session() as session:
        payload = _serialize_product(item)
        row = session.get(ProductRecord, item.id)
        if row:
            row.data = payload
        else:
            session.add(ProductRecord(id=item.id, data=payload))
        session.commit()


def delete_product_by_id(product_id: str) -> bool:
    """Delete a single product. Returns True if found and deleted."""
    with _session() as session:
        row = session.get(ProductRecord, product_id)
        if not row:
            return False
        session.delete(row)
        session.commit()
        return True


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


# ── Notes ─────────────────────────────────────────────────────────────────────

def read_notes() -> list[dict]:
    """Returns list of note dicts: {id, text, created_at}"""
    with _session() as session:
        row = session.get(MetaRecord, "admin_notes")
    if not row:
        return []
    return row.value.get("notes", [])


def write_notes(notes: list[dict]) -> None:
    with _session() as session:
        row = session.get(MetaRecord, "admin_notes")
        payload = {"notes": notes}
        if not row:
            session.add(MetaRecord(key="admin_notes", value=payload))
        else:
            row.value = payload
        session.commit()


# ── Reservations ──────────────────────────────────────────────────────────────

def get_reserved_counts(product_ids: list[str], dates: list[str]) -> dict[tuple[str, str], int]:
    """Returns {(product_id, date): count} for the given products and dates."""
    if not product_ids or not dates:
        return {}
    with _session() as session:
        rows = session.execute(
            select(ReservationRecord).where(
                ReservationRecord.product_id.in_(product_ids),
                ReservationRecord.date.in_(dates),
            )
        ).scalars().all()
    return {(r.product_id, r.date): r.count for r in rows}


def increment_reservations(product_ids: list[str], dates: list[str], delta: int = 1) -> None:
    """Atomically increment (or decrement if delta<0) reservation counts."""
    if not product_ids or not dates:
        return
    with _session() as session:
        for pid in product_ids:
            for date in dates:
                row = session.get(ReservationRecord, (pid, date))
                if row:
                    row.count = max(0, row.count + delta)
                elif delta > 0:
                    session.add(ReservationRecord(product_id=pid, date=date, count=delta))
        session.commit()


def seed_products_from_file_if_empty(path: Path = PRODUCTS_FILE) -> None:
    """Seed only products whose id doesn't exist in the DB yet."""
    if not path.exists():
        return

    with _session() as session:
        existing_ids = set(row[0] for row in session.execute(select(ProductRecord.id)).all())

    payload = json.loads(path.read_text(encoding="utf-8"))
    items = [Product.model_validate(item) for item in payload.get("products", [])]
    new_items = [item for item in items if item.id not in existing_ids]
    for item in new_items:
        upsert_product(item)


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


# ── Notifications ─────────────────────────────────────────────────────────────

def save_notification(email: str, product_id: str, product_name: str) -> None:
    """Store a restock notification request. Ignores duplicates."""
    with _session() as session:
        existing = session.execute(
            select(NotificationRecord).where(
                NotificationRecord.email == email,
                NotificationRecord.product_id == product_id,
            )
        ).scalar_one_or_none()
        if not existing:
            session.add(NotificationRecord(
                id=str(uuid.uuid4()),
                email=email,
                product_id=product_id,
                product_name=product_name,
                created_at=datetime.now(timezone.utc),
            ))
            session.commit()


def get_notifications_for_product(product_id: str) -> list[dict]:
    """Return all notification subscribers for a given product."""
    with _session() as session:
        rows = session.execute(
            select(NotificationRecord).where(NotificationRecord.product_id == product_id)
        ).scalars().all()
        return [{"email": r.email, "product_id": r.product_id, "product_name": r.product_name} for r in rows]


def delete_notifications_for_product(product_id: str) -> None:
    """Remove all notification subscriptions for a product (after restock emails sent)."""
    with _session() as session:
        session.query(NotificationRecord).filter(NotificationRecord.product_id == product_id).delete()
        session.commit()


# ── Users ─────────────────────────────────────────────────────────────────────

def create_user(user_id: str, email: str, password_hash: str, name: str, phone: str) -> UserRecord | None:
    """Create a new user. Returns None if email already exists."""
    with _session() as session:
        existing = session.execute(
            select(UserRecord).where(UserRecord.email == email)
        ).scalar_one_or_none()
        if existing:
            return None
        record = UserRecord(
            id=user_id,
            email=email,
            password_hash=password_hash,
            name=name,
            phone=phone,
            created_at=datetime.now(timezone.utc),
        )
        session.add(record)
        session.commit()
        session.refresh(record)
        return record


def get_user_by_email(email: str) -> UserRecord | None:
    with _session() as session:
        return session.execute(
            select(UserRecord).where(UserRecord.email == email)
        ).scalar_one_or_none()


def get_user_by_id(user_id: str) -> UserRecord | None:
    with _session() as session:
        return session.get(UserRecord, user_id)


def update_user(user_id: str, **fields) -> UserRecord | None:
    with _session() as session:
        record = session.get(UserRecord, user_id)
        if not record:
            return None
        for key, value in fields.items():
            if value is not None:
                setattr(record, key, value)
        session.commit()
        session.refresh(record)
        return record


def get_orders_by_email(email: str) -> list:
    """Return orders matching a customer email, newest first."""
    from models import Order
    with _session() as session:
        rows = session.execute(
            select(OrderRecord).order_by(OrderRecord.created_at.desc())
        ).scalars().all()
    results = []
    for row in rows:
        try:
            order = Order.model_validate(row.data)
            if order.email.lower() == email.lower():
                results.append(order)
        except Exception:
            pass
    return results
