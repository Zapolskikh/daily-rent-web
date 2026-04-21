from __future__ import annotations

import os

import telebot

from models import ContactRequest, Order


class TelegramConfigError(RuntimeError):
    pass


def _get_bot() -> tuple[telebot.TeleBot, str]:
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    chat_id = os.getenv("TELEGRAM_OUTPUT_CHAT_ID", "")
    if not bot_token or not chat_id:
        raise TelegramConfigError("Telegram credentials are not configured")
    return telebot.TeleBot(bot_token), chat_id


def send_telegram_message(text: str) -> None:
    bot, chat_id = _get_bot()
    bot.send_message(chat_id, text, parse_mode="HTML")


def send_contact_telegram(payload: ContactRequest) -> None:
    product_ref = payload.product_id if payload.product_id else "-"
    lines = [
        "<b>Новый запрос</b>",
        "Имя: " + payload.name,
        "Email: " + payload.email,
        "Телефон: " + payload.phone,
        "Товар ID: " + product_ref,
        "",
        "Сообщение: " + payload.message,
    ]
    send_telegram_message("\n".join(lines))


def send_order_telegram(order: Order) -> None:
    delivery_text = "Доставка" if order.delivery_type == "delivery" else "Самовывоз"
    dates_text = ", ".join(order.dates) if order.dates else "-"

    items_lines = []
    for item in order.items:
        line = "  - " + item.product_name + " - " + str(item.price_per_day) + " Kc/den"
        if item.selected_options:
            opts = ", ".join(o.name + " (+" + str(o.price) + " Kc)" for o in item.selected_options)
            line += " + [" + opts + "]"
        items_lines.append(line)

    lines = [
        "<b>Новый заказ #" + order.id + "</b>",
        "Клиент: " + order.name,
        "Email: " + order.email,
        "Телефон: " + order.phone,
        "Доставка: " + delivery_text,
        "Даты: " + dates_text,
        "",
        "<b>Товары:</b>",
    ] + items_lines + [
        "",
        "<b>Итого: " + str(order.total_price) + " Kc</b>",
    ]
    if order.comment:
        lines.append("Комментарий: " + order.comment)
    send_telegram_message("\n".join(lines))
