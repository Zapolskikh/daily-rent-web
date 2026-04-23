import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import CategoryFilter from '../components/CategoryFilter'
import DeliverySection from '../components/DeliverySection'
import ProductCard from '../components/ProductCard'
import ProductModal from '../components/ProductModal'
import { getCategories, getProducts } from '../lib/api'

export default function HomePage() {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [activeCategory, setActiveCategory] = useState('')
  const [modalProduct, setModalProduct] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getCategories()
      .then((payload) => setCategories(payload.categories || []))
      .catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    setError('')
    getProducts(activeCategory)
      .then((payload) => setProducts(payload.products || []))
      .catch((err) => setError(err.message))
  }, [activeCategory])

  function openModal(product) {
    setModalProduct(product)
  }

  function closeModal() {
    setModalProduct(null)
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl px-8 py-12 md:py-16 text-white"
        style={{
          background: 'linear-gradient(135deg, #134e4a 0%, #0f766e 30%, #0891b2 65%, #0e7490 85%, #134e4a 100%)',
        }}>
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #5eead4, transparent 70%)' }} />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #22d3ee, transparent 70%)' }} />
        <div className="relative">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
            🏙️ Прага · Доставка и самовывоз
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">Аренда товаров в Праге</h1>
          <p className="mt-3 max-w-2xl text-lg text-teal-100">
            Микро-аренда для бытовых задач: 1–3 дня, доставка по Праге, понятные наборы.
          </p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-teal-200">
            <span>✓ Пылесос</span><span>–</span>
            <span>✓ Лазерный уровень</span><span>–</span>
            <span>✓ Детектор проводки</span><span>–</span>
            <span>✓ Барбекю-гриль</span>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="/contact"
              className="btn bg-white text-teal-800 font-bold px-6 py-2.5 hover:bg-teal-50"
              style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.18)' }}>
              Оставить заявку
            </a>
            <a href="#catalog"
              className="btn border-2 border-white/40 text-white font-semibold px-6 py-2.5 hover:bg-white/10">
              Смотреть каталог ↓
            </a>
          </div>
        </div>
      </section>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: '📦', value: '30+', label: 'Товаров' },
          { icon: '⚡', value: '1–3 дня', label: 'Срок аренды' },
          { icon: '🚚', value: '99 Kč', label: 'Доставка от' },
          { icon: '✅', value: 'Ежедневно', label: 'С 8:00 до 21:00' },
        ].map((s) => (
          <div key={s.label} className="card flex items-center gap-3 py-4">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p className="text-lg font-extrabold text-slate-900 leading-none">{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Popular sets + rental terms */}
      <section className="grid gap-4 md:grid-cols-2">
        <article className="card">
          <h2 className="text-lg font-bold text-slate-800 mb-3">🔧 Популярные наборы</h2>
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex justify-between"><span>Move-in set: дрель + шуруповерт + детектор</span><strong className="text-amber-600 whitespace-nowrap ml-3">299 Kč</strong></li>
            <li className="flex justify-between"><span>Wall-mount: дрель + лазер + детектор</span><strong className="text-amber-600 whitespace-nowrap ml-3">319 Kč</strong></li>
            <li className="flex justify-between"><span>Cut & clean: лобзик + пылесос</span><strong className="text-amber-600 whitespace-nowrap ml-3">299 Kč</strong></li>
            <li className="flex justify-between"><span>Weekend repair set</span><strong className="text-amber-600 whitespace-nowrap ml-3">399–499 Kč</strong></li>
          </ul>
        </article>
        <article className="card">
          <h2 className="text-lg font-bold text-slate-800 mb-3">📅 Тарифы на срок</h2>
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex justify-between"><span>1 день</span><strong className="text-slate-800">базовая ставка</strong></li>
            <li className="flex justify-between"><span>Weekend (2 дня)</span><strong className="text-slate-800">×1.5</strong></li>
            <li className="flex justify-between"><span>3 дня</span><strong className="text-slate-800">×2.2</strong></li>
            <li className="flex justify-between"><span>7 дней</span><strong className="text-slate-800">×4</strong></li>
          </ul>
          <Link to="/delivery-terms" className="btn-outline mt-4 text-sm">
            Условия и доставка →
          </Link>
        </article>
      </section>

      {/* Catalog anchor */}
      <div id="catalog">
        <CategoryFilter
          categories={categories}
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
        />
      </div>

      {error && <p className="text-red-600">{error}</p>}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} onOpenModal={openModal} />
        ))}
      </section>

      <DeliverySection />

      {modalProduct && (
        <ProductModal product={modalProduct} onClose={closeModal} />
      )}
    </div>
  )
}
