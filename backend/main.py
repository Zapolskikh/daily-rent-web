from __future__ import annotations

import os
import sys
import secrets
from pathlib import Path

# Ensure backend/ is on sys.path when running as a Vercel serverless function
_backend_dir = Path(__file__).resolve().parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from models import (
    AdminLoginRequest,
    AdminLoginResponse,
    AvailabilityCheck,
    AvailabilityResult,
    AvailableDatesPayload,
    CategoriesResponse,
    ContactRequest,
    MessageResponse,
    NotifyRequest,
    Order,
    OrderCreate,
    OrderStatusUpdate,
    OrdersResponse,
    Product,
    ProductCreate,
    ProductUpdate,
    ProductsResponse,
    utc_now,
)
from services.email_service import EmailConfigError, send_contact_email, send_order_email
from services.object_storage import ObjectStorageConfigError, save_product_image
from services.storage import (
    delete_product_by_id,
    init_db,
    read_available_dates,
    read_orders,
    read_products,
    seed_legacy_data_if_empty,
    upsert_product,
    write_available_dates,
    write_orders,
)
from services.telegram_service import (
    TelegramConfigError,
    send_contact_telegram,
    send_order_telegram,
    send_telegram_message,
)

BASE_DIR = Path(__file__).resolve().parent
UPLOADS_DIR = BASE_DIR / "uploads"
try:
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
except OSError:
    pass


def _detect_default_product_image_url() -> str:
    from_env = os.getenv("DEFAULT_PRODUCT_IMAGE_URL", "").strip()
    if from_env:
        return from_env
    try:
        preferred = UPLOADS_DIR / "tmp_image.jpg"
        if preferred.exists():
            return "/uploads/tmp_image.jpg"
        allowed = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}
        for item in sorted(UPLOADS_DIR.iterdir(), key=lambda p: p.name.lower()):
            if item.is_file() and item.suffix.lower() in allowed:
                return f"/uploads/{item.name}"
    except OSError:
        pass
    return ""


DEFAULT_PRODUCT_IMAGE_URL = _detect_default_product_image_url()

app = FastAPI(title="Rent Prague API", version="2.0.0")


@app.on_event("startup")
def startup() -> None:
    init_db()
    seed_legacy_data_if_empty()

origins = [os.getenv("APP_ORIGIN", "http://localhost:5173")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)
serializer = URLSafeTimedSerializer(os.getenv("APP_SECRET", "change_me"), salt="admin-auth")

CATEGORIES = [
    {"slug": "party", "name": "Для тусовок (Премиум)"},
    {"slug": "travel", "name": "Для путешествий"},
    {"slug": "repair", "name": "Для ремонта самому"},
]


def make_admin_token() -> str:
    return serializer.dumps({"role": "admin"})


