import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { updateUserProfile, getUserOrders } from '../lib/api'

export default function ProfilePage() {
  const { user, token, loading: authLoading, logout } = useUser()
  const navigate = useNavigate()
  const [tab, setTab] = useState('profile')
  const [form, setForm] = useState({ name: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [orders, setOrders] = useState(null)

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth')
  }, [authLoading, user, navigate])

  useEffect(() => {
    if (user) setForm({ name: user.name, phone: user.phone })
  }, [user])

  useEffect(() => {
    if (tab === 'orders' && orders === null && token) {
      getUserOrders(token).then((r) => setOrders(r.orders)).catch(() => setOrders([]))
    }
  }, [tab, orders, token])

  if (authLoading || !user) return null

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true); setMsg('')
    try {
      await updateUserProfile(form, token)
      setMsg('Сохранено!')
    } catch (err) { setMsg(err.message || 'Ошибка') }
    finally { setSaving(false) }
  }

  const STATUS_LABELS = { pending: 'Ожидает', confirmed: 'Подтверждён', cancelled: 'Отменён', returned: 'Возвращён' }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Личный кабинет</h1>
        <button onClick={() => { logout(); navigate('/') }} className="text-sm text-red-600 hover:underline">Выйти</button>
      </div>

      <div className="mb-6 flex gap-2">
        {['profile', 'orders'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${tab === t ? 'bg-teal-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
            {t === 'profile' ? '👤 Профиль' : '📦 Мои заказы'}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input className="w-full rounded-lg border bg-gray-50 px-4 py-2 text-gray-500" value={user.email} disabled />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Имя</label>
            <input className="w-full rounded-lg border px-4 py-2" value={form.name} onChange={set('name')} required minLength={2} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Телефон</label>
            <input className="w-full rounded-lg border px-4 py-2" value={form.phone} onChange={set('phone')} required minLength={6} />
          </div>
          {msg && <p className={`text-sm ${msg === 'Сохранено!' ? 'text-green-600' : 'text-red-600'}`}>{msg}</p>}
          <button type="submit" disabled={saving} className="rounded-lg bg-teal-600 px-6 py-2.5 font-semibold text-white hover:bg-teal-700 disabled:opacity-50 transition">
            {saving ? '...' : 'Сохранить'}
          </button>
        </form>
      )}

      {tab === 'orders' && (
        <div className="space-y-4">
          {orders === null && <p className="text-gray-500">Загрузка…</p>}
          {orders && orders.length === 0 && <p className="text-gray-500">Заказов пока нет.</p>}
          {orders && orders.map((o) => (
            <div key={o.id} className="rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{new Date(o.created_at).toLocaleDateString('ru')}</span>
                <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${o.status === 'confirmed' ? 'bg-green-100 text-green-700' : o.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {STATUS_LABELS[o.status] || o.status}
                </span>
              </div>
              <p className="mt-2 font-medium">{o.items.map((i) => i.product_name).join(', ')}</p>
              <p className="text-sm text-gray-600">{o.total_price} CZK</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
