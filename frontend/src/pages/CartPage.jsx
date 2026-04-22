import DatePicker, { registerLocale } from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { checkAvailability, createOrder, getAvailableDates, getBookedSlots, notifyAvailability } from '../lib/api'
import { ru } from 'date-fns/locale/ru'

registerLocale('ru', ru)

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
  const [paymentStub, setPaymentStub] = useState(false)
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
        <p className="text-slate-600">Мы свяжемся с вами по email и телефону для подтверждения.</p>
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

  // Only available dates can be picked; grey out the rest
  function filterDate(date) {
    const iso = date.toISOString().slice(0, 10)
    return datesWithSlots.has(iso)
  }

  async function handleCheckAndSubmit(e) {
    e.preventDefault()
    setSubmitError('')
    setUnavailableIds([])

    if (deliveryType === 'delivery' && !selectedDate) {
      setSubmitError('Выберите дату доставки')
      return
    }
    if (deliveryType === 'delivery' && slotsForDate.length > 0 && !selectedSlot) {
      setSubmitError('Выберите временной слот доставки')
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
        <div className="flex justify-between items-center pt-2 border-t border-slate-200">
          <span className="font-semibold text-lg">Итого ({days} дн.):</span>
          <strong className="text-xl text-brand">{grandTotal} Kč</strong>
        </div>
      </section>

      {/* Delivery */}
      <section className="card space-y-4">
        <h2 className="text-xl font-semibold">Способ получения</h2>
        <div className="flex gap-4">
          {[['delivery', 'Доставка'], ['pickup', 'Самовывоз']].map(([v, l]) => (
            <label key={v} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="delivery" value={v} checked={deliveryType === v}
                onChange={() => setDeliveryType(v)} className="accent-teal-600" />
              <span className="font-medium">{l}</span>
            </label>
          ))}
        </div>

        {/* Date picker */}
        <div>
          <h3 className="mb-1 font-medium text-slate-700">Дата доставки</h3>
          <p className="mb-3 text-sm text-slate-500">
            Светло-зелёные даты — доступны для доставки. Серые — недоступны.
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
            <p className="mt-2 text-sm font-medium text-teal-700">
              Выбрано: {selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>

        {/* Time slot picker */}
        {deliveryType === 'delivery' && (
          <div>
            <h3 className="mb-2 font-medium text-slate-700">Время доставки</h3>
            {!selectedDate ? (
              <p className="text-sm text-slate-400">Сначала выберите дату доставки выше.</p>
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
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100 hover:border-teal-400'}`}>
                      {h}:00 – {h + 1}:00
                      {isBooked && <span className="ml-1 text-xs">✕</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
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
            <button type="submit" className="btn-primary flex-1" disabled={loading || unavailableIds.length > 0}>
              {loading ? 'Проверка...' : 'Оформить заказ'}
            </button>
          </div>
          <button
            type="button"
            className="w-full rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm text-slate-500 hover:border-teal-400 hover:text-teal-700 transition"
            disabled={loading || unavailableIds.length > 0}
            onClick={() => setPaymentStub(true)}
          >
            💳 Оплатить онлайн — {grandTotal} Kč <span className="text-xs opacity-60">(тестовый режим)</span>
          </button>
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

      {/* Payment stub modal */}
      {paymentStub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <div className="text-center">
              <p className="text-4xl mb-2">💳</p>
              <h2 className="text-xl font-bold text-slate-800">Онлайн-оплата</h2>
              <p className="mt-2 text-slate-600 font-semibold text-2xl">{grandTotal} Kč</p>
              <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                ⚠ Тестовый режим — реальная оплата не производится
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2 h-10 rounded-lg bg-slate-100 animate-pulse" />
                <div className="h-10 rounded-lg bg-slate-100 animate-pulse" />
                <div className="h-10 rounded-lg bg-slate-100 animate-pulse" />
              </div>
              <p className="text-center text-xs text-slate-400">Форма оплаты появится здесь</p>
            </div>
            <div className="grid gap-2">
              <button
                className="btn-primary w-full"
                onClick={() => { setPaymentStub(false); formRef.current?.requestSubmit() }}
              >
                Оплатить {grandTotal} Kč (тест)
              </button>
              <button className="btn-outline w-full" onClick={() => setPaymentStub(false)}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
