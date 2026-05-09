import DatePicker, { registerLocale } from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { useEffect, useRef, useState } from 'react'
import QRCode from 'react-qr-code'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
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

// ─── Price tier helpers ────────────────────────────────────────────────────────
const PRICE_TIERS = [
  { minDays: 15, coeff: 0.60, label: '-40%', desc: 'от 15 дней' },
  { minDays: 8,  coeff: 0.70, label: '-30%', desc: '8–14 дней' },
  { minDays: 4,  coeff: 0.80, label: '-20%', desc: '4–7 дней' },
  { minDays: 2,  coeff: 0.90, label: '-10%', desc: '2–3 дня' },
  { minDays: 1,  coeff: 1.00, label:  '',    desc: '1 день' },
]

function getPriceTier(days) {
  for (const tier of PRICE_TIERS) {
    if (days >= tier.minDays) return tier
  }
  return PRICE_TIERS[PRICE_TIERS.length - 1]
}

function getDatesBetween(start, end) {
  if (!start) return []
  const endNorm = end || start
  const dates = []
  const cur = new Date(start)
  cur.setHours(0, 0, 0, 0)
  const fin = new Date(endNorm)
  fin.setHours(0, 0, 0, 0)
  while (cur <= fin) {
    dates.push(cur.toISOString().slice(0, 10))
    cur.setDate(cur.getDate() + 1)
  }
  return dates
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
  const { user } = useAuth()
  const navigate = useNavigate()

  const [deliveryType, setDeliveryType] = useState('delivery')
  const [selectedDate, setSelectedDate] = useState(null)    // start date
  const [endDate, setEndDate] = useState(null)              // end date
  const [availableDates, setAvailableDates] = useState([])   // ['YYYY-MM-DD', ...]
  const [availableSlots, setAvailableSlots] = useState([])   // ['YYYY-MM-DD:HH:MM-HH:MM', ...]
  const [bookedSlots, setBookedSlots] = useState({})         // { 'YYYY-MM-DD': ['HH:MM-HH:MM', ...] }
  const [selectedSlot, setSelectedSlot] = useState('')       // start time
  const [endSlot, setEndSlot] = useState('')                 // end time

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
  const [promoInput, setPromoInput] = useState('')
  const [promoApplied, setPromoApplied] = useState(false)
  const [promoError, setPromoError] = useState('')
  const formRef = useRef(null)

  const PROMO_CODE = 'summerbundle'
  const PROMO_DISCOUNT = 0.20

  // Re-validate promo when cart changes
  useEffect(() => {
    if (promoApplied && items.length < 2) {
      setPromoApplied(false)
      setPromoError('Промокод недействителен: в корзине менее 2 позиций')
    }
  }, [items, promoApplied])

  function applyPromo() {
    const code = promoInput.trim().toLowerCase()
    if (code !== PROMO_CODE) {
      setPromoError('Промокод не найден')
      setPromoApplied(false)
      return
    }
    if (items.length < 2) {
      setPromoError('Промокод действует при аренде 2 и более позиций')
      setPromoApplied(false)
      return
    }
    setPromoApplied(true)
    setPromoError('')
  }

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

  // Reset start slot when start date changes; reset end when start changes
  useEffect(() => { setSelectedSlot('') }, [selectedDate])
  useEffect(() => { setEndDate(null); setEndSlot('') }, [selectedDate])

  // Auto-fill form from logged-in user profile
  useEffect(() => {
    if (user && !form.name && !form.email && !form.phone) {
      setForm((f) => ({ ...f, name: user.name || '', email: user.email || '', phone: user.phone || '' }))
    }
  }, [user])

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
        <p className="text-slate-600">Мы получили вашу заявку и скоро свяжемся для подтверждения.</p>
        <p className="text-slate-500 text-sm">В день доставки мы заранее напишем или позвоним вам.</p>
        <Link to="/" className="btn-primary inline-block">На главную</Link>
      </div>
    )
  }

  const selectedIso = selectedDate ? selectedDate.toISOString().slice(0, 10) : null
  const endIso      = endDate      ? endDate.toISOString().slice(0, 10)      : null

  // Slots for start date (strip date prefix)
  const slotsForDate = selectedIso
    ? availableSlots
        .filter(d => d.startsWith(selectedIso + ':'))
        .map(d => d.slice(11))
    : []

  // Slots for end date
  const slotsForEndDate = endIso
    ? availableSlots.filter(d => d.startsWith(endIso + ':')).map(d => d.slice(11))
    : []

  // Dates that have ≥1 slot — these are "available" (light green)
  const datesWithSlots = new Set(
    availableDates.filter(d => availableSlots.some(s => s.startsWith(d + ':')))
  )

  // All dates in the selected range
  const allDates = getDatesBetween(selectedDate, endDate)
  const days = allDates.length || 1
  const priceTier = getPriceTier(days)
  const coefficient = priceTier.coeff

  const itemTotals = items.map((item) => {
    const optTotal = item.selectedOptions.reduce((s, o) => s + o.price, 0)
    return Math.round((item.product.price_per_day + optTotal) * coefficient * days * item.quantity)
  })
  const subtotal = itemTotals.reduce((s, v) => s + v, 0)
  const promoDiscount = promoApplied ? Math.round(subtotal * PROMO_DISCOUNT) : 0
  const grandTotal = subtotal - promoDiscount

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
      setSubmitError(deliveryType === 'delivery' ? 'Выберите дату начала доставки' : 'Выберите дату начала самовывоза')
      return
    }
    if (!endDate) {
      setSubmitError('Выберите дату окончания аренды')
      return
    }
    if (slotsForDate.length > 0 && !selectedSlot) {
      setSubmitError(deliveryType === 'delivery' ? 'Выберите время доставки' : 'Выберите время самовывоза')
      return
    }

    setLoading(true)
    try {
      const dates = allDates
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
        promo_discount: promoDiscount,
        dates,
        delivery_slot: selectedSlot || null,
        return_slot: endSlot || (endIso && !slotsForEndDate.length ? 'по договорённости' : null),
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
                    {item.product.price_per_day + optTotal} Kč/день
                    {coefficient < 1 && <span className="ml-1 text-green-700 font-semibold">× {coefficient.toFixed(2)}</span>}
                    {' '}× {days} дн. = {Math.round((item.product.price_per_day + optTotal) * coefficient * days)} Kč
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
          {priceTier.label && (
            <div className="flex items-center gap-2 text-sm text-green-700 font-medium mb-1">
              <span className="rounded-full bg-green-100 border border-green-300 px-2 py-0.5 text-xs font-bold">{priceTier.label}</span>
              <span>Скидка за длительную аренду ({priceTier.desc})</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Аренда ({days} дн.):</span>
            <span>{subtotal} Kč</span>
          </div>
          {promoApplied && (
            <div className="flex justify-between items-center text-green-700 font-medium">
              <span>🎉 Промокод summerbundle (−20%):</span>
              <span>−{promoDiscount} Kč</span>
            </div>
          )}
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

        {/* Promo code */}
        <div className="pt-2 border-t border-slate-200 space-y-2">
          <p className="text-sm font-medium text-slate-700">Промокод</p>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="Введите промокод"
              value={promoInput}
              onChange={(e) => { setPromoInput(e.target.value); setPromoError('') }}
              onKeyDown={(e) => e.key === 'Enter' && applyPromo()}
            />
            <button
              type="button"
              className={promoApplied ? 'btn bg-green-100 text-green-800 border border-green-300' : 'btn-outline'}
              onClick={promoApplied ? () => { setPromoApplied(false); setPromoInput('') } : applyPromo}
            >
              {promoApplied ? '✓ Применён' : 'Применить'}
            </button>
          </div>
          {promoError && <p className="text-xs text-red-600">{promoError}</p>}
          {promoApplied && <p className="text-xs text-green-700 font-medium">✓ Скидка 20% применена</p>}
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

        {/* Start date picker */}
        <div>
          <h3 className="mb-1 font-medium text-slate-700">
            {deliveryType === 'delivery' ? 'Дата начала доставки' : 'Дата начала самовывоза'}
          </h3>
          <p className="mb-3 text-sm text-slate-500">
            Светло-зелёные даты — доступны. Выберите дату начала аренды.
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
              Начало: {selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>

        {/* Start time slot picker */}
        <div>
          <h3 className="mb-2 font-medium text-slate-700">
            {deliveryType === 'delivery' ? 'Время доставки (начало)' : 'Время самовывоза (начало)'}
          </h3>
          {!selectedDate ? (
            <p className="text-sm text-slate-400">Сначала выберите дату начала выше.</p>
          ) : slotsForDate.length === 0 ? (
            <p className="text-sm text-slate-400">Для этой даты время не настроено — уточните в комментарии.</p>
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
                    title={isBooked ? 'Это время уже занято' : ''}
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

        {/* End date picker (any date >= startDate) */}
        <div>
          <h3 className="mb-1 font-medium text-slate-700">Дата окончания аренды</h3>
          <p className="mb-3 text-sm text-slate-500">
            Любая дата ≥ даты начала. Если дата недоступна — время возврата будет по договорённости.
          </p>
          {!selectedDate ? (
            <p className="text-sm text-slate-400">Сначала выберите дату начала выше.</p>
          ) : (
            <>
              <div className="datepicker-wrapper">
                <DatePicker
                  locale="ru"
                  inline
                  selected={endDate}
                  onChange={(date) => { setEndDate(date); setEndSlot('') }}
                  minDate={selectedDate}
                  dayClassName={(date) => {
                    const iso = date.toISOString().slice(0, 10)
                    return datesWithSlots.has(iso) ? 'datepicker-available' : undefined
                  }}
                />
              </div>
              {endDate && (
                <p className="mt-2 text-sm font-medium text-green-700">
                  Конец: {endDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {days > 1 && <span className="ml-2 text-slate-500">({days} дн.)</span>}
                  {priceTier.label && <span className="ml-2 rounded-full bg-green-100 border border-green-300 px-2 py-0.5 text-xs font-bold text-green-700">{priceTier.label}</span>}
                </p>
              )}
            </>
          )}
        </div>

        {/* End time slot picker */}
        {endDate && (
          <div>
            <h3 className="mb-2 font-medium text-slate-700">Время окончания аренды</h3>
            {slotsForEndDate.length === 0 ? (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-800">
                ⏰ Для этой даты время не указано — согласуем дополнительно.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {slotsForEndDate.map((slot) => {
                  const h = parseInt(slot.split(':')[0], 10)
                  const isSelected = endSlot === slot
                  return (
                    <button key={slot} type="button"
                      onClick={() => setEndSlot(isSelected ? '' : slot)}
                      className={`px-4 py-2 rounded-xl border text-sm font-medium transition
                        ${isSelected
                          ? 'bg-green-700 text-white border-green-700'
                          : 'bg-green-50 text-green-800 border-green-200 hover:bg-green-100 hover:border-green-400'}`}>
                      {h}:00 – {h + 1}:00
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
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
