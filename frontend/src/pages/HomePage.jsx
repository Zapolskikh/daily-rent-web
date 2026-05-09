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
  const [slide, setSlide] = useState(0)

  const billboardSlides = [
    {
      icon: '⚡',
      title: 'Срок аренды от 1 дня',
      sub: 'Гибкие тарифы',
      body: 'Берите инструмент на 1 день, выходные или всю неделю. Простой расчёт — без скрытых условий.',
    },
    {
      icon: '🚚',
      title: 'Доставка по Праге',
      sub: 'от 99 Kč',
      body: 'Самовывоз — бесплатно. Стандартная доставка — 149 Kč. Вечерние и сложные адреса — 199 Kč.',
    },
    {
      icon: '🎉',
      title: 'Скидка при длительной аренде',
      sub: 'до −40%',
      body: '2–3 дня −10%, 4–7 дней −20%, 8–14 дней −30%, от 15 дней −40%. Цена рассчитывается автоматически.',
    },
  ]

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % 3), 3500)
    return () => clearInterval(t)
  }, [])

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
          background: 'linear-gradient(135deg, #0a3d1f 0%, #157033 28%, #1a8c3f 60%, #157033 82%, #0a3d1f 100%)',
        }}>
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #78bf2e, transparent 70%)' }} />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #2ab45e, transparent 70%)' }} />

        <div className="relative flex flex-col md:flex-row items-center gap-8">
          {/* Left: text */}
          <div className="flex-1 min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
              🏙️ Прага · Доставка и самовывоз
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">Аренда товаров в Праге</h1>
            <p className="mt-3 max-w-xl text-lg text-green-100">
              Микро-аренда для бытовых задач: от 1 дня, доставка по Праге.
            </p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-green-200">
              <span>✓ Пылесос</span><span>–</span>
              <span>✓ Лазерный уровень</span><span>–</span>
              <span>✓ Детектор проводки</span><span>–</span>
              <span>✓ Барбекю-гриль</span>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="/contact"
                className="btn bg-white text-green-900 font-bold px-6 py-2.5 hover:bg-green-50"
                style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.18)' }}>
                Оставить заявку
              </a>
              <a href="#catalog"
                className="btn border-2 border-white/40 text-white font-semibold px-6 py-2.5 hover:bg-white/10">
                Смотреть каталог ↓
              </a>
            </div>
          </div>

          {/* Right: billboard */}
          <div className="w-full md:w-[420px] lg:w-[480px] shrink-0" style={{
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(120,191,46,0.32)',
            borderRadius: '20px',
            padding: '28px 32px',
            minHeight: '200px',
            boxShadow: '0 0 50px rgba(26,140,63,0.14), 0 8px 32px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.10)',
          }}>
            {/* Progress bars */}
            <div className="flex gap-1.5 mb-6">
              {billboardSlides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  style={{
                    height: '3px',
                    flex: 1,
                    borderRadius: '2px',
                    background: i === slide ? '#78bf2e' : 'rgba(120,191,46,0.25)',
                    transition: 'background 0.3s',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                  aria-label={`Слайд ${i + 1}`}
                />
              ))}
            </div>

            {/* Slide content */}
            <div key={slide} className="billboard-slide">
              <div style={{ fontSize: '3rem', lineHeight: 1, marginBottom: '14px' }}>
                {billboardSlides[slide].icon}
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                {billboardSlides[slide].title}
              </h3>
              <p style={{ fontSize: '0.95rem', color: '#a8e4b4', fontWeight: 600, margin: '5px 0 12px' }}>
                {billboardSlides[slide].sub}
              </p>
              <p style={{ fontSize: '0.9rem', color: 'rgba(220,240,228,0.90)', lineHeight: 1.6, margin: 0 }}>
                {billboardSlides[slide].body}
              </p>
            </div>
          </div>
        </div>
      </section>



      {/* Catalog anchor */}
      <div id="catalog">

      {/* Promo banner */}
      <div className="rounded-2xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between mb-4"
        style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', border: '1px solid rgba(245,158,11,0.35)' }}>
        <div className="flex items-start gap-3">
          <span className="text-2xl mt-0.5">🎉</span>
          <div>
            <p className="font-bold text-amber-900 text-base">
              Промокод <span className="font-mono bg-amber-200 px-1.5 py-0.5 rounded text-sm">summerbundle</span>
            </p>
            <p className="text-sm text-amber-800 mt-0.5">
              Аренда 2 и более позиций — скидка <strong>20%</strong> на всю стоимость аренды.
            </p>
          </div>
        </div>
        <a href="#catalog" className="btn text-sm font-semibold shrink-0"
          style={{ background: '#f59e0b', color: 'white', border: 'none' }}>
          Выбрать товары →
        </a>
      </div>

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
