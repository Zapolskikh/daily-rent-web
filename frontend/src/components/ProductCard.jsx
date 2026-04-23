import { API_BASE_URL } from '../lib/api'

function normalizeImageUrl(imageUrl) {
  if (!imageUrl) return 'https://placehold.co/600x400/ccfbf1/0f766e?text=Rent+Prague'
  if (imageUrl.startsWith('http') || imageUrl.startsWith('data:image/')) return imageUrl
  return `${API_BASE_URL}${imageUrl}`
}

export default function ProductCard({ product, onOpenModal }) {
  return (
    <article className="card-product cursor-pointer group" onClick={() => onOpenModal(product)}>
      {/* Image */}
      <div className="relative overflow-hidden" style={{ aspectRatio: '4/3' }}>
        <img
          src={normalizeImageUrl(product.image_url)}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => { e.currentTarget.src = 'https://placehold.co/600x400/ccfbf1/0f766e?text=Rent+Prague' }}
        />
        {/* Price badge overlay */}
        <div className="absolute bottom-3 left-3">
          <span className="rounded-xl px-2.5 py-1 text-sm font-bold text-amber-800"
            style={{ background: 'rgba(254,243,199,0.92)', backdropFilter: 'blur(4px)', border: '1px solid rgba(245,158,11,0.3)' }}>
            {product.price_per_day} Kč / день
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-base font-700 leading-snug text-slate-900" style={{ fontWeight: 700 }}>{product.name}</h3>
        <p className="text-sm text-slate-500 line-clamp-2 flex-1">{product.description}</p>
        <div className="mt-2">
          <button
            className="btn-primary w-full text-sm py-2"
            onClick={(e) => { e.stopPropagation(); onOpenModal(product) }}
          >
            Подробнее
          </button>
        </div>
      </div>
    </article>
  )
}
