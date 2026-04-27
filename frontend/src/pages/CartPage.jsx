import DatePicker, { registerLocale } from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { useEffect, useRef, useState } from 'react'
import QRCode from 'react-qr-code'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { checkAvailability, createOrder, getAvailableDates, getBookedSlots, notifyAvailability } from '../lib/api'
import { ru } from 'date-fns/locale/ru'

registerLocale('ru', ru)

const BANK_IBAN  = import.meta.env.VITE_BANK_IBAN
const BANK_BIC   = import.meta.env.VITE_BANK_BIC
const BANK_NAME  = import.meta.env.VITE_BANK_NAME

const CRYPTO_USDT = import.meta.env.VITE_CRYPTO_USDT

const MISSING_BANK_ENV   = !BANK_IBAN || !BANK_BIC || !BANK_NAME
const MISSING_CRYPTO_ENV = !CRYPTO_USDT

if (MISSING_BANK_ENV || MISSING_CRYPTO_ENV) {
  console.warn(
    '[Payment] Отсутствуют переменные окружения:',
    [...(MISSING_BANK_ENV   ? ['VITE_BANK_IBAN','VITE_BANK_BIC','VITE_BANK_NAME'] : []),
     ...(MISSING_CRYPTO_ENV ? ['VITE_CRYPTO_USDT'] : [])]
  )
}

function buildSpdQr(iban, amount, vs) {
  return `SPD*1.0*ACC:${iban}*AM:${amount}.00*CC:CZK*MSG:Daily Rent Prague*X-VS:${vs}`
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-2 shrink-0 rounded-lg px-2 py-0.5 text-xs font-medium border transition"
      style={copied
        ? { background: '#dcfce7', borderColor: '#86efac', color: '#15803d' }
        : { background: '#f1f5f9', borderColor: '#cbd5e1', color: '#475569' }}
    >
      {copied ? '✓ Скопировано' : 'Копировать'}
    </button>
  )
}

