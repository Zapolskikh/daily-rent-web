import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authLogin, authRegister } from '../lib/api'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [form, setForm] = useState({ email: '', password: '', name: '', phone: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = isLogin
        ? await authLogin({ email: form.email, password: form.password })
        : await authRegister(form)
      login(res.access_token, res.user)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Ошибка')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-0 sm:px-0">
      <div className="card">
        <h1 className="mb-5 text-xl sm:text-2xl font-bold text-gray-800">
          {isLogin ? 'Вход' : 'Регистрация'}
        </h1>

        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <input
                type="text" placeholder="Имя" required minLength={2}
                className="input"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                type="tel" placeholder="Телефон" required minLength={6}
                className="input"
                value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </>
          )}
          <input
            type="email" placeholder="Email" required
            className="input"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            type="password" placeholder="Пароль" required minLength={6}
            className="input"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <button
            type="submit" disabled={loading}
            className="btn-primary w-full py-3"
          >
            {loading ? '...' : isLogin ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
          <button
            onClick={() => { setIsLogin(!isLogin); setError('') }}
            className="font-medium text-green-700 hover:underline"
          >
            {isLogin ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </p>
      </div>
    </div>
  )
}
