const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const MOCK_ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123'
const DEFAULT_PRODUCT_IMAGE_URL = import.meta.env.VITE_DEFAULT_PRODUCT_IMAGE_URL || '/uploads/tmp_image.jpg'
const STORAGE_KEY_PRODUCTS = 'rent_prague_products'
const STORAGE_KEY_LEADS = 'rent_prague_leads'
const STORAGE_KEY_PRODUCTS_VERSION = 'rent_prague_products_version'
const PRODUCTS_VERSION = '3'

const DEFAULT_CATEGORIES = [
  { slug: 'party', name: 'Для тусовок (Премиум)' },
  { slug: 'travel', name: 'Для путешествий' },
  { slug: 'repair', name: 'Для ремонта самому' },
]

const DEFAULT_PRODUCTS = [
  { id: 'grill-001', name: 'Газовый гриль премиум', category: 'party', description: 'Идеально для вечеринок и BBQ.', price_per_day: 550, image_url: DEFAULT_PRODUCT_IMAGE_URL, stock_quantity: 1, options: [] },
  { id: 'beer-system-001', name: 'Пивная система', category: 'party', description: 'Компактная система розлива.', price_per_day: 480, image_url: DEFAULT_PRODUCT_IMAGE_URL, stock_quantity: 1, options: [] },
  { id: 'hookah-001', name: 'Кальян премиум', category: 'party', description: 'Полный комплект для вечера.', price_per_day: 350, image_url: DEFAULT_PRODUCT_IMAGE_URL, stock_quantity: 1, options: [] },
  { id: 'roof-box-001', name: 'Бокс на машину', category: 'travel', description: 'Вместительный автобокс.', price_per_day: 420, image_url: DEFAULT_PRODUCT_IMAGE_URL, stock_quantity: 1, options: [] },
  { id: 'child-seat-001', name: 'Автокресло', category: 'travel', description: 'Безопасное кресло для ребенка.', price_per_day: 280, image_url: DEFAULT_PRODUCT_IMAGE_URL, stock_quantity: 1, options: [] },
  { id: 'bike-rack-001', name: 'Крепления для велика', category: 'travel', description: 'Перевозка велосипеда.', price_per_day: 300, image_url: DEFAULT_PRODUCT_IMAGE_URL, stock_quantity: 1, options: [] },
  {
    id: 'screwdriver-001', name: 'Шуруповерт', category: 'repair',
    description: 'Удобный инструмент для ремонта.', price_per_day: 130, image_url: DEFAULT_PRODUCT_IMAGE_URL, stock_quantity: 1,
    options: [
      { id: 's-bits', name: 'Биты (набор)', price: 30 },
      { id: 's-wood', name: 'Сверла по дереву', price: 40 },
      { id: 's-metal', name: 'Сверла по металлу', price: 40 },
    ],
  },
  {
    id: 'drill-001', name: 'Дрель ударная', category: 'repair',
    description: 'Для сверления бетона, дерева и металла.', price_per_day: 160, image_url: DEFAULT_PRODUCT_IMAGE_URL, stock_quantity: 1,
    options: [
      { id: 'd-wood', name: 'Сверла по дереву', price: 40 },
      { id: 'd-metal', name: 'Сверла по металлу', price: 40 },
      { id: 'd-concrete', name: 'Сверла по бетону', price: 50 },
    ],
  },
  { id: 'jigsaw-001', name: 'Лобзик', category: 'repair', description: 'Резка дерева и листовых материалов.', price_per_day: 130, image_url: DEFAULT_PRODUCT_IMAGE_URL, stock_quantity: 1, options: [] },
  { id: 'vacuum-001', name: 'Строительный пылесос', category: 'repair', description: 'Мокро-сухая уборка.', price_per_day: 199, image_url: DEFAULT_PRODUCT_IMAGE_URL, stock_quantity: 1, options: [] },
  { id: 'laser-level-001', name: 'Лазерный уровень', category: 'repair', description: 'Точная разметка стен.', price_per_day: 149, image_url: DEFAULT_PRODUCT_IMAGE_URL, stock_quantity: 1, options: [] },
  { id: 'detector-001', name: 'Детектор проводки', category: 'repair', description: 'Проверка стены перед сверлением.', price_per_day: 79, image_url: DEFAULT_PRODUCT_IMAGE_URL, stock_quantity: 1, options: [] },
  { id: 'sander-001', name: 'Шлифмашина', category: 'repair', description: 'Финишная обработка поверхностей.', price_per_day: 89, image_url: DEFAULT_PRODUCT_IMAGE_URL, stock_quantity: 1, options: [] },
]