def verify_admin(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> str:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = credentials.credentials
    try:
        payload = serializer.loads(token, max_age=60 * 60 * 12)
    except SignatureExpired as exc:
        raise HTTPException(status_code=401, detail="Token expired") from exc
    except BadSignature as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    return token


def _notify_both(send_email_fn, send_tg_fn, *args) -> None:
    """Send notification via email and Telegram, ignoring non-critical failures."""
    try:
        send_email_fn(*args)
    except EmailConfigError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to send email") from exc
    try:
        send_tg_fn(*args)
    except (TelegramConfigError, Exception):
        pass  # Telegram is best-effort; do not block the response


# ─── Health ────────────────────────────────────────────────────────────────────

@app.get("/api/health", response_model=MessageResponse)
def health() -> MessageResponse:
    return MessageResponse(message="ok")


# ─── Catalog ──────────────────────────────────────────────────────────────────

@app.get("/api/categories", response_model=CategoriesResponse)
def get_categories() -> CategoriesResponse:
    return CategoriesResponse(categories=CATEGORIES)


@app.get("/api/products", response_model=ProductsResponse)
def get_products(category: str | None = None) -> ProductsResponse:
    products = read_products()
    if DEFAULT_PRODUCT_IMAGE_URL:
        products = [
            item if item.image_url else item.model_copy(update={"image_url": DEFAULT_PRODUCT_IMAGE_URL})
            for item in products
        ]
    if category:
        products = [item for item in products if item.category == category]
    return ProductsResponse(products=products)


# ─── Contact ──────────────────────────────────────────────────────────────────

@app.post("/api/contact", response_model=MessageResponse)
def send_contact(payload: ContactRequest) -> MessageResponse:
    _notify_both(send_contact_email, send_contact_telegram, payload)
    return MessageResponse(message="Заявка отправлена")


# ─── Available dates ─────────────────────────────────────────────────────────

@app.get("/api/available-dates")
def get_available_dates() -> dict:
    return {"dates": read_available_dates()}


# ─── Availability check ───────────────────────────────────────────────────────

@app.post("/api/availability", response_model=AvailabilityResult)
def check_availability(payload: AvailabilityCheck) -> AvailabilityResult:
    if not payload.dates:
        return AvailabilityResult(unavailable_product_ids=[])

    products_map = {p.id: p for p in read_products()}
    orders = [o for o in read_orders() if o.status == "confirmed"]

    requested_dates = set(payload.dates)
    requested_ids = {item.product_id for item in payload.items}

    # Count how many of each product is already booked for these dates
    booked: dict[str, int] = {}
    for order in orders:
        if not set(order.dates) & requested_dates:
            continue
        for item in order.items:
            if item.product_id in requested_ids:
                booked[item.product_id] = booked.get(item.product_id, 0) + 1

    unavailable = []
    for product_id in requested_ids:
        product = products_map.get(product_id)
        if product is None:
            unavailable.append(product_id)
            continue
        if booked.get(product_id, 0) >= product.stock_quantity:
            unavailable.append(product_id)

    return AvailabilityResult(unavailable_product_ids=unavailable)


# ─── Orders ───────────────────────────────────────────────────────────────────

@app.post("/api/orders", response_model=Order)
def create_order(payload: OrderCreate) -> Order:
    # Calculate total
    total = 0.0
    days = max(len(payload.dates), 1)
    for item in payload.items:
        options_total = sum(o.price for o in item.selected_options)
        total += (item.price_per_day + options_total) * days

    order = Order(
        id=secrets.token_urlsafe(8),
        **payload.model_dump(),
        total_price=round(total, 2),
        status="pending",
        created_at=utc_now(),
    )
    orders = read_orders()
    orders.append(order)
    write_orders(orders)

    _notify_both(send_order_email, send_order_telegram, order)
    return order


@app.get("/api/orders", response_model=OrdersResponse)
def list_orders(_: str = Depends(verify_admin)) -> OrdersResponse:
    return OrdersResponse(orders=read_orders())


@app.put("/api/admin/orders/{order_id}/status", response_model=Order)
def update_order_status(
    order_id: str,
    payload: OrderStatusUpdate,
    _: str = Depends(verify_admin),
) -> Order:
    orders = read_orders()
    for index, order in enumerate(orders):
        if order.id != order_id:
            continue
        updated = order.model_copy(update={"status": payload.status})
        orders[index] = updated
        write_orders(orders)
        return updated
    raise HTTPException(status_code=404, detail="Order not found")


# ─── Notify on availability ───────────────────────────────────────────────────

@app.post("/api/notify-availability", response_model=MessageResponse)
def notify_availability(payload: NotifyRequest) -> MessageResponse:
    text = (
        f"<b>🔔 Запрос на уведомление о доступности</b>\n"
        f"Товар: {payload.product_name} ({payload.product_id})\n"
        f"Email клиента: {payload.email}"
    )
    try:
        send_telegram_message(text)
    except (TelegramConfigError, Exception):
        pass
    return MessageResponse(message="Запрос принят")


# ─── Admin: login ─────────────────────────────────────────────────────────────

@app.post("/api/admin/login", response_model=AdminLoginResponse)
def admin_login(payload: AdminLoginRequest) -> AdminLoginResponse:
    admin_password = os.getenv("ADMIN_PASSWORD", "")
    if not admin_password:
        raise HTTPException(status_code=500, detail="ADMIN_PASSWORD is not configured")
    if not secrets.compare_digest(payload.password, admin_password):
        raise HTTPException(status_code=401, detail="Wrong password")
    return AdminLoginResponse(access_token=make_admin_token())


# ─── Admin: images ────────────────────────────────────────────────────────────

@app.post("/api/admin/upload-image", response_model=dict)
def upload_image(
    file: UploadFile = File(...),
    _: str = Depends(verify_admin),
) -> dict[str, str]:
    data = file.file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    try:
        image_url = save_product_image(data, file.content_type or "")
    except ObjectStorageConfigError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to upload image") from exc
    return {"image_url": image_url}


# ─── Admin: products ──────────────────────────────────────────────────────────

@app.post("/api/admin/products", response_model=Product)
def create_product(payload: ProductCreate, _: str = Depends(verify_admin)) -> Product:
    now = utc_now()
    image_url = (payload.image_url or "").strip() or DEFAULT_PRODUCT_IMAGE_URL
    new_product = Product(
        id=secrets.token_urlsafe(8),
        **payload.model_dump(),
        image_url=image_url,
        created_at=now,
        updated_at=now,
    )
    upsert_product(new_product)
    return new_product


@app.put("/api/admin/products/{product_id}", response_model=Product)
def update_product(product_id: str, payload: ProductUpdate, _: str = Depends(verify_admin)) -> Product:
    products = read_products()
    for item in products:
        if item.id != product_id:
            continue
        updates = payload.model_dump(exclude_unset=True)
        if "image_url" in updates:
            updates["image_url"] = (updates.get("image_url") or "").strip() or DEFAULT_PRODUCT_IMAGE_URL
        updated = item.model_copy(update={**updates, "updated_at": utc_now()})
        upsert_product(updated)
        return updated
    raise HTTPException(status_code=404, detail="Product not found")


@app.delete("/api/admin/products/{product_id}", response_model=MessageResponse)
def delete_product(product_id: str, _: str = Depends(verify_admin)) -> MessageResponse:
    if not delete_product_by_id(product_id):
        raise HTTPException(status_code=404, detail="Product not found")
    return MessageResponse(message="Product deleted")


# ─── Admin: available dates ───────────────────────────────────────────────────

@app.put("/api/admin/available-dates", response_model=MessageResponse)
def set_available_dates(payload: AvailableDatesPayload, _: str = Depends(verify_admin)) -> MessageResponse:
    write_available_dates(payload.dates)
    return MessageResponse(message="Dates updated")
