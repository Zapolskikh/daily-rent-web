"""PDF invoice generator for Rent Prague orders.

Font strategy (in priority order):
  1. backend/assets/DejaVuSans.ttf  — commit this file for proper Cyrillic
  2. Common system paths for DejaVuSans
  3. Built-in Helvetica (core font) + Cyrillic transliteration fallback
"""

from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path

from fpdf import FPDF

from models import Order

# ─── Font resolution ──────────────────────────────────────────────────────────

_SYSTEM_FONT_PATHS = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/ttf-dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/dejavu-sans-fonts/DejaVuSans.ttf",
]
_LOCAL_FONT = Path(__file__).resolve().parent.parent / "assets" / "DejaVuSans.ttf"

_resolved_font_path: str | None = None   # module-level cache
_USE_CORE_FONT: bool = False              # True when falling back to Helvetica


def _resolve_font() -> str | None:
    """Return TTF path if available, else None (caller uses core font fallback)."""
    global _resolved_font_path, _USE_CORE_FONT
    if _USE_CORE_FONT:
        return None
    if _resolved_font_path and Path(_resolved_font_path).exists():
        return _resolved_font_path
    if _LOCAL_FONT.exists():
        _resolved_font_path = str(_LOCAL_FONT)
        return _resolved_font_path
    for p in _SYSTEM_FONT_PATHS:
        if Path(p).exists():
            _resolved_font_path = p
            return _resolved_font_path
    # No TTF found — fall back to built-in Helvetica for this process lifetime
    _USE_CORE_FONT = True
    return None


# ─── Cyrillic → Latin transliteration (used only with core-font fallback) ────

_CYR_MAP: list[tuple[str, str]] = [
    ("Щ", "Sch"), ("щ", "sch"),
    ("Ш", "Sh"),  ("ш", "sh"),
    ("Ч", "Ch"),  ("ч", "ch"),
    ("Ю", "Yu"),  ("ю", "yu"),
    ("Я", "Ya"),  ("я", "ya"),
    ("Ж", "Zh"),  ("ж", "zh"),
    ("Ё", "Yo"),  ("ё", "yo"),
    ("Э", "E"),   ("э", "e"),
    ("Ъ", ""),    ("ъ", ""),
    ("Ь", ""),    ("ь", ""),
    ("А", "A"),   ("а", "a"),
    ("Б", "B"),   ("б", "b"),
    ("В", "V"),   ("в", "v"),
    ("Г", "G"),   ("г", "g"),
    ("Д", "D"),   ("д", "d"),
    ("Е", "E"),   ("е", "e"),
    ("З", "Z"),   ("з", "z"),
    ("И", "I"),   ("и", "i"),
    ("Й", "Y"),   ("й", "y"),
    ("К", "K"),   ("к", "k"),
    ("Л", "L"),   ("л", "l"),
    ("М", "M"),   ("м", "m"),
    ("Н", "N"),   ("н", "n"),
    ("О", "O"),   ("о", "o"),
    ("П", "P"),   ("п", "p"),
    ("Р", "R"),   ("р", "r"),
    ("С", "S"),   ("с", "s"),
    ("Т", "T"),   ("т", "t"),
    ("У", "U"),   ("у", "u"),
    ("Ф", "F"),   ("ф", "f"),
    ("Х", "Kh"),  ("х", "kh"),
    ("Ц", "Ts"),  ("ц", "ts"),
    ("Ы", "Y"),   ("ы", "y"),
]


def _t(text: str) -> str:
    """Transliterate Cyrillic to Latin and replace non-latin-1 chars when core font is active."""
    if not _USE_CORE_FONT:
        return text
    for cyr, lat in _CYR_MAP:
        text = text.replace(cyr, lat)
    # Replace common non-latin-1 symbols with ASCII equivalents
    text = (text
            .replace("•", "-")
            .replace("—", "-")
            .replace("–", "-")
            .replace("\u2116", "No.")  # №
            .replace("ě", "e").replace("é", "e").replace("á", "a").replace("í", "i")
            .replace("ú", "u").replace("ů", "u").replace("ó", "o").replace("ý", "y")
            .replace("č", "c").replace("ř", "r").replace("ž", "z").replace("š", "s")
            .replace("ď", "d").replace("ť", "t").replace("ň", "n")
            .replace("Č", "C").replace("Ř", "R").replace("Ž", "Z").replace("Š", "S")
            .replace("Á", "A").replace("É", "E").replace("Í", "I").replace("Ó", "O")
            .replace("Ú", "U").replace("Ý", "Y")
            )
    return text



