import { useEffect, useState } from 'react'
import {
  adminLogin,
  createProduct,
  debugGetProductsRaw,
  debugResetProducts,
  deleteProduct,
  getAvailableDates,
  getCategories,
  getOrders,
  getProducts,
  setAvailableDates,
  updateOrderStatus,
  updateProduct,
  uploadImage,
} from '../lib/api'

const emptyForm = {
  name: '',
  category: 'party',
  description: '',
  price_per_day: '',
  image_url: '',
  stock_quantity: 1,
  options: [],
}

const emptyOption = { id: '', name: '', price: '' }

const DAYS_AHEAD = 90
const MONTH_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

function buildCalendarDays() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = []
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '')
  const [activeTab, setActiveTab] = useState('products') // products | orders | dates
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [newOption, setNewOption] = useState(emptyOption)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [debugRaw, setDebugRaw] = useState(null)

  // Orders tab
  const [orders, setOrders] = useState([])

  // Dates tab
  const [calendarDays] = useState(buildCalendarDays)
  const [selectedDates, setSelectedDates] = useState([])
  const [datesMessage, setDatesMessage] = useState('')

  async function refreshProducts() {
    const payload = await getProducts('')
    setProducts(payload.products || [])
  }

  async function handleDebugView() {
    try {
      const data = await debugGetProductsRaw(token)
      setDebugRaw(data)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDebugReset() {
    if (!confirm('Удалить все товары из БД и пересеять из products.json?')) return
    try {
      const result = await debugResetProducts(token)
      setMessage(result.message)
      await refreshProducts()
    } catch (err) {
      setError(err.message)
    }
  }

  async function refreshOrders() {
    try {
      const payload = await getOrders(token)
      setOrders(payload.orders || [])
    } catch { }
  }

  async function refreshDates() {
    try {
      const payload = await getAvailableDates()
      setSelectedDates(payload.dates || [])
    } catch { }
  }

  useEffect(() => {
    getCategories().then((payload) => setCategories(payload.categories || []))
    refreshProducts().catch(() => null)
  }, [])

  useEffect(() => {
    if (token) {
      refreshOrders()
      refreshDates()
    }
  }, [token])

  async function onLogin(event) {
    event.preventDefault()
    setError('')
    try {
      const payload = await adminLogin(password)
      setToken(payload.access_token)
      localStorage.setItem('admin_token', payload.access_token)
      setMessage('Вход выполнен')
      setPassword('')
    } catch (err) {
      setError(err.message)
    }
  }

  async function onSave(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    try {
      let imageUrl = form.image_url
      if (imageFile) {
        const upload = await uploadImage(imageFile, token)
        imageUrl = upload.image_url
      }
      const payload = {
        name: form.name,
        category: form.category,
        description: form.description,
        price_per_day: Number(form.price_per_day),
        image_url: imageUrl,
        stock_quantity: Number(form.stock_quantity),
        options: form.options,
      }
      if (editingId) {
        await updateProduct(editingId, payload, token)
      } else {
        await createProduct(payload, token)
      }
      await refreshProducts()
      setForm(emptyForm)
      setImageFile(null)
      setEditingId('')
      setMessage('Товар сохранен')
    } catch (err) {
      setError(err.message)
    }
  }

  async function onDelete(id) {
    try {
      await deleteProduct(id, token)
      await refreshProducts()
      setMessage('Товар удален')
    } catch (err) {
      setError(err.message)
    }
  }

  function startEdit(item) {
    setEditingId(item.id)
    setForm({
      name: item.name,
      category: item.category,
      description: item.description,
      price_per_day: item.price_per_day,
      image_url: item.image_url,
      stock_quantity: item.stock_quantity ?? 1,
      options: item.options ?? [],
    })
    setImageFile(null)
    setNewOption(emptyOption)
  }

  function logout() {
    localStorage.removeItem('admin_token')
    setToken('')
    setMessage('')
  }

  // Option management in form
  function addOption() {
    const opt = {
      id: newOption.id.trim() || ('opt-' + Date.now()),
      name: newOption.name.trim(),
      price: Number(newOption.price) || 0,
    }
    setForm((s) => ({ ...s, options: [...s.options, opt] }))
    setNewOption(emptyOption)
  }

  function removeOption(id) {
    setForm((s) => ({ ...s, options: s.options.filter((o) => o.id !== id) }))
  }

  // Dates management
  function toggleDate(iso) {
    setSelectedDates((prev) => prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso])
  }

  async function saveDates() {
    try {
      await setAvailableDates(selectedDates, token)
      setDatesMessage('Даты сохранены')
    } catch (err) {
      setDatesMessage('Ошибка: ' + err.message)
    }
  }

  // Group calendar by month
  const grouped = []
  calendarDays.forEach((iso) => {
    const d = new Date(iso)
    const key = d.getFullYear() + '-' + d.getMonth()
    const last = grouped[grouped.length - 1]
    if (!last || last.key !== key) {
      grouped.push({ key, label: MONTH_RU[d.getMonth()] + ' ' + d.getFullYear(), days: [iso] })
    } else {
      last.days.push(iso)
    }
  })

  const STATUS_LABELS = { pending: 'В ожидании', confirmed: 'Подтверждён', cancelled: 'Отменён' }
  const STATUS_COLORS = { pending: 'text-amber-700 bg-amber-50', confirmed: 'text-green-700 bg-green-50', cancelled: 'text-red-700 bg-red-50' }

  if (!token) {
    return (
      <section className="mx-auto max-w-md card">
        <h1 className="mb-4 text-2xl font-semibold">Вход в админ-панель</h1>
        <form onSubmit={onLogin} className="grid gap-3">
          <input type="password" className="input" value={password}
            placeholder="Пароль администратора" onChange={(e) => setPassword(e.target.value)} required />
          <button className="btn-primary" type="submit">Войти</button>
        </form>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {[['products', 'Товары'], ['orders', 'Заказы'], ['dates', 'Даты доставки']].map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={activeTab === tab ? 'btn-primary' : 'btn-outline'}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button className="btn-outline text-xs" onClick={handleDebugView}>🔍 БД: сырые данные</button>
          <button className="btn-outline text-xs text-red-600" onClick={handleDebugReset}>🔄 Сброс БД</button>
          <button className="btn-outline" onClick={logout}>Выйти</button>
        </div>
      </div>

      {/* ── Products tab ── */}
      {activeTab === 'products' && (
        <div className="grid gap-6 lg:grid-cols-[400px,1fr]">
          <section className="card h-fit">
            <h2 className="mb-3 text-xl font-semibold">{editingId ? 'Редактировать' : 'Новый товар'}</h2>
            <form className="grid gap-3" onSubmit={onSave}>
              <div className="grid gap-1">
                <label className="text-xs font-medium text-slate-500">Название товара</label>
                <input className="input" placeholder="Напр.: Газовый гриль премиум" value={form.name}
                  onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} required />
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-medium text-slate-500">Категория</label>
                <select className="input" value={form.category}
                  onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))} required>
                  {categories.map((item) => (
                    <option key={item.slug} value={item.slug}>{item.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-medium text-slate-500">Цена за день (Kč)</label>
                <input className="input" type="number" min="1" step="1" placeholder="Напр.: 550"
                  value={form.price_per_day} onChange={(e) => setForm((s) => ({ ...s, price_per_day: e.target.value }))} required />
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-medium text-slate-500">Количество в наличии (шт.)</label>
                <input className="input" type="number" min="0" step="1" placeholder="Напр.: 1"
                  value={form.stock_quantity} onChange={(e) => setForm((s) => ({ ...s, stock_quantity: e.target.value }))} required />
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-medium text-slate-500">Описание</label>
                <textarea className="input min-h-20" placeholder="Краткое описание товара, особенности, что входит в комплект…" value={form.description}
                  onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} required />
              </div>
              <div className="grid gap-1">
                <label className="text-xs font-medium text-slate-500">Фото товара (JPG, PNG, WebP)</label>
                <input className="input" type="file" accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
              </div>

              {/* Options */}
              <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                <h3 className="font-medium text-sm">Дополнительные опции</h3>
                {form.options.map((opt) => (
                  <div key={opt.id} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
                    <span>{opt.name} — {opt.price} Kč</span>
                    <button type="button" className="text-red-500 hover:text-red-700" onClick={() => removeOption(opt.id)}>✕</button>
                  </div>
                ))}
                <div className="grid grid-cols-[1fr,80px,auto] gap-2 mt-1">
                  <input className="input text-sm" placeholder="Напр.: Биты (набор)" value={newOption.name}
                    onChange={(e) => setNewOption((s) => ({ ...s, name: e.target.value }))} />
                  <input className="input text-sm" type="number" min="0" placeholder="Цена" value={newOption.price}
                    onChange={(e) => setNewOption((s) => ({ ...s, price: e.target.value }))} />
                  <button type="button" className="btn-outline text-sm" onClick={addOption}>+ Добавить</button>
                </div>
              </div>

              <button className="btn-primary" type="submit">{editingId ? 'Обновить товар' : 'Добавить товар'}</button>
              {editingId && (
                <button type="button" className="btn-outline" onClick={() => { setForm(emptyForm); setEditingId('') }}>
                  Отмена редактирования
                </button>
              )}
            </form>
            {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </section>

          <section className="card overflow-hidden">
            <h2 className="mb-4 text-xl font-semibold">Все товары</h2>
            <div className="space-y-3">
              {products.map((item) => (
                <article key={item.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="text-sm text-slate-500">{item.description}</p>
                      <p className="mt-1 text-sm text-brand">{item.price_per_day} Kč/день · {item.stock_quantity ?? 1} шт.</p>
                      {item.options?.length > 0 && (
                        <p className="text-xs text-slate-400">{item.options.map((o) => o.name).join(', ')}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button className="btn-outline" onClick={() => startEdit(item)}>Изменить</button>
                      <button className="btn-outline text-red-600" onClick={() => onDelete(item.id)}>Удалить</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ── Orders tab ── */}
      {activeTab === 'orders' && (
        <section className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Заказы</h2>
            <button className="btn-outline" onClick={refreshOrders}>Обновить</button>
          </div>
          {orders.length === 0 ? (
            <p className="text-slate-500">Заказов пока нет</p>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <article key={order.id} className="rounded-xl border border-slate-200 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{order.name} · {order.phone}</p>
                      <p className="text-sm text-slate-500">{order.email}</p>
                      <p className="text-sm">Даты: {order.dates?.join(', ') || '-'} · {order.delivery_type === 'delivery' ? 'Доставка' : 'Самовывоз'}</p>
                      <ul className="mt-1 text-sm text-slate-700">
                        {order.items?.map((item, i) => (
                          <li key={i}>• {item.product_name}{item.selected_options?.length > 0 ? ' + [' + item.selected_options.map((o) => o.name).join(', ') + ']' : ''}</li>
                        ))}
                      </ul>
                      <p className="font-semibold text-brand mt-1">{order.total_price} Kč</p>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <span className={'rounded-lg px-2 py-1 text-xs font-medium ' + (STATUS_COLORS[order.status] || '')}>
                        {STATUS_LABELS[order.status]}
                      </span>
                      {order.status === 'pending' && (
                        <div className="flex gap-1">
                          <button className="btn text-xs bg-green-100 text-green-800 hover:bg-green-200"
                            onClick={async () => { await updateOrderStatus(order.id, 'confirmed', token); refreshOrders() }}>
                            Подтвердить
                          </button>
                          <button className="btn text-xs bg-red-50 text-red-700 hover:bg-red-100"
                            onClick={async () => { await updateOrderStatus(order.id, 'cancelled', token); refreshOrders() }}>
                            Отменить
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {order.comment && <p className="text-sm text-slate-500">Комментарий: {order.comment}</p>}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Dates tab ── */}
      {activeTab === 'dates' && (
        <section className="card space-y-4">
          <h2 className="text-xl font-semibold">Доступные даты доставки</h2>
          <p className="text-sm text-slate-500">Отметьте даты, когда вы можете осуществить доставку.</p>
          {grouped.map((month) => (
            <div key={month.key}>
              <p className="mb-2 text-sm font-semibold text-slate-500 uppercase tracking-wide">{month.label}</p>
              <div className="flex flex-wrap gap-2">
                {month.days.map((iso) => {
                  const selected = selectedDates.includes(iso)
                  const day = new Date(iso).getDate()
                  return (
                    <button key={iso} onClick={() => toggleDate(iso)}
                      className={'h-9 w-9 rounded-lg text-sm font-medium transition ' + (selected ? 'bg-brand text-white' : 'bg-slate-100 text-slate-700 hover:bg-teal-100')}>
                      {day}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-4">
            <button className="btn-primary" onClick={saveDates}>Сохранить даты</button>
            {datesMessage && <p className="text-sm text-green-700">{datesMessage}</p>}
          </div>
        </section>
      )}

      {/* ── Debug modal ── */}
      {debugRaw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDebugRaw(null)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold">Сырые данные из БД ({debugRaw.length} записей)</h2>
              <button className="btn-outline" onClick={() => setDebugRaw(null)}>✕ Закрыть</button>
            </div>
            <pre className="overflow-auto p-4 text-xs text-slate-700 whitespace-pre-wrap">{JSON.stringify(debugRaw, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
