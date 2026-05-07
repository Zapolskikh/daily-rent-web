"""User auth API routes: register, login, profile, order history."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from models import (
    Order,
    TokenResponse,
    UserLogin,
    UserProfile,
    UserProfileUpdate,
    UserRegister,
)
from services.auth import (
    create_access_token,
    decode_access_token,
    generate_user_id,
    hash_password,
    verify_password,
)
from services.storage import (
    create_user,
    get_orders_by_email,
    get_user_by_email,
    get_user_by_id,
    update_user,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)


def _get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(security)):
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Не авторизован")
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Токен недействителен или истёк")
    user = get_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="Пользователь не найден")
    return user


@router.post("/register", response_model=TokenResponse)
def register(body: UserRegister):
    user_id = generate_user_id()
    record = create_user(
        user_id=user_id,
        email=body.email.lower(),
        password_hash=hash_password(body.password),
        name=body.name,
        phone=body.phone,
    )
    if not record:
        raise HTTPException(status_code=409, detail="Пользователь с таким email уже существует")
    token = create_access_token(record.id, record.email)
    profile = UserProfile(
        id=record.id, email=record.email, name=record.name,
        phone=record.phone, created_at=record.created_at,
    )
    return TokenResponse(access_token=token, user=profile)


@router.post("/login", response_model=TokenResponse)
def login(body: UserLogin):
    record = get_user_by_email(body.email.lower())
    if not record or not verify_password(body.password, record.password_hash):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")
    token = create_access_token(record.id, record.email)
    profile = UserProfile(
        id=record.id, email=record.email, name=record.name,
        phone=record.phone, created_at=record.created_at,
    )
    return TokenResponse(access_token=token, user=profile)


@router.get("/me", response_model=UserProfile)
def get_profile(user=Depends(_get_current_user)):
    return UserProfile(
        id=user.id, email=user.email, name=user.name,
        phone=user.phone, created_at=user.created_at,
    )


@router.put("/me", response_model=UserProfile)
def update_profile(body: UserProfileUpdate, user=Depends(_get_current_user)):
    fields = body.model_dump(exclude_none=True)
    if not fields:
        raise HTTPException(status_code=400, detail="Нет данных для обновления")
    updated = update_user(user.id, **fields)
    if not updated:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return UserProfile(
        id=updated.id, email=updated.email, name=updated.name,
        phone=updated.phone, created_at=updated.created_at,
    )


@router.get("/orders", response_model=list[Order])
def get_my_orders(user=Depends(_get_current_user)):
    return get_orders_by_email(user.email)


@router.put("/orders/{order_id}/cancel", response_model=Order)
def cancel_my_order(order_id: str, user=Depends(_get_current_user)):
    from services.storage import read_orders, write_orders, increment_reservations
    orders = read_orders()
    for index, order in enumerate(orders):
        if order.id != order_id:
            continue
        if order.email.lower() != user.email.lower():
            raise HTTPException(status_code=403, detail="Это не ваш заказ")
        if order.status not in ("pending", "confirmed"):
            raise HTTPException(status_code=400, detail="Заказ нельзя отменить")
        updated = order.model_copy(update={"status": "cancelled", "cancellation_reason": "Отменён пользователем"})
        orders[index] = updated
        write_orders(orders)
        product_ids = [item.product_id for item in order.items]
        increment_reservations(product_ids, order.dates, delta=-1)
        return updated
    raise HTTPException(status_code=404, detail="Заказ не найден")
