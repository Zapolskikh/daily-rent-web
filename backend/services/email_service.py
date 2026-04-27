from __future__ import annotations
import os
import smtplib
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email import encoders

from models import ContactRequest, Order


class EmailConfigError(RuntimeError):
    pass


def _smtp_credentials() -> tuple[str, str, str]:
    """Return (sender, app_password, receiver). Raises EmailConfigError if incomplete."""
    sender = os.getenv("GMAIL_SENDER", "")
    app_password = os.getenv("GMAIL_APP_PASSWORD", "")
    receiver = os.getenv("GMAIL_RECEIVER", sender)
    if not sender or not app_password or not receiver:
        raise EmailConfigError("Gmail credentials are not configured")
    return sender, app_password, receiver


def _smtp_send(subject: str, body: str) -> None:
    sender, app_password, receiver = _smtp_credentials()

    msg = MIMEText(body, _charset="utf-8")
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = receiver

    with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=20) as smtp:
        smtp.login(sender, app_password)
        smtp.sendmail(sender, [receiver], msg.as_string())


def _smtp_send_with_attachment(
    subject: str,
    body: str,
    to: str,
    attachment_bytes: bytes,
    attachment_filename: str,
    content_type: str = "application/pdf",
) -> None:
    """Send an email with a single attachment to *to* (in addition to the default receiver)."""
    sender, app_password, receiver = _smtp_credentials()

    msg = MIMEMultipart()
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = to
    if to != receiver:
        msg["Cc"] = receiver

    msg.attach(MIMEText(body, "plain", "utf-8"))

    part = MIMEBase(*content_type.split("/", 1))
    part.set_payload(attachment_bytes)
    encoders.encode_base64(part)
    part.add_header(
        "Content-Disposition",
        "attachment",
        filename=attachment_filename,
    )
    msg.attach(part)

    recipients = list({to, receiver})
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=30) as smtp:
        smtp.login(sender, app_password)
        smtp.sendmail(sender, recipients, msg.as_string())


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
    delivery_text = "Доставка по адресу" if order.delivery_type == "delivery" else "Самовывоз (Прага 7)"
    return_text = "Забираем сами" if order.return_type == "pickup" else "Самоотвоз (Прага 7)"
    dates_text = ", ".join(order.dates) if order.dates else "-"
    payment_labels = {"cash": "Наличными", "card": "Банковской картой", "transfer": "Банковским переводом", "crypto": "Криптовалютой"}
    deposit_labels = {"same": "Тем же способом", "cash": "Наличными"}

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
        "Получение: " + delivery_text,
        "Возврат: " + return_text,
        "Даты: " + dates_text,
        "Оплата: " + payment_labels.get(order.payment_method, order.payment_method),
        "Залог: " + deposit_labels.get(order.deposit_method, order.deposit_method),
        "",
        "Товары:",
    ] + items_lines + [
        "",
        "Аренда: " + str(order.total_price - order.delivery_fee) + " Kc",
    ]
    if order.delivery_fee:
        lines.append("Доставка/отвоз: " + str(order.delivery_fee) + " Kc")
        lines.append("Итого: " + str(order.total_price) + " Kc")
    else:
        lines.append("Итого: " + str(order.total_price) + " Kc")
    if order.comment:
        lines.append("Комментарий: " + order.comment)

    subject = "[Rent Prague] Новый заказ #" + order.id + " от " + order.name
    _smtp_send(subject, "\n".join(lines))


def send_restock_email(email: str, product_name: str) -> None:
    subject = f"[Rent Prague] «{product_name}» снова доступен для аренды!"
    body = "\n".join([
        f"Здравствуйте!",
        f"",
        f"Товар «{product_name}», который вас интересовал, снова доступен для аренды.",
        f"Перейдите на сайт и оформите заявку, пока он не занят.",
        f"",
        f"https://prague-rent.vercel.app",
        f"",
        f"С уважением,",
        f"Команда Rent Prague",
    ])
    _smtp_send(subject, body)


def send_cancellation_email(order: "Order", reason: str) -> None:
    items_text = ", ".join(item.product_name for item in order.items)
    subject = f"[Rent Prague] Заказ #{order.id} отменён"
    body = "\n".join([
        f"Здравствуйте, {order.name}!",
        "",
        f"К сожалению, ваш заказ #{order.id} ({items_text}) был отменён.",
        "",
        f"Причина отмены: {reason}",
        "",
        "Если у вас есть вопросы, пожалуйста, свяжитесь с нами.",
        "",
        "С уважением,",
        "Команда Rent Prague",
    ])
    _smtp_send(subject, body)


def _build_confirmation_body(order: Order) -> tuple[str, str]:
    """Return (subject, body) for a plain-text order confirmation to the customer."""
    items_summary = ", ".join(item.product_name for item in order.items)
    dates_text = ""
    if order.dates:
        sorted_dates = sorted(order.dates)
        from datetime import datetime
        def _fmt(d: str) -> str:
            try:
                return datetime.strptime(d, "%Y-%m-%d").strftime("%d.%m.%Y")
            except ValueError:
                return d
        dates_text = f"\nДаты аренды: {_fmt(sorted_dates[0])} — {_fmt(sorted_dates[-1])}"

    subject = f"[Rent Prague] Подтверждение заказа #{order.id} — инвойс"
    body = "\n".join([
        f"Здравствуйте, {order.name}!",
        "",
        f"Ваш заказ #{order.id} успешно оформлен. Спасибо, что выбрали Rent Prague!",
        "",
        f"Состав заказа: {items_summary}{dates_text}",
        f"Итого к оплате: {order.total_price:,.0f} Kč",
        "",
        "Если у вас возникнут вопросы, пишите нам в ответ на это письмо.",
        "",
        "С уважением,",
        "Команда Rent Prague",
    ])
    return subject, body


def send_order_confirmation_email(order: Order) -> None:
    """Send a plain-text confirmation email to the customer (no PDF attachment)."""
    subject, body = _build_confirmation_body(order)
    sender, app_password, _ = _smtp_credentials()

    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = order.email

    with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=20) as smtp:
        smtp.login(sender, app_password)
        smtp.sendmail(sender, [order.email], msg.as_string())


def send_invoice_email(order: Order) -> None:
    """Generate a PDF invoice and send it to the customer's email address."""
    from services.pdf_service import generate_invoice_pdf  # lazy import to avoid circular deps

    pdf_bytes = generate_invoice_pdf(order)
    filename = f"invoice_INV-{order.id}.pdf"

    subject, body = _build_confirmation_body(order)
    # Add PDF note to body
    body = body.replace(
        "Если у вас возникнут вопросы,",
        "Во вложении — инвойс (PDF) для вашего удобства.\n\nЕсли у вас возникнут вопросы,",
    )

    _smtp_send_with_attachment(
        subject=subject,
        body=body,
        to=order.email,
        attachment_bytes=pdf_bytes,
        attachment_filename=filename,
    )