export default function CartPage() {
  const { items, removeFromCart, clearCart } = useCart()
  const navigate = useNavigate()

  const [deliveryType, setDeliveryType] = useState('delivery')
  const [selectedDate, setSelectedDate] = useState(null)
  const [availableDates, setAvailableDates] = useState([])   // ['YYYY-MM-DD', ...]
  const [availableSlots, setAvailableSlots] = useState([])   // ['YYYY-MM-DD:HH:MM-HH:MM', ...]
  const [bookedSlots, setBookedSlots] = useState({})         // { 'YYYY-MM-DD': ['HH:MM-HH:MM', ...] }
  const [selectedSlot, setSelectedSlot] = useState('')

  const [form, setForm] = useState({ name: '', email: '', phone: '', comment: '' })
  const [unavailableIds, setUnavailableIds] = useState([])
  const [notifySuccess, setNotifySuccess] = useState({})    // { productId: true }
  const [unavailableModal, setUnavailableModal] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [success, setSuccess] = useState(false)
  const [returnType, setReturnType] = useState('self')      // 'self' | 'pickup'
  const [paymentMethod, setPaymentMethod] = useState('cash') // 'cash' | 'card' | 'transfer' | 'crypto'
  const [depositMethod, setDepositMethod] = useState('same') // 'same' | 'cash'
  const [paymentStub, setPaymentStub] = useState(false)
  const [orderVs] = useState(() => String(Date.now()).slice(-10))
  const formRef = useRef(null)

  useEffect(() => {
    getAvailableDates()
      .then((data) => {
        const raw = data.dates || []
        setAvailableDates(raw.filter((d) => !d.includes(':')))
        setAvailableSlots(raw.filter((d) => /^\d{4}-\d{2}-\d{2}:/.test(d)))
      })
      .catch(() => {})
    getBookedSlots()
      .then((data) => setBookedSlots(data.booked_slots || {}))
      .catch(() => {})
  }, [])

  // Reset slot when date changes
  useEffect(() => { setSelectedSlot('') }, [selectedDate])

  if (items.length === 0 && !success) {
    return (
      <div className="card text-center py-16 space-y-4">
        <p className="text-xl text-slate-500">Корзина пуста</p>
        <Link to="/" className="btn-primary inline-block">Перейти в каталог</Link>
      </div>
    )
  }

  if (success) {
    return (
      <div className="card text-center py-16 space-y-4">
        <p className="text-3xl">✅</p>
        <h2 className="text-2xl font-bold">Заказ оформлен!</h2>
        <p className="text-slate-600">Счёт-фактура (инвойс) отправлена вам на email.</p>
        <p className="text-slate-500 text-sm">В день доставки мы заранее свяжемся с вами для уточнения деталей.</p>
        <Link to="/" className="btn-primary inline-block">На главную</Link>
      </div>
    )
  }

  const selectedIso = selectedDate ? selectedDate.toISOString().slice(0, 10) : null

  // Slots for selected date (strip date prefix)
  const slotsForDate = selectedIso
    ? availableSlots
        .filter(d => d.startsWith(selectedIso + ':'))
        .map(d => d.slice(11))
    : []

  // Dates that have ≥1 slot — these are "available" (light green)
  const datesWithSlots = new Set(
    availableDates.filter(d => availableSlots.some(s => s.startsWith(d + ':')))
  )

  const days = 1
  const itemTotals = items.map((item) => {
    const optTotal = item.selectedOptions.reduce((s, o) => s + o.price, 0)
    return (item.product.price_per_day + optTotal) * days * item.quantity
  })
  const grandTotal = itemTotals.reduce((s, v) => s + v, 0)

  const deliveryFee = (() => {
    const needsDelivery = deliveryType === 'delivery'
    const needsReturn = returnType === 'pickup'
    if (needsDelivery && needsReturn) return 249
    if (needsDelivery || needsReturn) return 129
    return 0
  })()
  const totalWithFee = grandTotal + deliveryFee

  // Only available dates can be picked; grey out the rest
  function filterDate(date) {
    const iso = date.toISOString().slice(0, 10)
    return datesWithSlots.has(iso)
  }

  async function handleCheckAndSubmit(e) {
    e.preventDefault()
    setSubmitError('')
    setUnavailableIds([])

    if (!selectedDate) {
      setSubmitError(deliveryType === 'delivery' ? 'Выберите дату доставки' : 'Выберите дату самовывоза')
      return
    }
    if (slotsForDate.length > 0 && !selectedSlot) {
      setSubmitError(deliveryType === 'delivery' ? 'Выберите временной слот доставки' : 'Выберите время самовывоза')
      return
    }

    setLoading(true)
    try {
      const dates = selectedIso ? [selectedIso] : []
      const { unavailable_product_ids } = await checkAvailability({
        items: items.map((item) => ({ product_id: item.product.id })),
        dates,
      })
      if (unavailable_product_ids.length > 0) {
        setUnavailableIds(unavailable_product_ids)
        setLoading(false)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }

      const orderItems = items.map((item) => ({
        product_id: item.product.id,
        product_name: item.product.name,
        price_per_day: item.product.price_per_day,
        selected_options: item.selectedOptions.map((o) => ({ id: o.id, name: o.name, price: o.price })),
      }))

      await createOrder({
        ...form,
        items: orderItems,
        delivery_type: deliveryType,
        return_type: returnType,
        payment_method: paymentMethod,
        deposit_method: depositMethod,
        delivery_fee: deliveryFee,
        dates,
        delivery_slot: selectedSlot || null,
      })

      clearCart()
      setSuccess(true)
    } catch (err) {
      if (err.message && err.message.includes('недоступен')) {
        setUnavailableModal({ message: err.message })
      } else {
        setSubmitError(err.message || 'Ошибка при оформлении заказа')
      }
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setLoading(false)
    }
  }

  async function requestNotify(productId, productName) {
    setNotifySuccess((s) => ({ ...s, [productId]: 'loading' }))
    try {
      const email = form.email || 'unknown'
      await notifyAvailability({ email, product_id: productId, product_name: productName })
      setNotifySuccess((s) => ({ ...s, [productId]: 'done' }))
    } catch {
      setNotifySuccess((s) => ({ ...s, [productId]: 'done' })) // show success anyway
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Корзина</h1>

      {/* Cart items */}
      <section className="card space-y-3">
        <h2 className="text-xl font-semibold">Товары</h2>
        {items.map((item) => {
          const isUnavailable = unavailableIds.includes(item.product.id)
          const optTotal = item.selectedOptions.reduce((s, o) => s + o.price, 0)
          return (
            <article key={item._key}
              className={`rounded-xl border p-4 space-y-1 ${isUnavailable ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{item.product.name}</h3>
                  {item.selectedOptions.length > 0 && (
                    <p className="text-sm text-slate-600">+ {item.selectedOptions.map((o) => o.name).join(', ')}</p>
                  )}
                  <p className="text-sm text-brand font-medium">
                    {item.product.price_per_day + optTotal} Kč/день × {days} дн. = {(item.product.price_per_day + optTotal) * days} Kč
                  </p>
                </div>
                <button className="btn-outline text-red-600 shrink-0" onClick={() => removeFromCart(item._key)}>Убрать</button>
              </div>
              {isUnavailable && (
                <div className="mt-2 space-y-2">
                  <p className="text-sm font-medium text-red-700">⚠ Товар временно недоступен на выбранную дату</p>
                  <div className="flex gap-2 flex-wrap items-center">
                    {notifySuccess[item.product.id] === 'done' ? (
                      <p className="text-sm text-green-700 font-medium">
                        ✅ Как только товар освободится, мы напишем на {form.email || 'ваш email'}
                      </p>
                    ) : (
                      <button className="btn text-xs bg-amber-100 text-amber-800 hover:bg-amber-200"
                        onClick={() => requestNotify(item.product.id, item.product.name)}
                        disabled={!form.email || notifySuccess[item.product.id] === 'loading'}>
                        {notifySuccess[item.product.id] === 'loading' ? 'Отправка...' : form.email ? 'Уведомить о доступности' : 'Укажите email ниже'}
                      </button>
                    )}
                    <button className="btn-outline text-xs text-red-600" onClick={() => removeFromCart(item._key)}>
                      Убрать из корзины
                    </button>
                  </div>
                </div>
              )}
            </article>
          )
        })}
        <div className="space-y-1 pt-2 border-t border-slate-200">
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Аренда ({days} дн.):</span>
            <span>{grandTotal} Kč</span>
          </div>
          {deliveryFee > 0 && (
            <div className="flex justify-between items-center text-slate-600">
              <span>Доставка / отвоз:</span>
              <span>{deliveryFee} Kč</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-1 border-t border-slate-100">
            <span className="font-semibold text-lg">Итого:</span>
            <strong className="text-xl text-brand">{totalWithFee} Kč</strong>
          </div>
        </div>
      </section>

      {/* Delivery */}
      <section className="card space-y-4">
        <h2 className="text-xl font-semibold">Получение и возврат</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">Получение товара</p>
            <div className="flex flex-col gap-2">
              {[['delivery', '🚚 Доставка по адресу'], ['pickup', '🏠 Самовывоз (Прага 7)']].map(([v, l]) => (
                <label key={v} className={`flex items-center gap-2 cursor-pointer rounded-xl border p-3 transition ${deliveryType === v ? 'border-green-600 bg-green-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input type="radio" name="delivery" value={v} checked={deliveryType === v}
                    onChange={() => setDeliveryType(v)} className="accent-green-700" />
                  <span className="text-sm font-medium">{l}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">Возврат товара</p>
            <div className="flex flex-col gap-2">
              {[['pickup', '🚚 Забираем сами'], ['self', '🏠 Самоотвоз (Прага 7)']].map(([v, l]) => (
                <label key={v} className={`flex items-center gap-2 cursor-pointer rounded-xl border p-3 transition ${returnType === v ? 'border-green-600 bg-green-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input type="radio" name="returnType" value={v} checked={returnType === v}
                    onChange={() => setReturnType(v)} className="accent-green-700" />
                  <span className="text-sm font-medium">{l}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        {deliveryFee > 0 ? (
          <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 flex justify-between items-center">
            <span>🚛 Доставка / отвоз{deliveryFee === 249 ? ' (туда и обратно)' : ' (одна поездка)'}</span>
            <strong>{deliveryFee} Kč</strong>
          </div>
        ) : (
          <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
            ✅ Самовывоз и самоотвоз в Прагу 7 — <strong>бесплатно</strong>
          </div>
        )}

        {/* Date picker */}
        <div>
          <h3 className="mb-1 font-medium text-slate-700">
            {deliveryType === 'delivery' ? 'Дата доставки' : 'Дата самовывоза'}
          </h3>
          <p className="mb-3 text-sm text-slate-500">
            {deliveryType === 'delivery'
              ? 'Светло-зелёные даты — доступны для доставки. Серые — недоступны.'
              : 'Светло-зелёные даты — доступны для самовывоза. Серые — недоступны.'}
          </p>
          <div className="datepicker-wrapper">
            <DatePicker
              locale="ru"
              inline
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              filterDate={filterDate}
              minDate={new Date()}
            />
          </div>
          {selectedDate && (
            <p className="mt-2 text-sm font-medium text-green-700">
              Выбрано: {selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>

        {/* Time slot picker */}
        <div>
            <h3 className="mb-2 font-medium text-slate-700">
              {deliveryType === 'delivery' ? 'Время доставки' : 'Время самовывоза'}
            </h3>
            {!selectedDate ? (
              <p className="text-sm text-slate-400">
                {deliveryType === 'delivery' ? 'Сначала выберите дату доставки выше.' : 'Сначала выберите дату самовывоза выше.'}
              </p>
            ) : slotsForDate.length === 0 ? (
              <p className="text-sm text-slate-400">Для этой даты слоты не настроены — уточните время в комментарии.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {slotsForDate.map((slot) => {
                  const h = parseInt(slot.split(':')[0], 10)
                  const isSelected = selectedSlot === slot
                  const isBooked = (bookedSlots[selectedIso] || []).includes(slot)
                  return (
                    <button key={slot} type="button"
                      disabled={isBooked}
                      onClick={() => !isBooked && setSelectedSlot(isSelected ? '' : slot)}
                      title={isBooked ? 'Слот уже занят' : ''}
                      className={`px-4 py-2 rounded-xl border text-sm font-medium transition
                        ${isBooked
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through'
                          : isSelected
                            ? 'bg-green-700 text-white border-green-700'
                            : 'bg-green-50 text-green-800 border-green-200 hover:bg-green-100 hover:border-green-400'}`}>
                      {h}:00 – {h + 1}:00
                      {isBooked && <span className="ml-1 text-xs">✕</span>}
                    </button>
                  )
                })}
              </div>
            )}
        </div>
      </section>

      {/* Payment method */}
      <section className="card space-y-4">
        <h2 className="text-xl font-semibold">Оплата</h2>
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">Способ оплаты</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['cash',     '💵 Наличными'],
              ['transfer', '🏦 Банковским переводом'],
              ['crypto',   '₿ Криптовалютой'],
            ].map(([v, l]) => (
              <label key={v} className={`flex items-center gap-2 cursor-pointer rounded-xl border p-3 transition ${paymentMethod === v ? 'border-green-600 bg-green-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input type="radio" name="paymentMethod" value={v} checked={paymentMethod === v}
                  onChange={() => setPaymentMethod(v)} className="accent-green-700" />
                <span className="text-sm font-medium">{l}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">Залог</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {[
              ['same', '↩ Тем же способом (возврат тем же способом)'],
              ['cash', '💵 Залог наличными'],
            ].map(([v, l]) => (
              <label key={v} className={`flex items-center gap-2 cursor-pointer rounded-xl border p-3 transition ${depositMethod === v ? 'border-green-600 bg-green-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input type="radio" name="depositMethod" value={v} checked={depositMethod === v}
                  onChange={() => setDepositMethod(v)} className="accent-green-700" />
                <span className="text-sm">{l}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Contact form */}
      <section className="card space-y-3">
        <h2 className="text-xl font-semibold">Контактные данные</h2>
        <form ref={formRef} onSubmit={handleCheckAndSubmit} className="grid gap-3">
          <input className="input" placeholder="Ваше имя" value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} required />
          <input className="input" type="email" placeholder="Email" value={form.email}
            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} required />
          <input className="input" placeholder="Телефон" value={form.phone}
            onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} required />
          <textarea className="input min-h-20" placeholder="Комментарий (необязательно)"
            value={form.comment} onChange={(e) => setForm((s) => ({ ...s, comment: e.target.value }))} />
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          <div className="flex gap-3">
            <button type="button" className="btn-outline flex-1" onClick={() => navigate('/')}>Отмена</button>
            <button
              type="button"
              className="btn-primary flex-1"
              disabled={loading || unavailableIds.length > 0}
              onClick={() => {
                if (formRef.current?.checkValidity()) setPaymentStub(true)
                else formRef.current?.reportValidity()
              }}
            >
              {loading ? 'Проверка...' : (
                paymentMethod === 'cash'
                  ? `Оформить заказ — ${totalWithFee} Kč`
                  : `Перейти к оплате — ${totalWithFee} Kč`
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Unavailability modal */}
      {unavailableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="text-center">
              <p className="text-4xl mb-3">⚠️</p>
              <h2 className="text-xl font-bold text-slate-800">Товар недоступен</h2>
              <p className="mt-2 text-slate-600">{unavailableModal.message}</p>
              <p className="mt-1 text-sm text-slate-500">Выберите другие даты или уберите товар из корзины.</p>
            </div>
            <div className="grid gap-2">
              <button className="btn-primary w-full"
                onClick={async () => {
                  setUnavailableModal(null)
                  if (form.email) {
                    await notifyAvailability({ email: form.email, product_id: 'unknown', product_name: unavailableModal.message })
                  }
                }}>
                🔔 Уведомить, когда появится
              </button>
              <button className="btn-outline w-full" onClick={() => setUnavailableModal(null)}>
                Выбрать другие даты
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment modal */}
      {paymentStub && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full my-8 shadow-2xl overflow-hidden">

            {/* ── Header strip ── */}
            <div style={{ background: 'linear-gradient(135deg, #0a3d1f, #1a8c3f)' }} className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-white/70 text-xs uppercase tracking-widest font-medium">
                  {paymentMethod === 'cash'     && 'Оплата наличными'}
                  {paymentMethod === 'transfer' && 'QR platba · перевод'}
                  {paymentMethod === 'crypto'   && 'Крипто-оплата'}
                  {paymentMethod === 'card'     && 'Оплата картой'}
                </p>
                <p className="text-white text-2xl font-bold mt-0.5">{totalWithFee} Kč</p>
                {deliveryFee > 0 && (
                  <p className="text-white/60 text-xs">аренда {grandTotal} + доставка {deliveryFee} Kč</p>
                )}
              </div>
              <button onClick={() => setPaymentStub(false)}
                className="text-white/60 hover:text-white text-2xl leading-none transition">✕</button>
            </div>

            <div className="p-6 space-y-4">

              {/* ════ MISSING ENV BANNER ════ */}
              {((paymentMethod === 'transfer' && MISSING_BANK_ENV) ||
                (paymentMethod === 'crypto'   && MISSING_CRYPTO_ENV)) && (
                <div className="rounded-xl bg-red-50 border border-red-300 p-4 space-y-2 text-sm">
                  <p className="font-bold text-red-700">⚠️ Ошибка конфигурации</p>
                  <p className="text-red-600">Не заданы переменные окружения для оплаты. Добавьте в Vercel и сделайте Redeploy:</p>
                  <ul className="font-mono text-xs text-red-800 space-y-0.5 list-disc list-inside">
                    {paymentMethod === 'transfer' && MISSING_BANK_ENV && (
                      <>
                        {!BANK_IBAN && <li>VITE_BANK_IBAN</li>}
                        {!BANK_BIC  && <li>VITE_BANK_BIC</li>}
                        {!BANK_NAME && <li>VITE_BANK_NAME</li>}
                      </>
                    )}
                    {paymentMethod === 'crypto' && MISSING_CRYPTO_ENV && (
                      <li>VITE_CRYPTO_USDT</li>
                    )}
                  </ul>
                </div>
              )}

              {/* ════ НАЛИЧНЫЕ ════ */}
              {paymentMethod === 'cash' && (
                <>
                  <div className="rounded-xl bg-green-50 border border-green-200 p-4 space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">💵</span>
                      <div>
                        <p className="font-semibold text-slate-800">Оплата при передаче оборудования</p>
                        <p className="text-slate-500 text-xs mt-0.5">Подготовьте точную сумму наличными чешскими кронами</p>
                      </div>
                    </div>
                    <div className="border-t border-green-200 pt-3 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">К оплате</span>
                        <span className="font-bold text-green-700 text-base">{totalWithFee} Kč</span>
                      </div>
                      {deliveryFee > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">в т.ч. доставка</span>
                          <span className="text-slate-500">{deliveryFee} Kč</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-1.5 text-xs text-amber-800">
                    <p className="font-semibold">Залог возвращается</p>
                    <p>Залог принимается и возвращается наличными при сдаче оборудования в полной комплектности без повреждений.</p>
                  </div>
                  <button
                    className="btn-primary w-full"
                    onClick={() => { setPaymentStub(false); formRef.current?.requestSubmit() }}
                  >
                    Подтвердить заказ
                  </button>
                </>
              )}

              {/* ════ БАНКОВСКИЙ ПЕРЕВОД / QR PLATBA ════ */}
              {paymentMethod === 'transfer' && (
                <>
                  {/* Tabs */}
                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                    <span className="text-center text-xs font-semibold py-1.5 rounded-lg bg-white shadow-sm text-green-800">QR код</span>
                    <span className="text-center text-xs font-medium py-1.5 text-slate-400">Реквизиты ниже</span>
                  </div>

                  {/* QR */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 bg-white border-2 border-green-200 rounded-2xl shadow-sm">
                      <QRCode
                        value={buildSpdQr(BANK_IBAN, totalWithFee, orderVs)}
                        size={190}
                        fgColor="#0a3d1f"
                      />
                    </div>
                    <p className="text-xs text-slate-400 text-center">Отсканируйте в банковском приложении<br/>(Česká spořitelna, ČSOB, Raiffeisenbank и др.)</p>
                  </div>

                  {/* Manual details */}
                  <div className="rounded-xl bg-green-50 border border-green-200 divide-y divide-green-200 text-sm overflow-hidden">
                    {[
                      { label: 'Получатель', value: BANK_NAME, mono: false },
                      { label: 'IBAN',        value: BANK_IBAN, mono: true },
                      { label: 'BIC / SWIFT', value: BANK_BIC,  mono: true },
                      { label: 'Сумма',       value: `${totalWithFee} Kč`, mono: false, bold: true },
                      { label: 'Variabilní symbol', value: orderVs, mono: true, bold: true, highlight: true },
                    ].map(({ label, value, mono, bold, highlight }) => (
                      <div key={label} className={`flex items-center justify-between gap-2 px-3 py-2.5 ${highlight ? 'bg-green-100' : ''}`}>
                        <span className="text-slate-500 shrink-0">{label}</span>
                        <div className="flex items-center gap-1 min-w-0">
                          <span className={`${mono ? 'font-mono text-xs' : ''} ${bold ? 'font-bold text-green-800' : 'text-slate-800'} truncate`}>{value}</span>
                          <CopyButton text={value} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                    ⚠ Обязательно укажите <strong>variabilní symbol {orderVs}</strong> — по нему мы идентифицируем ваш платёж.
                  </div>

                  <button
                    className="btn-primary w-full"
                    onClick={() => { setPaymentStub(false); formRef.current?.requestSubmit() }}
                  >
                    Я оплатил — оформить заказ
                  </button>
                </>
              )}

              {/* ════ КРИПТА ════ */}
              {paymentMethod === 'crypto' && (
                <>
                  <p className="text-sm text-slate-500 text-center">
                    Переведите сумму, эквивалентную <strong className="text-slate-800">{totalWithFee} Kč</strong>, на кошелёк USDT TRC-20.
                    После оплаты нажмите «Я оплатил».
                  </p>

                  {/* USDT */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-indigo-700 px-4 py-2 flex items-center gap-2">
                      <span className="text-white text-lg font-bold">₮</span>
                      <span className="text-white text-sm font-semibold">USDT ERC-20 (Ethereum)</span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex justify-center">
                        <div className="p-2 bg-white border border-slate-200 rounded-xl">
                          <QRCode value={CRYPTO_USDT} size={150} fgColor="#3730a3" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                        <span className="font-mono text-xs text-slate-600 truncate flex-1 select-all">{CRYPTO_USDT}</span>
                        <CopyButton text={CRYPTO_USDT} />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                    ⚠ Курс рассчитывается на момент поступления платежа. Укажите в комментарии транзакции ваш email или номер заказа.
                  </div>

                  <button
                    className="btn-primary w-full"
                    onClick={() => { setPaymentStub(false); formRef.current?.requestSubmit() }}
                  >
                    Я оплатил — оформить заказ
                  </button>
                </>
              )}

              {/* ════ КАРТА (заглушка) ════ */}
              {paymentMethod === 'card' && (
                <>
                  <div className="text-center py-4">
                    <p className="text-5xl mb-3">💳</p>
                    <p className="text-slate-600 text-sm">Онлайн-оплата картой находится в разработке.</p>
                    <p className="text-slate-500 text-xs mt-1">Пока воспользуйтесь QR-переводом или наличными.</p>
                  </div>
                  <button className="btn-outline w-full" onClick={() => setPaymentStub(false)}>
                    Назад к выбору оплаты
                  </button>
                </>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
