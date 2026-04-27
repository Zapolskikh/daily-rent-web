from __future__ import annotations
from datetime import datetime, timezone
from typing import Literal
from pydantic import BaseModel, EmailStr, Field

CategorySlug = Literal["party", "travel", "repair"]


class ProductOption(BaseModel):
    id: str
    name: str = Field(min_length=1, max_length=80)
    price: float = Field(ge=0)


class ProductBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    category: CategorySlug
    description: str = Field(min_length=5, max_length=1000)
    price_per_day: float = Field(gt=0)
    image_url: str = ""
    stock_quantity: int = Field(default=1, ge=0)
    options: list[ProductOption] = Field(default_factory=list)


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    category: CategorySlug | None = None
    description: str | None = Field(default=None, min_length=5, max_length=1000)
    price_per_day: float | None = Field(default=None, gt=0)
    image_url: str | None = None
    stock_quantity: int | None = Field(default=None, ge=0)
    options: list[ProductOption] | None = None


class Product(ProductBase):
    id: str
    created_at: datetime
    updated_at: datetime


class ContactRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    phone: str = Field(min_length=6, max_length=30)
    message: str = Field(min_length=5, max_length=2000)
    product_id: str | None = None


class SelectedOption(BaseModel):
    id: str
    name: str
    price: float = Field(ge=0)


class OrderItem(BaseModel):
    product_id: str
    product_name: str
    price_per_day: float
    selected_options: list[SelectedOption] = Field(default_factory=list)


class OrderCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    phone: str = Field(min_length=6, max_length=30)
    items: list[OrderItem] = Field(min_length=1)
    delivery_type: Literal["delivery", "pickup"]
    return_type: Literal["pickup", "self"] = "self"
    payment_method: Literal["cash", "card", "transfer", "crypto"] = "cash"
    deposit_method: Literal["same", "cash"] = "same"
    delivery_fee: float = Field(default=0, ge=0)
    dates: list[str] = Field(default_factory=list)
    delivery_slot: str | None = Field(default=None, max_length=20)  # e.g. "13:00-14:00"
    return_slot: str | None = Field(default=None, max_length=40)    # end time or "по договорённости"
    comment: str = Field(default="", max_length=1000)


class Order(OrderCreate):
    id: str
    total_price: float
    status: Literal["pending", "confirmed", "cancelled", "returned"] = "pending"
    payment_status: Literal["pending", "paid"] = "pending"
    deposit_status: Literal["pending", "returned"] = "pending"
    cancellation_reason: str = ""
    created_at: datetime


class AvailabilityCheckItem(BaseModel):
    product_id: str


class AvailabilityCheck(BaseModel):
    items: list[AvailabilityCheckItem]
    dates: list[str]


class AvailabilityResult(BaseModel):
    unavailable_product_ids: list[str]


class AvailableDatesPayload(BaseModel):
    dates: list[str]


class OrderStatusUpdate(BaseModel):
    status: Literal["pending", "confirmed", "cancelled", "returned"]
    cancellation_reason: str = Field(default="", max_length=1000)


class NotifyRequest(BaseModel):
    email: EmailStr
    product_id: str
    product_name: str


class AdminLoginRequest(BaseModel):
    password: str = Field(min_length=6, max_length=120)


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ProductsResponse(BaseModel):
    products: list[Product]


class CategoriesResponse(BaseModel):
    categories: list[dict[str, str]]


class MessageResponse(BaseModel):
    message: str


class OrdersResponse(BaseModel):
    orders: list[Order]


def utc_now() -> datetime:
    return datetime.now(timezone.utc)
