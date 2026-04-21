import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { checkAvailability, createOrder, getAvailableDates, notifyAvailability } from '../lib/api'

const DAYS_AHEAD = 60

function buildCalendarDays(availableDates) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = []
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const iso = d.toISOString().slice(0, 10)
    days.push({ iso, available: availableDates.includes(iso) })
  }
  return days
}

const MONTH_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

export default function CartPage() {
  const { items, removeFromCart, clearCart } = useCart()
  const navigate = useNavigate()

  const [deliveryType, setDeliveryType] = useState('delivery')
  const [selectedDates, setSelectedDates] = useState([])
  const [availableDates, setAvailableDates] = useState([])
  const [calendarDays, setCalendarDays] = useState([])

  const [form, setForm] = useState({ name: '', email: '', phone: '', comment: '' })
  const [unavailableIds, setUnavailableIds] = useState([])
  const [removing, setRemoving] = useState(null) // product id after unavailability check

  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    getAvailableDates()
      .then((data) => {
        setAvailableDates(data.dates || [])
        setCalendarDays(buildCalendarDays(data.dates || []))
      })
      .catch(() => {})
  }, [])

  if (items.length === 0 && !success) {
    return (
      <div className="card text-center py-16 space-y-4">
        <p className="text-xl text-slate-500">Корзина пуста</p>
        <Link to="/" className="btn-primary inline-block">
          Перейти в каталог
        </Link>
      </div>
    )
  }

  if (success) {
    return (
      <div className="card text-center py-16 space-y-4">
        <p className="text-3xl">✅</p>
        <h2 className="text-2xl font-bold">Заказ оформлен!</h2>
        <p className="text-slate-600">Мы свяжемся с вами по email и телефону для подтверждения.</p>
        <Link to="/" className="btn-primary inline-block">
          На главную
        </Link>
      </div>
    )
  }

  // Price calculations
  const days = deliveryType === 'pickup' ? Math.max(selectedDates.length, 1) : Math.max(selectedDates.length, 1)
  const itemTotals = items.map((item) => {
    const optTotal = item.selectedOptions.reduce((s, o) => s + o.price, 0)
    return (item.product.price_per_day + optTotal) * days * item.quantity
  })
  const grandTotal = itemTotals.reduce((s, v) => s + v, 0)

  function toggleDate(iso) {
    setSelectedDates((prev) =>
      prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso],
    )
  }

  // group calendar days by month for display
  const grouped = []
  calendarDays.forEach((day) => {
    const d = new Date(day.iso)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const last = grouped[grouped.length - 1]
    if (!last || last.key !== key) {
      grouped.push({ key, label: `${MONTH_RU[d.getMonth()]} ${d.getFullYear()}`, days: [day] })
    } else {
      last.days.push(day)
    }
  })

  async function handleCheckAndSubmit(e) {
    e.preventDefault()
    setSubmitError('')
    setUnavailableIds([])

    if (deliveryType === 'delivery' && selectedDates.length === 0) {
      setSubmitError('Выберите хотя бы одну дату доставки')
      return
    }

    setLoading(true)
    try {
      // Check availability
      const { unavailable_product_ids } = await checkAvailability({
        items: items.map((item) => ({ product_id: item.product.id })),
        dates: selectedDates,
      })

      if (unavailable_product_ids.length > 0) {
        setUnavailableIds(unavailable_product_ids)
        setLoading(false)
        return
      }

      // All available — submit order
      const orderItems = items.map((item) => ({
        product_id: item.product.id,
        product_name: item.product.name,
        price_per_day: item.product.price_per_day,
        selected_options: item.selectedOptions.map((o) => ({
          id: o.id,
          name: o.name,
          price: o.price,
        })),
      }))

      await createOrder({
        ...form,
        items: orderItems,
        delivery_type: deliveryType,
        dates: selectedDates,
      })

      clearCart()
      setSuccess(true)
    } catch (err) {
      setSubmitError(err.message || 'Ошибка при оформлении заказа')
    } finally {
      setLoading(false)
    }
  }

  async function requestNotify(productId, productName) {
    try {
      await notifyAvailability({ email: form.email || 'unknown', product_id: productId, product_name: productName })
    } catch {
      // best-effort
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
            <article
              key={item._key}
              className={`rounded-xl border p-4 space-y-1 ${isUnavailable ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{item.product.name}</h3>
                  {item.selectedOptions.length > 0 && (
                    <p className="text-sm text-slate-600">
                      + {item.selectedOptions.map((o) => o.name).join(', ')}
                    </p>
                  )}
                  <p className="text-sm text-brand font-medium">
                    {item.product.price_per_day + optTotal} Kč/день × {days} дн. = {(item.product.price_per_day + optTotal) * days} Kč
                  </p>
                </div>
                <button
                  className="btn-outline text-red-600 shrink-0"
                  onClick={() => removeFromCart(item._key)}
                >
                  Убрать
                </button>
              </div>

              {isUnavailable && (
                <div className="mt-2 space-y-2">
                  <p className="text-sm font-medium text-red-700">
                    ⚠ Товар временно недоступен на выбранные даты
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      className="btn text-xs bg-amber-100 text-amber-800 hover:bg-amber-200"
                      onClick={() => requestNotify(item.product.id, item.product.name)}
                    >
                      Уведомить о доступности
                    </button>
                    <button
                      className="btn-outline text-xs text-red-600"
                      onClick={() => removeFromCart(item._key)}
                    >
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
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="delivery"
              value="delivery"
              checked={deliveryType === 'delivery'}
              onChange={() => setDeliveryType('delivery')}
              className="accent-teal-600"
            />
            <span className="font-medium">Доставка</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="delivery"
              value="pickup"
              checked={deliveryType === 'pickup'}
              onChange={() => setDeliveryType('pickup')}
              className="accent-teal-600"
            />
            <span className="font-medium">Самовывоз</span>
          </label>
        </div>

        {/* Calendar */}
        <div>
          <h3 className="mb-2 font-medium text-slate-700">
            Выберите даты аренды
            <span className="ml-2 text-sm font-normal text-slate-500">(только доступные выделены)</span>
          </h3>
          {grouped.map((month) => (
            <div key={month.key} className="mb-4">
              <p className="mb-1 text-sm font-semibold text-slate-500 uppercase tracking-wide">{month.label}</p>
              <div className="flex flex-wrap gap-2">
                {month.days.map(({ iso, available }) => {
                  const selected = selectedDates.includes(iso)
                  const day = new Date(iso).getDate()
                  return (
                    <button
                      key={iso}
                      disabled={!available}
                      onClick={() => available && toggleDate(iso)}
                      className={`h-9 w-9 rounded-lg text-sm font-medium transition
                        ${!available ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : ''}
                        ${available && !selected ? 'bg-teal-50 text-teal-800 hover:bg-teal-100' : ''}
                        ${selected ? 'bg-brand text-white' : ''}
                      `}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          {selectedDates.length > 0 && (
            <p className="text-sm text-teal-700">
              Выбрано: {selectedDates.sort().join(', ')}
            </p>
          )}
        </div>
      </section>

      {/* Contact form */}
      <section className="card space-y-3">
        <h2 className="text-xl font-semibold">Контактные данные</h2>
        <form onSubmit={handleCheckAndSubmit} className="grid gap-3">
          <input
            className="input"
            placeholder="Ваше имя"
            value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            required
          />
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            required
          />
          <input
            className="input"
            placeholder="Телефон"
            value={form.phone}
            onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
            required
          />
          <textarea
            className="input min-h-20"
            placeholder="Комментарий (необязательно)"
            value={form.comment}
            onChange={(e) => setForm((s) => ({ ...s, comment: e.target.value }))}
          />

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              className="btn-outline flex-1"
              onClick={() => navigate('/')}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={loading || unavailableIds.length > 0}
            >
              {loading ? 'Проверка...' : 'Оформить заказ'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
