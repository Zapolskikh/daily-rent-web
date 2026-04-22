import { useEffect, useRef, useState } from 'react'
import {
  addComment,
  addNote,
  adminLogin,
  createProduct,
  debugGetProductsRaw,
  debugResetProducts,
  deleteComment,
  deleteNote,
  deleteProduct,
  getAvailableDates,
  getCategories,
  getNotes,
  getOrders,
  getProducts,
  setAvailableDates,
  updateOrderStatus,
  updateProduct,
  uploadImage,
} from '../lib/api'
import SqlTerminal from '../components/SqlTerminal'

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
  const [apiLog, setApiLog] = useState(null)

  function logApi(method, path, body, responseFn) {
    const ts = new Date().toLocaleTimeString()
    return responseFn().then((res) => {
      setApiLog({ type: 'api', method, path, body, response: res, ts })
      return res
    }).catch((err) => {
      setApiLog({ type: 'api', method, path, body, error: err.message, ts })
      throw err
    })
  }

  // Orders tab
  const [orders, setOrders] = useState([])

  // Dates tab
  const [calendarDays] = useState(buildCalendarDays)
  const [savedDates, setSavedDates] = useState([])   // what's actually in the DB
  const [selectedDates, setSelectedDates] = useState([])  // local editing state
  const [focusedDate, setFocusedDate] = useState(null)    // date being edited for slots
  const [datesMessage, setDatesMessage] = useState('')
  const [datesSaving, setDatesSaving] = useState(false)

  // Notes tab
  const [notes, setNotes] = useState([])
  const [noteText, setNoteText] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const [commentInputs, setCommentInputs] = useState({}) // { noteId: text }
  const [commentSaving, setCommentSaving] = useState({}) // { noteId: bool }

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

  async function refreshNotes() {
    try {
      const payload = await getNotes(token)
      setNotes(payload.notes || [])
    } catch { }
  }

  async function refreshDates() {
    try {
      const payload = await getAvailableDates()
      const raw = payload.dates || []
      // Drop legacy global slots (old format: 'HH:MM-HH:MM' without date prefix)
      const dates = raw.filter(d => !d.includes(':') || /^\d{4}-\d{2}-\d{2}:/.test(d))
      setSavedDates(dates)
      setSelectedDates(dates)
      setDatesMessage('')
    } catch { }
    // also refresh orders so blue dots are up-to-date
    try {
      const payload = await getOrders(token)
      setOrders(payload.orders || [])
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
      refreshNotes()
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
        await logApi('PUT', `/api/admin/products/${editingId}`, payload, () => updateProduct(editingId, payload, token))
      } else {
        await logApi('POST', '/api/admin/products', payload, () => createProduct(payload, token))
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
      await logApi('DELETE', `/api/admin/products/${id}`, null, () => deleteProduct(id, token))
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
    // iso is either 'YYYY-MM-DD' (date) or 'YYYY-MM-DD:HH:MM-HH:MM' (dated slot)
    setSelectedDates((prev) => prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso])
  }

  function focusDateForSlots(iso) {
    // iso = 'YYYY-MM-DD'
    setFocusedDate(iso)
  }

  function toggleSlot(slotValue) {
    // slotValue = 'HH:MM-HH:MM', focusedDate must be set
    if (!focusedDate) return
    const key = `${focusedDate}:${slotValue}`
    setSelectedDates((prev) => prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key])
  }

  async function saveDates() {
    // Validate: every selected date must have at least one slot
    const selectedDateOnly = selectedDates.filter(d => !d.includes(':'))
    const datesWithoutSlots = selectedDateOnly.filter(d =>
      !selectedDates.some(s => s.startsWith(d + ':'))
    )
    if (datesWithoutSlots.length > 0) {
      const labels = datesWithoutSlots
        .sort()
        .slice(0, 5)
        .map(d => new Date(d + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }))
        .join(', ')
      setDatesMessage(`⚠️ Не заданы временные слоты для: ${labels}${datesWithoutSlots.length > 5 ? ' и ещё ' + (datesWithoutSlots.length - 5) : ''}. Нажмите на дату и выберите хотя бы один слот.`)
      return
    }
    setDatesSaving(true)
    setDatesMessage('')
    try {
      await setAvailableDates(selectedDates, token)
      setSavedDates([...selectedDates])
      setDatesMessage('✅ Сохранено в БД')
    } catch (err) {
      setDatesMessage('Ошибка: ' + err.message)
    } finally {
      setDatesSaving(false)
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
          {[['products', 'Товары'], ['orders', 'Заказы'], ['dates', 'Даты доставки'], ['notes', '📝 Заметки']].map(([tab, label]) => (
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
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="text-sm text-slate-500 break-words">{item.description}</p>
                      <p className="mt-1 text-sm text-brand">{item.price_per_day} Kč/день · {item.stock_quantity ?? 1} шт.</p>
                      {item.options?.length > 0 && (
                        <p className="text-xs text-slate-400">{item.options.map((o) => o.name).join(', ')}</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
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
      {activeTab === 'dates' && (() => {
        const hasChanges = JSON.stringify([...selectedDates].sort()) !== JSON.stringify([...savedDates].sort())
        const savedDateSet = new Set(savedDates)
        const selectedDateSet = new Set(selectedDates)

        // Build occupied info from pending/confirmed orders
        const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'confirmed')
        const occupiedDates = new Set()
        // occupiedSlotsByDate: { 'YYYY-MM-DD': Set<'HH:MM-HH:MM'> }
        const occupiedSlotsByDate = {}
        activeOrders.forEach(order => {
          ;(order.dates || []).forEach(date => {
            occupiedDates.add(date)
            if (order.delivery_slot) {
              if (!occupiedSlotsByDate[date]) occupiedSlotsByDate[date] = new Set()
              occupiedSlotsByDate[date].add(order.delivery_slot)
            }
          })
        })
        return (
          <section className="card space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Доступные даты доставки</h2>
                <p className="text-sm text-slate-500 mt-0.5">Нажмите на дату — добавить/убрать. Изменения вступят в силу после нажатия «Сохранить».</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {hasChanges && (
                  <span className="rounded-lg bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-1">
                    ● Есть несохранённые изменения
                  </span>
                )}
                <button className="btn-outline text-sm" onClick={() => { setSelectedDates([...savedDates]); setDatesMessage('') }}>
                  Сбросить изменения
                </button>
                <button className="btn-outline text-sm" onClick={refreshDates}>
                  ↻ Обновить из БД
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs text-slate-600">
              <span className="flex items-center gap-1.5"><span className="h-4 w-4 rounded bg-teal-600 inline-block"/><b>Сохранено в БД</b></span>
              <span className="flex items-center gap-1.5"><span className="h-4 w-4 rounded bg-green-200 border border-green-500 inline-block"/>Будет добавлено</span>
              <span className="flex items-center gap-1.5"><span className="h-4 w-4 rounded bg-red-100 border border-red-400 inline-block"/>Будет удалено</span>
              <span className="flex items-center gap-1.5"><span className="h-4 w-4 rounded bg-slate-100 inline-block"/>Не выбрано</span>
              <span className="flex items-center gap-1.5">
                <span className="relative inline-block h-4 w-4">
                  <span className="h-4 w-4 rounded bg-teal-600 inline-block"/>
                  <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-blue-500 border border-white"/>
                </span>
                <b>Есть активный заказ (ожидает/подтверждён)</b>
              </span>
            </div>

            {/* Date grid */}
            <p className="text-xs text-slate-500">
              💡 <strong>Левый клик</strong> — включить/выключить дату. <strong>Клик по уже включённой дате</strong> — выбрать её для редактирования слотов (подсветится рамкой).
            </p>
            {grouped.map((month) => (
              <div key={month.key}>
                <p className="mb-2 text-sm font-semibold text-slate-500 uppercase tracking-wide">{month.label}</p>
                <div className="flex flex-wrap gap-2">
                  {month.days.map((iso) => {
                    const inDb = savedDateSet.has(iso)
                    const selected = selectedDateSet.has(iso)
                    const isFocused = focusedDate === iso
                    const slotCount = selectedDates.filter(d => d.startsWith(iso + ':')).length
                    const day = new Date(iso).getDate()
                    let cls = 'bg-slate-100 text-slate-600 hover:bg-teal-50'
                    if (inDb && selected) cls = 'bg-teal-600 text-white hover:bg-teal-500'
                    else if (inDb && !selected) cls = 'bg-red-100 text-red-700 border border-red-400 hover:bg-red-200'
                    else if (!inDb && selected) cls = 'bg-green-200 text-green-800 border border-green-500 hover:bg-green-300'
                    if (isFocused) cls += ' ring-2 ring-offset-1 ring-amber-400'
                    const isOccupied = occupiedDates.has(iso)
                    return (
                      <div key={iso} className="relative">
                        <button
                          onClick={() => {
                            if (selected) {
                              focusDateForSlots(iso)
                            } else {
                              toggleDate(iso)
                              focusDateForSlots(iso)
                            }
                          }}
                          onContextMenu={(e) => { e.preventDefault(); toggleDate(iso) }}
                          title={(selected ? 'Нажмите — редактировать слоты | ПКМ — убрать дату' : 'Нажмите, чтобы добавить') + (isOccupied ? ' | 🔵 Есть активный заказ' : '')}
                          className={`h-9 w-9 rounded-lg text-sm font-medium transition ${cls}`}>
                          {day}
                        </button>
                        {slotCount > 0 && (
                          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-400 text-white text-[9px] font-bold flex items-center justify-center pointer-events-none">
                            {slotCount}
                          </span>
                        )}
                        {isOccupied && (
                          <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-blue-500 border-2 border-white pointer-events-none" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Stats */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm grid gap-1">
              <p><span className="font-medium">В БД сейчас:</span> {savedDates.filter(d => !d.includes(':')).length} дат доставки</p>
              {hasChanges && (
                <>
                  <p className="text-green-700">+ Будет добавлено: {selectedDates.filter(d => !d.includes(':') && !savedDateSet.has(d)).length} дат</p>
                  <p className="text-red-700">− Будет удалено: {savedDates.filter(d => !d.includes(':') && !selectedDateSet.has(d)).length} дат</p>
                </>
              )}
            </div>

            {/* Per-date time slots */}
            <div className="border-t pt-5 space-y-4">
              <div>
                <h3 className="font-semibold">Временные слоты доставки</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Выберите дату в календаре выше (нажмите на включённую) — и задайте для неё слоты.
                </p>
              </div>

              {focusedDate ? (() => {
                const isoLabel = new Date(focusedDate + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
                const isDateSelected = selectedDateSet.has(focusedDate)
                return (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-semibold text-amber-900">📅 Слоты для {isoLabel}</p>
                      {!isDateSelected && (
                        <span className="text-xs text-red-600 font-medium">⚠ Эта дата не включена — сначала добавьте её в календаре</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: 14 }, (_, i) => {
                        const h = i + 8
                        const slot = `${String(h).padStart(2, '0')}:00-${String(h + 1).padStart(2, '0')}:00`
                        const key = `${focusedDate}:${slot}`
                        const inDb = savedDateSet.has(key)
                        const selected = selectedDateSet.has(key)
                        const isOccupied = occupiedSlotsByDate[focusedDate]?.has(slot)
                        let cls = 'border-slate-200 text-slate-500 hover:border-teal-400 hover:text-teal-700'
                        if (isOccupied) cls = 'bg-blue-500 text-white border-blue-500 cursor-default'
                        else if (inDb && selected) cls = 'bg-teal-600 text-white border-teal-600'
                        else if (inDb && !selected) cls = 'bg-red-50 text-red-700 border-red-400'
                        else if (!inDb && selected) cls = 'bg-green-100 text-green-800 border-green-500'
                        const occupiedTitle = isOccupied ? ' · 🔵 Занято активным заказом' : ''
                        return (
                          <button key={slot} onClick={() => !isOccupied && toggleSlot(slot)} disabled={!isDateSelected}
                            title={(inDb && selected ? 'В БД · нажмите, чтобы убрать' : inDb ? 'Будет удалено' : selected ? 'Будет добавлено' : 'Нажмите, чтобы добавить') + occupiedTitle}
                            className={`px-3 py-2 rounded-xl border text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${cls}`}>
                            {h}:00 – {h + 1}:00
                            {isOccupied && <span className="ml-1 text-xs opacity-80">●</span>}
                          </button>
                        )
                      })}
                    </div>
                    <p className="text-xs text-slate-500">
                      Выбрано: {selectedDates.filter(d => d.startsWith(focusedDate + ':')).map(d => d.split(':')[1]).join(', ') || 'нет слотов'}
                    </p>
                  </div>
                )
              })() : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 text-center">
                  Нажмите на дату в календаре, чтобы задать для неё временные слоты
                </div>
              )}

              {/* Summary of all dates with slots */}
              {selectedDates.some(d => /^\d{4}-\d{2}-\d{2}:/.test(d)) && (
                <div className="text-xs space-y-1">
                  <p className="font-medium text-slate-600">Все настроенные слоты:</p>
                  {(() => {
                    const byDate = {}
                    selectedDates
                      .filter(d => /^\d{4}-\d{2}-\d{2}:/.test(d))
                      .forEach(entry => {
                        const dateKey = entry.slice(0, 10)       // 'YYYY-MM-DD'
                        const slotVal = entry.slice(11)          // 'HH:MM-HH:MM'
                        if (!byDate[dateKey]) byDate[dateKey] = []
                        byDate[dateKey].push(slotVal)
                      })
                    return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, slots]) => (
                      <p key={date} className="text-slate-600">
                        <span className="font-medium">
                          {new Date(date + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}:
                        </span>{' '}
                        {slots.map(s => {
                          const [hh] = s.split(':')
                          const h = parseInt(hh, 10)
                          return `${h}:00–${h + 1}:00`
                        }).join(', ')}
                      </p>
                    ))
                  })()}
                </div>
              )}

              {/* Warning: dates without slots */}
              {(() => {
                const noSlot = selectedDates
                  .filter(d => !d.includes(':'))
                  .filter(d => !selectedDates.some(s => s.startsWith(d + ':')))
                if (!noSlot.length) return null
                return (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm space-y-1">
                    <p className="font-semibold text-amber-800">⚠️ Даты без временных слотов:</p>
                    <div className="flex flex-wrap gap-1">
                      {noSlot.sort().map(d => (
                        <button key={d}
                          onClick={() => focusDateForSlots(d)}
                          className="rounded-lg bg-amber-100 hover:bg-amber-200 border border-amber-400 text-amber-900 px-2 py-0.5 font-medium">
                          {new Date(d + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                        </button>
                      ))}
                    </div>
                    <p className="text-amber-700 text-xs">Нажмите на дату, чтобы перейти к редактированию её слотов. Сохранение заблокировано.</p>
                  </div>
                )
              })()}
            </div>

            {/* Save */}
            <div className="flex items-center gap-4 pt-2 border-t">
              <button
                className={`btn-primary ${!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={saveDates}
                disabled={!hasChanges || datesSaving}>
                {datesSaving ? 'Сохранение...' : '💾 Сохранить в БД'}
              </button>
              {datesMessage && (
                <p className={`text-sm font-medium ${datesMessage.startsWith('✅') ? 'text-green-700' : 'text-red-600'}`}>
                  {datesMessage}
                </p>
              )}
            </div>

            {/* Hint about persistence */}
            <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
              💡 Данные хранятся в PostgreSQL (Neon) — они <strong>не потеряются</strong> при редеплое или перезапуске сервера.
              Для проверки в SQL терминале выполните: <code className="bg-slate-200 px-1 rounded">SELECT * FROM meta WHERE key = 'available_dates';</code>
            </p>
          </section>
        )
      })()}

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

      {/* ── Notes tab ── */}
      {activeTab === 'notes' && (
        <section className="card space-y-5">
          <div>
            <h2 className="text-xl font-semibold">Заметки</h2>
            <p className="text-sm text-slate-500 mt-0.5">Сохраняются в базе данных. Видны всем администраторам.</p>
          </div>

          {/* Input */}
          <div className="space-y-2">
            <textarea
              className="input min-h-28 resize-y"
              placeholder="Введите заметку... (Ctrl+Enter для сохранения)"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault()
                  if (!noteText.trim() || noteSaving) return
                  setNoteSaving(true)
                  try {
                    const note = await addNote(noteText.trim(), token)
                    setNotes((prev) => [note, ...prev])
                    setNoteText('')
                  } catch { }
                  finally { setNoteSaving(false) }
                }
              }}
            />
            <div className="flex items-center gap-3">
              <button
                className="btn-primary"
                disabled={!noteText.trim() || noteSaving}
                onClick={async () => {
                  if (!noteText.trim() || noteSaving) return
                  setNoteSaving(true)
                  try {
                    const note = await addNote(noteText.trim(), token)
                    setNotes((prev) => [note, ...prev])
                    setNoteText('')
                  } catch { }
                  finally { setNoteSaving(false) }
                }}>
                {noteSaving ? 'Сохранение...' : '+ Добавить заметку'}
              </button>
              <span className="text-xs text-slate-400">или Ctrl+Enter</span>
            </div>
          </div>

          {/* Notes list */}
          {notes.length === 0 ? (
            <p className="text-slate-400 text-sm">Заметок пока нет</p>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <article key={note.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  {/* Note header */}
                  <div className="flex gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 whitespace-pre-wrap break-words">{note.text}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(note.created_at).toLocaleString('ru-RU', {
                          day: 'numeric', month: 'long', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <button
                      className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-100 hover:text-red-600 transition"
                      title="Удалить заметку"
                      onClick={async () => {
                        try {
                          await deleteNote(note.id, token)
                          setNotes((prev) => prev.filter((n) => n.id !== note.id))
                        } catch { }
                      }}>
                      ✕
                    </button>
                  </div>

                  {/* Comments */}
                  {(note.comments || []).length > 0 && (
                    <ul className="space-y-1.5 pl-3 border-l-2 border-slate-200">
                      {(note.comments || []).map((c) => (
                        <li key={c.id} className="flex gap-2 items-start">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-700 whitespace-pre-wrap break-words">{c.text}</p>
                            <p className="text-[10px] text-slate-400">
                              {new Date(c.created_at).toLocaleString('ru-RU', {
                                day: 'numeric', month: 'long',
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <button
                            className="shrink-0 h-5 w-5 rounded flex items-center justify-center text-slate-300 hover:bg-red-100 hover:text-red-500 transition text-xs"
                            title="Удалить комментарий"
                            onClick={async () => {
                              try {
                                await deleteComment(note.id, c.id, token)
                                setNotes((prev) => prev.map((n) =>
                                  n.id === note.id
                                    ? { ...n, comments: (n.comments || []).filter((x) => x.id !== c.id) }
                                    : n
                                ))
                              } catch { }
                            }}>
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Add comment input */}
                  <div className="flex gap-2">
                    <input
                      className="input flex-1 text-sm py-1"
                      placeholder="Добавить комментарий..."
                      value={commentInputs[note.id] || ''}
                      onChange={(e) => setCommentInputs((prev) => ({ ...prev, [note.id]: e.target.value }))}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          const text = (commentInputs[note.id] || '').trim()
                          if (!text || commentSaving[note.id]) return
                          setCommentSaving((prev) => ({ ...prev, [note.id]: true }))
                          try {
                            const comment = await addComment(note.id, text, token)
                            setNotes((prev) => prev.map((n) =>
                              n.id === note.id
                                ? { ...n, comments: [...(n.comments || []), comment] }
                                : n
                            ))
                            setCommentInputs((prev) => ({ ...prev, [note.id]: '' }))
                          } catch { }
                          finally { setCommentSaving((prev) => ({ ...prev, [note.id]: false })) }
                        }
                      }}
                    />
                    <button
                      className="btn-secondary text-xs px-3 py-1"
                      disabled={!(commentInputs[note.id] || '').trim() || commentSaving[note.id]}
                      onClick={async () => {
                        const text = (commentInputs[note.id] || '').trim()
                        if (!text || commentSaving[note.id]) return
                        setCommentSaving((prev) => ({ ...prev, [note.id]: true }))
                        try {
                          const comment = await addComment(note.id, text, token)
                          setNotes((prev) => prev.map((n) =>
                            n.id === note.id
                              ? { ...n, comments: [...(n.comments || []), comment] }
                              : n
                          ))
                          setCommentInputs((prev) => ({ ...prev, [note.id]: '' }))
                        } catch { }
                        finally { setCommentSaving((prev) => ({ ...prev, [note.id]: false })) }
                      }}>
                      {commentSaving[note.id] ? '...' : '↵'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── SQL Terminal ── */}
      <SqlTerminal token={token} externalLog={apiLog} />
    </div>
  )
}
