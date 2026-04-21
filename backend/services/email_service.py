from __future__ import annotations
import os
import smtplib
from email.mime.text import MIMEText

from models import ContactRequest, Order


class EmailConfigError(RuntimeError):
    pass


def _smtp_send(subject: str, body: str) -> None:
    sender = os.getenv("GMAIL_SENDER", "")
    app_password = os.getenv("GMAIL_APP_PASSWORD", "")
    receiver = os.getenv("GMAIL_RECEIVER", sender)

    if not sender or not app_password or not receiver:
        raise EmailConfigError("Gmail credentials are not configured")

    msg = MIMEText(body, _charset="utf-8")
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = receiver

    with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=20) as smtp:
        smtp.login(sender, app_password)
        smtp.sendmail(sender, [receiver], msg.as_string())


def send_contact_email(payload: ContactRequest) -> None:
    subject = "[Rent Prague] Новый запрос от " + payload.name
    product_ref = payload.product_id if payload.product_id else "-"
    body = "\n".join([
        "Имя: " + payload.name,
        "Email: " + payload.email,
        "Телефон: " + payload.phone,
        "Товар ID: " + product_ref,
        "",
        "Сообщение:",
        payload.message,
    ])
    _smtp_send(subject, body)


def send_order_email(order: Order) -> None:
    delivery_text = "Доставка" if order.delivery_type == "delivery" else "Самовывоз"
    dates_text = ", ".join(order.dates) if order.dates else "-"

    items_lines = []
    for item in order.items:
        line = "  * " + item.product_name + " - " + str(item.price_per_day) + " Kc/den"
        if item.selected_options:
            opts = ", ".join(o.name for o in item.selected_options)
            line += " + [" + opts + "]"
        items_lines.append(line)

    lines = [
        "[Rent Prague] Новый заказ #" + order.id,
        "",
        "Клиент: " + order.name,
        "Email: " + order.email,
        "Телефон: " + order.phone,
        "Доставка: " + delivery_text,
        "Даты: " + dates_text,
        "",
        "Товары:",
    ] + items_lines + [
        "",
        "Итого: " + str(order.total_price) + " Kc",
    ]
    if order.comment:
        lines.append("Комментарий: " + order.comment)

    subject = "[Rent Prague] Новый заказ #" + order.id + " от " + order.name
    _smtp_send(subject, "\n".join(lines))
