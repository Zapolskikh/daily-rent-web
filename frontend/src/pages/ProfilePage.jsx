import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authGetOrders, authUpdateProfile, authCancelOrder } from '../lib/api'

const STATUS_LABELS = {
  pending: '⏳ Ожидает',
  confirmed: '✅ Подтверждён',
  cancelled: '❌ Отменён',
  returned: '🔄 Возвращён',
}

export default function ProfilePage() {
  const { user, token, logout, updateUser } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '' })
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    if (!token) { navigate('/auth'); return }
    authGetOrders(token)
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [token, navigate])

  useEffect(() => {
    if (user) setForm({ name: user.name, phone: user.phone })
  }, [user])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaveMsg('')
    try {
      const updated = await authUpdateProfile(form, token)
      updateUser(updated)
      setEditing(false)
      setSaveMsg('Сохранено')
      setTimeout(() => setSaveMsg(''), 2000)
    } catch (err) {
      setSaveMsg(err.message || 'Ошибка')
    }
  }

  const handleCancel = async (orderId) => {
    if (!confirm('Отменить заказ?')) return
    try {
      const updated = await authCancelOrder(orderId, token)
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)))
    } catch (err) {
      alert(err.message || 'Ошибка отмены')
    }
  }

  if (!user) return null

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 sm:mb-8 flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Мой профиль</h1>
        <button onClick={() => { logout(); navigate('/') }} className="text-sm text-red-600 hover:underline shrink-0">
          Выйти
        </button>
      </div>

      {/* Profile info */}
      <div className="mb-8 rounded-xl border bg-white p-6 shadow-sm">
        {!editing ? (
          <div className="space-y-2">
            <p><span className="font-medium text-gray-500">Имя:</span> {user.name}</p>
            <p><span className="font-medium text-gray-500">Email:</span> {user.email}</p>
            <p><span className="font-medium text-gray-500">Телефон:</span> {user.phone}</p>
            <button onClick={() => setEditing(true)} className="mt-3 text-sm font-medium text-green-700 hover:underline">
              Редактировать
            </button>
            {saveMsg && <span className="ml-3 text-sm text-green-600">{saveMsg}</span>}
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-3">
            <input
              type="text" required minLength={2} placeholder="Имя"
              className="w-full rounded-lg border px-4 py-2 focus:border-green-500 focus:outline-none"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              type="tel" required minLength={6} placeholder="Телефон"
              className="w-full rounded-lg border px-4 py-2 focus:border-green-500 focus:outline-none"
              value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <div className="flex gap-3">
              <button type="submit" className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800">
                Сохранить
              </button>
              <button type="button" onClick={() => setEditing(false)} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">
                Отмена
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Order history */}
      <h2 className="mb-4 text-xl font-bold text-gray-800">Мои заказы</h2>
      {loading ? (
        <p className="text-gray-500">Загрузка...</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-500">У вас пока нет заказов.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
                <span className="text-sm text-gray-500">
                  {new Date(order.created_at).toLocaleDateString('ru-RU')}
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs sm:text-sm font-medium">
                  {STATUS_LABELS[order.status] || order.status}
                </span>
              </div>
              <div className="mb-2 space-y-1">
                {order.items.map((item, i) => (
                  <p key={i} className="text-sm text-gray-700">
                    {item.product_name} — {item.price_per_day} Kč/день
                    {item.selected_options?.length > 0 && (
                      <span className="text-gray-400"> + {item.selected_options.map(o => o.name).join(', ')}</span>
                    )}
                  </p>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2 text-sm flex-wrap">
                <span className="text-gray-500 text-xs sm:text-sm">
                  Даты: {order.dates?.slice(0, 3).join(', ')}{order.dates?.length > 3 ? '...' : ''}
                </span>
                <span className="font-semibold text-green-800 shrink-0">{order.total_price} Kč</span>
              </div>
              {order.status === 'cancelled' && order.cancellation_reason && (
                <p className="mt-2 text-xs text-red-600">Причина: {order.cancellation_reason}</p>
              )}
              {(order.status === 'pending' || order.status === 'confirmed') && (
                <button
                  onClick={() => handleCancel(order.id)}
                  className="mt-3 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition"
                >
                  Отменить заказ
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