# ─── Company info (configurable via env) ──────────────────────────────────────

# ── Stub defaults shown in the document when env vars are not set ─────────────
_STUB_NAME    = "Rent Prague s.r.o. [DEMO]"
_STUB_ADDRESS = "Milady Horákové 100, Praha 7, 170 00"
_STUB_EMAIL   = "info@prague-rent.vercel.app"
_STUB_WEBSITE = "prague-rent.vercel.app"
_STUB_ICO     = "12345678"


def _company_name() -> str:
    return os.getenv("INVOICE_COMPANY_NAME", _STUB_NAME)


def _company_address() -> str:
    return os.getenv("INVOICE_COMPANY_ADDRESS", _STUB_ADDRESS)


def _company_email() -> str:
    return os.getenv("INVOICE_COMPANY_EMAIL", _STUB_EMAIL)


def _company_website() -> str:
    return os.getenv("INVOICE_COMPANY_WEBSITE", _STUB_WEBSITE)


def _company_ico() -> str:
    """IČO (Czech company registration number)."""
    return os.getenv("INVOICE_COMPANY_ICO", _STUB_ICO)


# ─── Helpers ──────────────────────────────────────────────────────────────────

_PAYMENT_LABELS: dict[str, str] = {
    "cash": "Наличными / Hotově",
    "card": "Банковской картой / Kartou",
    "transfer": "Банковским переводом / Bankovním převodem",
    "crypto": "Криптовалютой / Kryptoměnou",
}

_DELIVERY_LABELS: dict[str, str] = {
    "delivery": "Доставка / Doručení",
    "pickup": "Самовывоз / Osobní odběr (Praha 7)",
}

_RETURN_LABELS: dict[str, str] = {
    "pickup": "Забираем мы / Vyzvednutí námi",
    "self": "Самоотвоз / Osobní vrácení (Praha 7)",
}


def _fmt_date(d: str) -> str:
    """Convert YYYY-MM-DD to DD.MM.YYYY for display."""
    try:
        dt = datetime.strptime(d, "%Y-%m-%d")
        return dt.strftime("%d.%m.%Y")
    except ValueError:
        return d


def _fmt_price(amount: float) -> str:
    return _t(f"{amount:,.0f} Kč".replace(",", " "))


# ─── PDF class ────────────────────────────────────────────────────────────────

class _InvoicePDF(FPDF):
    _font_regular: str = "Regular"
    _font_bold: str = "Bold"

    def __init__(self, font_path: str | None) -> None:
        super().__init__(orientation="P", unit="mm", format="A4")
        self.set_margins(left=20, top=20, right=20)
        self.set_auto_page_break(auto=True, margin=20)

        if font_path:
            # TTF font with full Unicode / Cyrillic support
            bold_path = font_path.replace("DejaVuSans.ttf", "DejaVuSans-Bold.ttf")
            self.add_font(self._font_regular, "", font_path)
            if Path(bold_path).exists():
                self.add_font(self._font_bold, "", bold_path)
            else:
                self._font_bold = self._font_regular
        else:
            # Built-in core font fallback (latin only; Cyrillic is transliterated)
            self._font_regular = "helvetica"
            self._font_bold = "helvetica"

    # ── Header ──────────────────────────────────────────────────────────────

    def header(self) -> None:
        pass  # manual header in generate_invoice_pdf

    # ── Footer ──────────────────────────────────────────────────────────────

    def footer(self) -> None:
        self.set_y(-15)
        self.set_font(self._font_regular, size=8)
        self.set_text_color(150, 150, 150)
        self.cell(
            0, 6,
            _t(f"{_company_name()} — {_company_website()}  |  стр. {self.page_no()}"),
            align="C",
        )
        self.set_text_color(0, 0, 0)

    # ── Convenience wrappers ────────────────────────────────────────────────

    def bold(self, size: int = 10) -> None:
        if self._font_bold == "helvetica":
            self.set_font("helvetica", style="B", size=size)
        else:
            self.set_font(self._font_bold, size=size)

    def regular(self, size: int = 10) -> None:
        if self._font_regular == "helvetica":
            self.set_font("helvetica", style="", size=size)
        else:
            self.set_font(self._font_regular, size=size)

    def section_title(self, text: str) -> None:
        self.set_fill_color(245, 245, 245)
        self.bold(9)
        self.cell(0, 7, _t(text), fill=True, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)
        self.regular()


