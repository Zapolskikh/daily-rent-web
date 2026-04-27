import { API_BASE_URL } from '../lib/api'

function normalizeImageUrl(imageUrl) {
  if (!imageUrl) return 'https://placehold.co/600x400/d1f5dd/1a8c3f?text=Rent+Prague'
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
          onError={(e) => { e.currentTarget.src = 'https://placehold.co/600x400/d1f5dd/1a8c3f?text=Rent+Prague' }}
        />
        {/* Price badge overlay */}
        <div className="absolute bottom-3 left-3">
          <span className="rounded-xl px-2.5 py-1 text-sm font-bold"
            style={{ background: 'rgba(20,10,0,0.80)', backdropFilter: 'blur(6px)', border: '1px solid rgba(251,191,36,0.32)', color: '#fbbf24' }}>
            {product.price_per_day} Kč / день
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-base leading-snug" style={{ fontWeight: 700, color: '#0d2818' }}>{product.name}</h3>
        <p className="text-sm line-clamp-2 flex-1" style={{ color: '#3d6b52' }}>{product.description}</p>
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
