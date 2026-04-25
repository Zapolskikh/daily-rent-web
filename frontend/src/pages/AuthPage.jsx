import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { userRegister, userLogin } from '../lib/api'
import { useUser } from '../context/UserContext'

export default function AuthPage() {
  const { login } = useUser()
  const navigate = useNavigate()
  const [isRegister, setIsRegister] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = isRegister
        ? await userRegister(form)
        : await userLogin({ email: form.email, password: form.password })
      login(res.access_token, res.user)
      navigate('/profile')
    } catch (err) {
      setError(err.message || 'Ошибка')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-bold">{isRegister ? 'Регистрация' : 'Вход'}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {isRegister && (
          <>
            <input className="w-full rounded-lg border px-4 py-2" placeholder="Имя" value={form.name} onChange={set('name')} required minLength={2} />
            <input className="w-full rounded-lg border px-4 py-2" placeholder="Телефон" value={form.phone} onChange={set('phone')} required minLength={6} />
          </>
        )}
        <input className="w-full rounded-lg border px-4 py-2" type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
        <input className="w-full rounded-lg border px-4 py-2" type="password" placeholder="Пароль" value={form.password} onChange={set('password')} required minLength={6} />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="w-full rounded-lg bg-teal-600 py-2.5 font-semibold text-white hover:bg-teal-700 disabled:opacity-50 transition">
          {loading ? '...' : isRegister ? 'Зарегистрироваться' : 'Войти'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-600">
        {isRegister ? 'Уже есть аккаунт?' : 'Нет аккаунта?'}{' '}
        <button className="text-teal-600 underline" onClick={() => { setIsRegister(!isRegister); setError('') }}>
          {isRegister ? 'Войти' : 'Зарегистрироваться'}
        </button>
      </p>
    </div>
  )
}
