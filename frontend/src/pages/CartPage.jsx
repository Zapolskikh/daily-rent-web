import DatePicker, { registerLocale } from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { checkAvailability, createOrder, getAvailableDates, notifyAvailability } from '../lib/api'
import { ru } from 'date-fns/locale/ru'

registerLocale('ru', ru)

const HOURS = Array.from({ length: 12 }, (_, i) => {
  const h = i + 8
  return {
    value: `${String(h).padStart(2, '0')}:00-${String(h + 1).padStart(2, '0')}:00`,
    label: `${h}:00 – ${h + 1}:00`,
  }
})

export default function CartPage() {
  const { items, removeFromCart, clearCart } = useCart()
  const navigate = useNavigate()

  const [deliveryType, setDeliveryType] = useState('delivery')
  const [selectedDates, setSelectedDates] = useState([])
  const [availableDates, setAvailableDates] = useState([])
  const [availableSlots, setAvailableSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState('')

  const [form, setForm] = useState({ name: '', email: '', phone: '', comment: '' })
  const [unavailableIds, setUnavailableIds] = useState([])
  const [unavailableModal, setUnavailableModal] = useState(null) // { message, productName }
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    getAvailableDates()
      .then((data) => {
        const raw = data.dates || []
        setAvailableDates(raw.filter((d) => !d.includes(':')))
        setAvailableSlots(raw.filter((d) => d.includes(':')))
      })
      .catch(() => {})
  }, [])

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

  const days = Math.max(selectedDates.length, 1)
  const itemTotals = items.map((item) => {
    const optTotal = item.selectedOptions.reduce((s, o) => s + o.price, 0)
    return (item.product.price_per_day + optTotal) * days * item.quantity
  })
  const grandTotal = itemTotals.reduce((s, v) => s + v, 0)

  function isDateAvailable(date) {
    const iso = date.toISOString().slice(0, 10)
    return availableDates.includes(iso)
  }

  function handleDateChange(dates) {
    setSelectedDates((dates || []).map((d) => d.toISOString().slice(0, 10)))
  }

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
      const { unavailable_product_ids } = await checkAvailability({
        items: items.map((item) => ({ product_id: item.product.id })),
        dates: selectedDates,
      })
      if (unavailable_product_ids.length > 0) {
        setUnavailableIds(unavailable_product_ids)
        setLoading(false)
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
        dates: selectedDates,
        delivery_slot: selectedSlot || null,
      })

      clearCart()
      setSuccess(true)
    } catch (err) {
      // 409 = товар занят (server-side double-check)
      if (err.message && err.message.includes('недоступен')) {
        setUnavailableModal({ message: err.message })
      } else {
        setSubmitError(err.message || 'Ошибка при оформлении заказа')
      }
    } finally {
      setLoading(false)
    }
  }

  async function requestNotify(productId, productName) {
    try {
      await notifyAvailability({ email: form.email || 'unknown', product_id: productId, product_name: productName })
    } catch {}
  }

  const selectedDateObjs = selectedDates.map((d) => new Date(d + 'T00:00:00'))

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
                  <p className="text-sm font-medium text-red-700">⚠ Товар временно недоступен на выбранные даты</p>
                  <div className="flex gap-2 flex-wrap">
                    <button className="btn text-xs bg-amber-100 text-amber-800 hover:bg-amber-200"
                      onClick={() => requestNotify(item.product.id, item.product.name)}>
                      Уведомить о доступности
                    </button>
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
          <h3 className="mb-3 font-medium text-slate-700">
            Выберите даты аренды
            <span className="ml-2 text-sm font-normal text-slate-500">
              {availableDates.length > 0 ? '(доступные даты подсвечены)' : '(загрузка...)'}
            </span>
          </h3>
          <div className="datepicker-wrapper">
            <DatePicker
              locale="ru"
              inline
              selectsMultiple
              selectedDates={selectedDateObjs}
              onChange={handleDateChange}
              filterDate={isDateAvailable}
              minDate={new Date()}
            />
          </div>
          {selectedDates.length > 0 && (
            <p className="mt-2 text-sm text-teal-700">
              Выбрано {selectedDates.length} дн.: {selectedDates.sort().join(', ')}
            </p>
          )}
        </div>

        {/* Time slot picker */}
        {deliveryType === 'delivery' && (
          <div>
            <h3 className="mb-2 font-medium text-slate-700">Временной слот доставки</h3>
            <div className="flex flex-wrap gap-2">
              {(availableSlots.length > 0 ? availableSlots : HOURS.map((h) => h.value)).map((slot) => {
                const label = availableSlots.length > 0 ? slot : HOURS.find((h) => h.value === slot)?.label || slot
                return (
                  <button key={slot} type="button"
                    onClick={() => setSelectedSlot(slot === selectedSlot ? '' : slot)}
                    className={`px-4 py-2 rounded-xl border text-sm font-medium transition
                      ${selectedSlot === slot
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'border-slate-200 text-slate-700 hover:border-teal-400 hover:text-teal-700'}`}>
                    {label}
                  </button>
                )
              })}
            </div>
            {selectedSlot && (
              <p className="mt-2 text-sm text-teal-700">Слот: <strong>{selectedSlot}</strong></p>
            )}
          </div>
        )}
      </section>

      {/* Contact form */}
      <section className="card space-y-3">
        <h2 className="text-xl font-semibold">Контактные данные</h2>
        <form onSubmit={handleCheckAndSubmit} className="grid gap-3">
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
    </div>
  )
}
