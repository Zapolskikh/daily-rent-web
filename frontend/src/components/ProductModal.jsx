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
  const [imgIdx, setImgIdx] = useState(0)

  // Build full image list: extras array first, fallback to image_url
  const allImages = product.images?.length
    ? product.images
    : product.image_url
      ? [product.image_url]
      : []

  // Close on Escape, arrow-navigate gallery
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setImgIdx((i) => (i + 1) % Math.max(allImages.length, 1))
      if (e.key === 'ArrowLeft') setImgIdx((i) => (i - 1 + Math.max(allImages.length, 1)) % Math.max(allImages.length, 1))
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, allImages.length])

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
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <button
          className="absolute right-4 top-4 z-10 text-slate-400 hover:text-slate-700 text-2xl leading-none"
          onClick={onClose}
          aria-label="Закрыть"
        >
          ×
        </button>

        {/* Image gallery */}
        <div className="relative flex h-64 w-full items-center justify-center bg-slate-100 shrink-0">
          <img
            src={normalizeImageUrl(allImages[imgIdx])}
            alt={product.name}
            className="max-h-full max-w-full object-contain"
            onError={(e) => { e.currentTarget.src = 'https://placehold.co/600x400/e2e8f0/334155?text=Rent+Prague' }}
          />
          {allImages.length > 1 && (
            <>
              <button
                onClick={() => setImgIdx((i) => (i - 1 + allImages.length) % allImages.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-2.5 py-1 text-lg shadow hover:bg-white transition"
                aria-label="Предыдущее фото"
              >‹</button>
              <button
                onClick={() => setImgIdx((i) => (i + 1) % allImages.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-2.5 py-1 text-lg shadow hover:bg-white transition"
                aria-label="Следующее фото"
              >›</button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {allImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIdx(i)}
                    className="h-2 w-2 rounded-full transition"
                    style={{ background: i === imgIdx ? '#157033' : 'rgba(0,0,0,0.25)' }}
                    aria-label={`Фото ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="overflow-y-auto p-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold">{product.name}</h2>
            <p className="mt-1 text-slate-600">{product.description}</p>
            {product.deposit && (
              <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-sm">
                <span className="text-amber-700">🔒 Залог (депозит):</span>
                <span className="font-semibold text-amber-800">{product.deposit} Kč</span>
                <span className="text-amber-600 text-xs">· возвращается после проверки</span>
              </div>
            )}
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
                      className="h-4 w-4 rounded-full accent-green-700 shrink-0"
                      checked={selectedOptionIds.has(option.id)}
                      onChange={() => toggleOption(option.id)}
                    />
                    {option.image_url && (
                      <img
                        src={normalizeImageUrl(option.image_url)}
                        alt={option.name}
                        className="h-12 w-12 rounded-lg object-cover shrink-0"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    )}
                    <span className="flex-1 text-sm font-medium text-slate-800">{option.name}</span>
                    <span className="text-sm text-brand font-semibold">+{option.price} Kč/день</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl bg-green-50 px-4 py-3 flex items-baseline justify-between">
            <span className="text-sm text-green-700">Итого в день:</span>
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
