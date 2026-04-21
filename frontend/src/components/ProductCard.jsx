import { API_BASE_URL } from '../lib/api'

function normalizeImageUrl(imageUrl) {
  if (imageUrl.startsWith('http') || imageUrl.startsWith('data:image/')) return imageUrl
  return 
}

export default function ProductCard({ product, onOpenModal }) {
  return (
    <article className="card flex h-full flex-col gap-3">
      <img
        src={normalizeImageUrl(product.image_url)}
        alt={product.name}
        className="h-48 w-full rounded-xl object-cover cursor-pointer"
        onClick={() => onOpenModal(product)}
      />
      <h3 className="text-lg font-semibold">{product.name}</h3>
      <p className="text-sm text-slate-600 line-clamp-3">{product.description}</p>
      <div className="mt-auto flex items-center justify-between">
        <strong className="text-brand">{product.price_per_day} Kč / день</strong>
        <button className="btn-primary" onClick={() => onOpenModal(product)}>
          Подробнее
        </button>
      </div>
    </article>
  )
}