function isNetworkError(error) {
  return error instanceof TypeError
}

function loadProductsFromStorage() {
  const currentVersion = localStorage.getItem(STORAGE_KEY_PRODUCTS_VERSION)
  if (currentVersion !== PRODUCTS_VERSION) {
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS))
    localStorage.setItem(STORAGE_KEY_PRODUCTS_VERSION, PRODUCTS_VERSION)
    return [...DEFAULT_PRODUCTS]
  }
  const raw = localStorage.getItem(STORAGE_KEY_PRODUCTS)
  if (!raw) {
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS))
    return [...DEFAULT_PRODUCTS]
  }
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
  } catch { /* ignore */ }
  localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS))
  return [...DEFAULT_PRODUCTS]
}

function saveProductsToStorage(products) {
  localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products))
}

function createId() {
  return typeof crypto?.randomUUID === 'function'
    ? crypto.randomUUID()
    : (Date.now().toString(36) + Math.random().toString(36).slice(2, 10))
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'))
    reader.readAsDataURL(file)
  })
}

async function request(path, options = {}) {
  const { headers: extraHeaders, ...restOptions } = options
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(extraHeaders || {}) },
    ...restOptions,
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    let detail = payload.detail
    if (Array.isArray(detail)) {
      detail = detail.map((e) => {
        const loc = Array.isArray(e.loc) ? e.loc.join('.') : ''
        return `[${loc}] ${e.msg} (input: ${JSON.stringify(e.input)})`
      }).join(' | ')
    } else if (detail && typeof detail === 'object') {
      detail = JSON.stringify(detail)
    }
    throw new Error(detail || `Request failed (${response.status})`)
  }
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) return null
  return response.json()
}

// ── Catalog ────────────────────────────────────────────────────────────────────

export async function getCategories() {
  if (USE_MOCK) return { categories: DEFAULT_CATEGORIES }
  try { return await request('/api/categories') }
  catch (error) { if (isNetworkError(error)) return { categories: DEFAULT_CATEGORIES }; throw error }
}

export async function getProducts(category) {
  if (USE_MOCK) {
    const list = loadProductsFromStorage().map((item) => ({
      ...item,
      image_url: item.image_url || DEFAULT_PRODUCT_IMAGE_URL,
    }))
    return { products: category ? list.filter((item) => item.category === category) : list }
  }
  const query = category ? `?category=${encodeURIComponent(category)}` : ''
  try { return await request(`/api/products${query}`) }
  catch (error) {
    if (isNetworkError(error)) {
      const list = loadProductsFromStorage()
      return { products: category ? list.filter((item) => item.category === category) : list }
    }
    throw error
  }
}

// ── Contact ────────────────────────────────────────────────────────────────────

export async function sendContact(data) {
  if (USE_MOCK) {
    const raw = localStorage.getItem(STORAGE_KEY_LEADS)
    const leads = raw ? JSON.parse(raw) : []
    leads.push({ ...data, id: createId(), created_at: new Date().toISOString() })
    localStorage.setItem(STORAGE_KEY_LEADS, JSON.stringify(leads))
    return { message: 'Заявка отправлена' }
  }
  try { return await request('/api/contact', { method: 'POST', body: JSON.stringify(data) }) }
  catch (error) { if (isNetworkError(error)) return { message: 'Заявка сохранена (offline)' }; throw error }
}

// ── Available dates ────────────────────────────────────────────────────────────

export async function getAvailableDates() {
  if (USE_MOCK) {
    const dates = []
    const today = new Date()
    for (let i = 1; i <= 30; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      dates.push(d.toISOString().slice(0, 10))
    }
    return { dates }
  }
  try { return await request('/api/available-dates') }
  catch (error) { if (isNetworkError(error)) return { dates: [] }; throw error }
}

export async function getBookedSlots() {
  if (USE_MOCK) return { booked_slots: {} }
  try { return await request('/api/booked-slots') }
  catch (error) { if (isNetworkError(error)) return { booked_slots: {} }; throw error }
}

// ── Availability check ─────────────────────────────────────────────────────────

export async function checkAvailability(data) {
  if (USE_MOCK) return { unavailable_product_ids: [] }
  try { return await request('/api/availability', { method: 'POST', body: JSON.stringify(data) }) }
  catch (error) { if (isNetworkError(error)) return { unavailable_product_ids: [] }; throw error }
}

// ── Orders ─────────────────────────────────────────────────────────────────────

