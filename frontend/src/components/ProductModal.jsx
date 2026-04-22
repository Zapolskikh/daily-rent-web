import { useEffect, useState } from 'react'
import { API_BASE_URL } from '../lib/api'
import { useCart } from '../context/CartContext'

function normalizeImageUrl(imageUrl) {
  if (!imageUrl) return 'https://placehold.co/600x400/e2e8f0/334155?text=Rent+Prague'
  if (imageUrl.startsWith('http') || imageUrl.startsWith('data:image/')) return imageUrl
  return `${API_BASE_URL}${imageUrl}`
}

export default function ProductModal({ product, onClose }) {
  const { addToCart } = useCart()
  const [selectedOptionIds, setSelectedOptionIds] = useState(new Set())

  // Close on Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!product) return null

  const options = product.options || []

  function toggleOption(id) {
    setSelectedOptionIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedOptions = options.filter((o) => selectedOptionIds.has(o.id))
  const optionsTotal = selectedOptions.reduce((sum, o) => sum + o.price, 0)
  const totalPerDay = product.price_per_day + optionsTotal

  function handleAdd() {
    addToCart(product, selectedOptions)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        <button
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 text-2xl leading-none"
          onClick={onClose}
          aria-label="Закрыть"
        >
          ×
        </button>

        <div className="flex h-64 w-full items-center justify-center bg-slate-100">
          <img
            src={normalizeImageUrl(product.image_url)}
            alt={product.name}
            className="max-h-full max-w-full object-contain"
            onError={(e) => { e.currentTarget.src = 'https://placehold.co/600x400/e2e8f0/334155?text=Rent+Prague' }}
          />
        </div>

        <div className="p-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold">{product.name}</h2>
            <p className="mt-1 text-slate-600">{product.description}</p>
          </div>

          {options.length > 0 && (
            <div>
              <h3 className="mb-2 font-semibold text-slate-800">Дополнительные опции:</h3>
              <div className="space-y-2">
                {options.map((option) => (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50 transition"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded-full accent-teal-600"
                      checked={selectedOptionIds.has(option.id)}
                      onChange={() => toggleOption(option.id)}
                    />
                    <span className="flex-1 text-sm font-medium text-slate-800">{option.name}</span>
                    <span className="text-sm text-brand font-semibold">+{option.price} Kč/день</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl bg-teal-50 px-4 py-3 flex items-baseline justify-between">
            <span className="text-sm text-teal-700">Итого в день:</span>
            <strong className="text-xl text-brand">{totalPerDay} Kč</strong>
          </div>

          <div className="flex gap-3">
            <button className="btn-outline flex-1" onClick={onClose}>
              Отмена
            </button>
            <button className="btn-primary flex-1" onClick={handleAdd}>
              Добавить в корзину
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
