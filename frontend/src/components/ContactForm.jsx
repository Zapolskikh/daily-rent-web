import { useState } from 'react'
import { sendContact } from '../lib/api'

const initialState = {
  name: '',
  email: '',
  phone: '',
  message: '',
}

export default function ContactForm({ selectedProduct }) {
  const [form, setForm] = useState(initialState)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  async function onSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setResult('')

    try {
      await sendContact({
        ...form,
        product_id: selectedProduct?.id || null,
      })
      setResult('Спасибо! Мы свяжемся с вами в ближайшее время.')
      setForm(initialState)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="card" id="contact">
      <h2 className="mb-1 text-2xl font-semibold" style={{ color: '#f0f6ff' }}>Обратная связь</h2>
      <p className="mb-4 text-sm" style={{ color: '#7a8fa6' }}>Оставьте заявку, и мы ответим на email.</p>

      {selectedProduct && (
        <div className="mb-4 rounded-xl p-3 text-sm" style={{ background: 'rgba(26,140,63,0.09)', color: '#157033', border: '1px solid rgba(26,140,63,0.20)' }}>
          Выбран товар: <strong>{selectedProduct.name}</strong>
        </div>
      )}

      <form className="grid gap-3" onSubmit={onSubmit}>
        <input
          className="input"
          placeholder="Ваше имя"
          value={form.name}
          onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
          required
        />
        <input
          className="input"
          placeholder="Email"
          type="email"
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
          className="input min-h-28"
          placeholder="Что хотите арендовать и на какие даты"
          value={form.message}
          onChange={(e) => setForm((s) => ({ ...s, message: e.target.value }))}
          required
        />
        <button disabled={loading} className="btn-primary" type="submit">
          {loading ? 'Отправка...' : 'Отправить заявку'}
        </button>
      </form>

      {result && <p className="mt-3 text-sm" style={{ color: '#34d399' }}>{result}</p>}
      {error && <p className="mt-3 text-sm" style={{ color: '#f87171' }}>{error}</p>}
    </section>
  )
}