# ─── Public API ───────────────────────────────────────────────────────────────

def generate_invoice_pdf(order: Order) -> bytes:
    """Generate a professional A4 PDF invoice for *order* and return raw bytes."""
    font_path = _resolve_font()
    pdf = _InvoicePDF(font_path)
    pdf.add_page()

    PAGE_W = pdf.w - pdf.l_margin - pdf.r_margin  # usable width
    COL = PAGE_W / 2 - 3                           # half-column width

    # ── Banner ──────────────────────────────────────────────────────────────
    pdf.set_fill_color(30, 58, 138)   # dark-blue brand colour
    pdf.set_text_color(255, 255, 255)
    pdf.set_x(pdf.l_margin)
    pdf.bold(18)
    pdf.cell(PAGE_W, 14, _company_name().upper(), fill=True, align="C",
             new_x="LMARGIN", new_y="NEXT")
    pdf.regular(9)
    tagline = _t(f"{_company_address()}  •  {_company_email()}")
    pdf.cell(PAGE_W, 6, tagline, fill=True, align="C",
             new_x="LMARGIN", new_y="NEXT")
    pdf.set_fill_color(255, 255, 255)
    pdf.set_text_color(0, 0, 0)
    pdf.ln(6)

    # ── Invoice meta + customer info (two-column row) ────────────────────
    # Left column — invoice details
    pdf.set_x(pdf.l_margin)
    pdf.bold(13)
    pdf.cell(COL, 8, _t("ИНВОЙС / INVOICE"), new_x="RIGHT", new_y="TOP")

    # Right column — customer label
    pdf.set_x(pdf.l_margin + COL + 6)
    pdf.bold(9)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(COL, 8, _t("КЛИЕНТ / ZÁKAZNÍK"), new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)

    invoice_date = order.created_at.strftime("%d.%m.%Y")

    left_rows = [
        (_t("№"), f"INV-{order.id}"),
        (_t("Дата / Datum"), invoice_date),
        (_t("Статус"), _t("Подтверждён / Potvrzeno")),
    ]
    if _company_ico():
        left_rows.append((_t("IČO"), _company_ico()))

    right_rows = [
        (_t(order.name), ""),
        (order.email, ""),
        (order.phone, ""),
    ]

    row_h = 6
    for (lk, lv), (rk, rv) in zip(left_rows, right_rows):
        pdf.set_x(pdf.l_margin)
        pdf.regular(9)
        # left cell
        pdf.set_text_color(100, 100, 100)
        pdf.cell(26, row_h, lk + ":", border=0)
        pdf.set_text_color(0, 0, 0)
        pdf.bold(9)
        pdf.cell(COL - 26, row_h, lv, new_x="RIGHT", new_y="TOP")
        # right cell
        pdf.set_x(pdf.l_margin + COL + 6)
        pdf.bold(9)
        pdf.cell(COL, row_h, rk, new_x="LMARGIN", new_y="NEXT")
        pdf.regular(9)

    # flush remaining left rows if more than right rows
    for lk, lv in left_rows[len(right_rows):]:
        pdf.set_x(pdf.l_margin)
        pdf.set_text_color(100, 100, 100)
        pdf.cell(26, row_h, lk + ":", border=0)
        pdf.set_text_color(0, 0, 0)
        pdf.bold(9)
        pdf.cell(COL - 26, row_h, lv, new_x="LMARGIN", new_y="NEXT")
        pdf.regular(9)

    pdf.ln(5)

    # ── Rental period ────────────────────────────────────────────────────
    if order.dates:
        sorted_dates = sorted(order.dates)
        start = _fmt_date(sorted_dates[0])
        end = _fmt_date(sorted_dates[-1])
        days = len(order.dates)
        period_str = f"{start} — {end}  ({days} {_t('день' if days == 1 else 'дней')})"
        pdf.regular(9)
        pdf.set_text_color(80, 80, 80)
        pdf.cell(0, 6, _t(f"Период аренды / Období pronájmu:  {period_str}"),
                 new_x="LMARGIN", new_y="NEXT")
        pdf.set_text_color(0, 0, 0)
        pdf.ln(3)

    # ── Items table ──────────────────────────────────────────────────────
    days_count = max(len(order.dates), 1)

    # column widths
    C_DESC  = PAGE_W * 0.48
    C_DAYS  = PAGE_W * 0.10
    C_UNIT  = PAGE_W * 0.20
    C_TOTAL = PAGE_W * 0.22

    # Table header
    pdf.set_fill_color(30, 58, 138)
    pdf.set_text_color(255, 255, 255)
    pdf.bold(8)
    pdf.cell(C_DESC,  7, _t("Описание / Popis"),       fill=True, border=0)
    pdf.cell(C_DAYS,  7, _t("Дни"),                    fill=True, border=0, align="C")
    pdf.cell(C_UNIT,  7, _t("Цена/день"),              fill=True, border=0, align="R")
    pdf.cell(C_TOTAL, 7, _t("Итого"),                  fill=True, border=0, align="R",
             new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)

    rental_subtotal = 0.0
    row_fill = False

    for item in order.items:
        # Item base row
        item_base_total = item.price_per_day * days_count
        rental_subtotal += item_base_total

        pdf.set_fill_color(248, 249, 252) if row_fill else pdf.set_fill_color(255, 255, 255)
        pdf.regular(8)
        pdf.cell(C_DESC,  6, _t(item.product_name),       fill=True, border=0)
        pdf.cell(C_DAYS,  6, str(days_count),         fill=True, border=0, align="C")
        pdf.cell(C_UNIT,  6, _fmt_price(item.price_per_day),  fill=True, border=0, align="R")
        pdf.cell(C_TOTAL, 6, _fmt_price(item_base_total),     fill=True, border=0, align="R",
                 new_x="LMARGIN", new_y="NEXT")

        # Selected options
        for opt in item.selected_options:
            opt_total = opt.price * days_count
            rental_subtotal += opt_total
            pdf.set_fill_color(248, 249, 252) if row_fill else pdf.set_fill_color(255, 255, 255)
            pdf.set_text_color(80, 80, 80)
            pdf.regular(7)
            pdf.cell(C_DESC,  5, _t(f"  + {opt.name}"),          fill=True, border=0)
            pdf.cell(C_DAYS,  5, str(days_count),             fill=True, border=0, align="C")
            pdf.cell(C_UNIT,  5, _fmt_price(opt.price),       fill=True, border=0, align="R")
            pdf.cell(C_TOTAL, 5, _fmt_price(opt_total),       fill=True, border=0, align="R",
                     new_x="LMARGIN", new_y="NEXT")
            pdf.set_text_color(0, 0, 0)

        row_fill = not row_fill

    # ── Totals ───────────────────────────────────────────────────────────
    pdf.ln(2)
    total_col_start = pdf.l_margin + C_DESC + C_DAYS

    def _total_row(label: str, amount: float, bold: bool = False, highlight: bool = False) -> None:
        if highlight:
            pdf.set_fill_color(30, 58, 138)
            pdf.set_text_color(255, 255, 255)
        else:
            pdf.set_fill_color(245, 245, 245)

        pdf.set_x(total_col_start)
        if bold or highlight:
            pdf.bold(9)
        else:
            pdf.regular(8)
        w_label = C_UNIT
        w_value = C_TOTAL
        pdf.cell(w_label, 7, _t(label), fill=True, border=0, align="R")
        pdf.cell(w_value, 7, _fmt_price(amount), fill=True, border=0, align="R",
                 new_x="LMARGIN", new_y="NEXT")
        if highlight:
            pdf.set_text_color(0, 0, 0)

    _total_row(_t("Аренда:"), rental_subtotal)
    if order.delivery_fee:
        delivery_label = _DELIVERY_LABELS.get(order.delivery_type, _t("Доставка"))
        _total_row(_t(f"{delivery_label}:"), order.delivery_fee)
    _total_row(_t("ИТОГО / CELKEM:"), order.total_price, bold=True, highlight=True)

    pdf.ln(6)

    # ── Details section ──────────────────────────────────────────────────
    pdf.section_title("ДЕТАЛИ ЗАКАЗА / PODROBNOSTI OBJEDNÁVKY")

    detail_rows: list[tuple[str, str]] = [
        (_t("Получение / Vyzvednutí"), _t(_DELIVERY_LABELS.get(order.delivery_type, order.delivery_type))),
        (_t("Возврат / Vrácení"),      _t(_RETURN_LABELS.get(order.return_type, order.return_type))),
        (_t("Оплата / Platba"),        _t(_PAYMENT_LABELS.get(order.payment_method, order.payment_method))),
    ]
    if order.delivery_slot:
        detail_rows.append((_t("Начало аренды / Začátek"), _t(order.delivery_slot)))
    if getattr(order, 'return_slot', None):
        detail_rows.append((_t("Конец аренды / Konec"), _t(order.return_slot)))
    if order.comment:
        detail_rows.append((_t("Комментарий / Poznámka"), _t(order.comment)))

    for label, value in detail_rows:
        pdf.set_x(pdf.l_margin)
        pdf.set_text_color(100, 100, 100)
        pdf.regular(8)
        pdf.cell(55, 5.5, label + ":", border=0)
        pdf.set_text_color(0, 0, 0)
        pdf.regular(8)
        pdf.multi_cell(PAGE_W - 55, 5.5, value, border=0,
                       new_x="LMARGIN", new_y="NEXT")

    pdf.ln(5)

    # ── Thank-you note ───────────────────────────────────────────────────
    pdf.set_fill_color(239, 246, 255)
    pdf.set_draw_color(147, 197, 253)
    pdf.regular(9)
    pdf.multi_cell(
        PAGE_W, 6,
        _t("Спасибо, что выбрали Rent Prague! Если у вас возникнут вопросы, "
        f"свяжитесь с нами по адресу {_company_email()}.\n"
        "Děkujeme, že jste si vybrali Rent Prague!"),
        border=1,
        fill=True,
        new_x="LMARGIN",
        new_y="NEXT",
    )

    # ── Handover contract (Act of Transfer) ──────────────────────────────
    _add_handover_contract(pdf, order, PAGE_W, days_count)

    return bytes(pdf.output())


