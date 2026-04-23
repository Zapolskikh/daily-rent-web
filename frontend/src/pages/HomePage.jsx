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
      body: 'Самовывоз — бесплатно. Стандартная доставка — 99 Kč. Вечерние и сложные адреса — 149 Kč.',
    },
    {
      icon: '🔧',
      title: 'Популярные наборы',
      sub: 'Готовые комплекты',
      body: 'Move-in set, Wall-mount set, Cut & clean — готовые наборы для ремонта и переезда от 299 Kč.',
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
          background: 'linear-gradient(135deg, #134e4a 0%, #0f766e 30%, #0891b2 65%, #0e7490 85%, #134e4a 100%)',
        }}>
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #5eead4, transparent 70%)' }} />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #22d3ee, transparent 70%)' }} />

        <div className="relative flex flex-col md:flex-row items-center gap-8">
          {/* Left: text */}
          <div className="flex-1 min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
              🏙️ Прага · Доставка и самовывоз
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">Аренда товаров в Праге</h1>
            <p className="mt-3 max-w-xl text-lg text-teal-100">
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

          {/* Right: billboard */}
          <div className="w-full md:w-80 lg:w-96 shrink-0" style={{
            background: 'rgba(255,255,255,0.13)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.24)',
            borderRadius: '20px',
            padding: '24px',
            minHeight: '200px',
          }}>
            {/* Progress bars */}
            <div className="flex gap-1.5 mb-5">
              {billboardSlides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  style={{
                    height: '3px',
                    flex: 1,
                    borderRadius: '2px',
                    background: i === slide ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.28)',
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
              <div style={{ fontSize: '3rem', lineHeight: 1, marginBottom: '12px' }}>
                {billboardSlides[slide].icon}
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', margin: 0 }}>
                {billboardSlides[slide].title}
              </h3>
              <p style={{ fontSize: '0.95rem', color: 'rgba(165,243,252,1)', fontWeight: 600, margin: '4px 0 10px' }}>
                {billboardSlides[slide].sub}
              </p>
              <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.78)', lineHeight: 1.55, margin: 0 }}>
                {billboardSlides[slide].body}
              </p>
            </div>
          </div>
        </div>
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