export async function createOrder(data) {
  if (USE_MOCK) {
    return { id: createId(), ...data, total_price: 0, status: 'pending', created_at: new Date().toISOString() }
  }
  try { return await request('/api/orders', { method: 'POST', body: JSON.stringify(data) }) }
  catch (error) { if (isNetworkError(error)) throw new Error('Нет связи с сервером'); throw error }
}

export async function notifyAvailability(data) {
  if (USE_MOCK) return { message: 'ok' }
  try { return await request('/api/notify-availability', { method: 'POST', body: JSON.stringify(data) }) }
  catch { return { message: 'ok' } }
}

// ── Admin: session ─────────────────────────────────────────────────────────────

export async function adminLogin(password) {
  if (USE_MOCK) {
    if (password !== MOCK_ADMIN_PASSWORD) throw new Error('Wrong password')
    return { access_token: 'mock-admin-token', token_type: 'bearer' }
  }
  try { return await request('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) }) }
  catch (error) {
    if (isNetworkError(error)) {
      if (password !== MOCK_ADMIN_PASSWORD) throw new Error('Wrong password')
      return { access_token: 'mock-admin-token', token_type: 'bearer' }
    }
    throw error
  }
}

// ── Admin: images ──────────────────────────────────────────────────────────────

export async function uploadImage(file, token) {
  if (USE_MOCK) { return { image_url: await readFileAsDataUrl(file) } }
  const form = new FormData()
  form.append('file', file)
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/upload-image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload.detail || 'Upload failed')
    }
    return response.json()
  } catch (error) {
    if (isNetworkError(error)) return { image_url: await readFileAsDataUrl(file) }
    throw error
  }
}

// ── Admin: products ────────────────────────────────────────────────────────────

export async function createProduct(data, token) {
  if (USE_MOCK) {
    const list = loadProductsFromStorage()
    const created = { ...data, id: createId(), stock_quantity: data.stock_quantity ?? 1, options: data.options ?? [] }
    saveProductsToStorage([created, ...list])
    return created
  }
  try {
    return await request('/api/admin/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    })
  } catch (error) {
    if (isNetworkError(error)) {
      const list = loadProductsFromStorage()
      const created = { ...data, id: createId() }
      saveProductsToStorage([created, ...list])
      return created
    }
    throw error
  }
}

export async function updateProduct(id, data, token) {
  if (USE_MOCK) {
    const list = loadProductsFromStorage()
    const next = list.map((item) => (item.id === id ? { ...item, ...data } : item))
    saveProductsToStorage(next)
    return next.find((item) => item.id === id)
  }
  try {
    return await request(`/api/admin/products/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    })
  } catch (error) {
    if (isNetworkError(error)) {
      const list = loadProductsFromStorage()
      const next = list.map((item) => (item.id === id ? { ...item, ...data } : item))
      saveProductsToStorage(next)
      return next.find((item) => item.id === id)
    }
    throw error
  }
}

export async function deleteProduct(id, token) {
  if (USE_MOCK) {
    saveProductsToStorage(loadProductsFromStorage().filter((item) => item.id !== id))
    return { message: 'Product deleted' }
  }
  try {
    return await request(`/api/admin/products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch (error) {
    if (isNetworkError(error)) {
      saveProductsToStorage(loadProductsFromStorage().filter((item) => item.id !== id))
      return { message: 'Product deleted' }
    }
    throw error
  }
}

// ── Admin: orders ──────────────────────────────────────────────────────────────

export async function getOrders(token) {
  if (USE_MOCK) return { orders: [] }
  return request('/api/orders', { headers: { Authorization: `Bearer ${token}` } })
}

export async function updateOrderStatus(id, status, token) {
  if (USE_MOCK) return { id, status }
  return request(`/api/admin/orders/${id}/status`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status }),
  })
}

// ── Admin: available dates ─────────────────────────────────────────────────────

export async function setAvailableDates(dates, token) {
  if (USE_MOCK) return { message: 'ok' }
  return request('/api/admin/available-dates', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ dates }),
  })
}

// ── Admin: notes ──────────────────────────────────────────────────────────────

export async function getNotes(token) {
  return request('/api/admin/notes', { headers: { Authorization: `Bearer ${token}` } })
}

export async function addNote(text, token) {
  return request('/api/admin/notes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ text }),
  })
}

export async function deleteNote(noteId, token) {
  return request(`/api/admin/notes/${noteId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

// ── Admin: debug ──────────────────────────────────────────────────────────────

export async function debugGetProductsRaw(token) {
  return request('/api/admin/debug/products-raw', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function debugResetProducts(token) {
  return request('/api/admin/debug/reset-products', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function debugRunSql(sql, token) {
  return request('/api/admin/debug/sql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ sql }),
  })
}

export { API_BASE_URL }