def _add_handover_contract(pdf: _InvoicePDF, order: Order, PAGE_W: float, days_count: int) -> None:
    """Append a mini act-of-transfer / Předávací protokol section to the PDF."""
    pdf.ln(10)
    pdf.add_page()

    # ── Header ──────────────────────────────────────────────────────────
    pdf.set_fill_color(30, 58, 138)
    pdf.set_text_color(255, 255, 255)
    pdf.bold(14)
    pdf.cell(PAGE_W, 11, _t("АКТ ПРИЁМА-ПЕРЕДАЧИ / PŘEDÁVACÍ PROTOKOL"),
             fill=True, align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)
    pdf.ln(5)

    invoice_date = order.created_at.strftime("%d.%m.%Y")

    # ── Parties ──────────────────────────────────────────────────────────
    pdf.section_title("СТОРОНЫ / STRANY")
    parties: list[tuple[str, str]] = [
        (_t("Арендодатель / Pronajímatel"),
         _t(f"{_company_name()}, IČO: {_company_ico()}, {_company_address()}")),
        (_t("Арендатор / Nájemce"),
         _t(f"{order.name}, {order.email}, {order.phone}")),
        (_t("Дата составления / Datum"), invoice_date),
        (_t("Заказ / Číslo objednávky"), f"INV-{order.id}"),
    ]
    for label, value in parties:
        pdf.set_x(pdf.l_margin)
        pdf.set_text_color(100, 100, 100)
        pdf.regular(8)
        pdf.cell(65, 5.5, label + ":", border=0)
        pdf.set_text_color(0, 0, 0)
        pdf.bold(8)
        pdf.multi_cell(PAGE_W - 65, 5.5, value, border=0, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    # ── Rental period ────────────────────────────────────────────────────
    if order.dates:
        sorted_dates = sorted(order.dates)
        start_str = _fmt_date(sorted_dates[0])
        end_str   = _fmt_date(sorted_dates[-1])
        period_line = _t(f"{start_str} — {end_str}  ({days_count} {'день' if days_count == 1 else 'дней'})")
        start_time = _t(order.delivery_slot or "по договорённости / dle dohody")
        end_time   = _t(getattr(order, 'return_slot', None) or "по договорённости / dle dohody")
        pdf.section_title("ПЕРИОД АРЕНДЫ / OBDOBÍ PRONÁJMU")
        for lbl, val in [(_t("Начало / Začátek"), _t(f"{start_str}  {start_time}")),
                         (_t("Конец / Konec"),    _t(f"{end_str}  {end_time}")),
                         (_t("Всего дней / Počet dní"), period_line)]:
            pdf.set_x(pdf.l_margin)
            pdf.set_text_color(100, 100, 100)
            pdf.regular(8)
            pdf.cell(55, 5.5, lbl + ":", border=0)
            pdf.set_text_color(0, 0, 0)
            pdf.bold(8)
            pdf.multi_cell(PAGE_W - 55, 5.5, val, border=0, new_x="LMARGIN", new_y="NEXT")
        pdf.ln(3)

    # ── Items handed over ────────────────────────────────────────────────
    pdf.section_title("ПЕРЕДАННОЕ ОБОРУДОВАНИЕ / PŘEDANÉ VYBAVENÍ")
    for i, item in enumerate(order.items, 1):
        line = f"{i}. {item.product_name}"
        if item.selected_options:
            opts = ", ".join(o.name for o in item.selected_options)
            line += f" (+ {opts})"
        pdf.regular(8)
        pdf.cell(0, 6, _t(line), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    # ── Checkboxes ───────────────────────────────────────────────────────
    pdf.section_title("ПОДТВЕРЖДЕНИЯ / POTVRZENÍ")

    def _checkbox_row(text: str) -> None:
        """Render a checkbox (square) followed by label text."""
        pdf.set_x(pdf.l_margin)
        # Draw empty square (checkbox)
        box_size = 4.5
        y_box = pdf.get_y() + 1
        pdf.set_draw_color(50, 50, 50)
        pdf.set_line_width(0.4)
        pdf.rect(pdf.l_margin, y_box, box_size, box_size)
        pdf.set_line_width(0.2)
        pdf.set_x(pdf.l_margin + box_size + 2)
        pdf.regular(9)
        pdf.cell(PAGE_W - box_size - 2, 6.5, _t(text), new_x="LMARGIN", new_y="NEXT")

    rent_paid_label = _t(
        f"Аренда на {days_count} {'день' if days_count == 1 else 'дней'} оплачена — "
        f"{_fmt_price(order.total_price - order.delivery_fee)}  "
        f"/ Nájemné za {days_count} dní zaplaceno"
    )
    deposit_label = _t(
        "Залог оплачен и подлежит возврату при сдаче оборудования "
        "/ Záloha zaplacena a bude vrácena při předání"
    )
    _checkbox_row(rent_paid_label)
    pdf.ln(2)
    _checkbox_row(deposit_label)
    pdf.ln(8)

    # ── Signature block ──────────────────────────────────────────────────
    pdf.section_title("ПОДПИСИ / PODPISY")
    pdf.ln(3)
    half = PAGE_W / 2 - 5
    sig_y = pdf.get_y()

    # Left: lessor
    pdf.set_x(pdf.l_margin)
    pdf.set_draw_color(100, 100, 100)
    pdf.set_line_width(0.3)
    pdf.line(pdf.l_margin, sig_y + 12, pdf.l_margin + half, sig_y + 12)
    pdf.set_x(pdf.l_margin)
    pdf.regular(7)
    pdf.set_text_color(120, 120, 120)
    pdf.cell(half, 5, _t("Арендодатель / Pronajímatel"), align="C", new_x="RIGHT", new_y="TOP")

    # Right: lessee
    right_x = pdf.l_margin + half + 10
    pdf.set_x(right_x)
    pdf.line(right_x, sig_y + 12, right_x + half, sig_y + 12)
    pdf.set_x(right_x)
    pdf.cell(half, 5, _t("Арендатор / Nájemce"), align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)
    pdf.set_line_width(0.2)
