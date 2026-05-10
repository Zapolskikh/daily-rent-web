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
    <div className="space-y-6 sm:space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl px-5 sm:px-8 py-8 sm:py-12 md:py-16 text-white"
        style={{
          background: 'linear-gradient(135deg, #0a3d1f 0%, #157033 28%, #1a8c3f 60%, #157033 82%, #0a3d1f 100%)',
        }}>
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #78bf2e, transparent 70%)' }} />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #2ab45e, transparent 70%)' }} />

        <div className="relative flex flex-col md:flex-row items-center gap-6 md:gap-8">
          {/* Left: text */}
          <div className="flex-1 min-w-0 w-full">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs sm:text-sm font-medium backdrop-blur-sm">
              🏙️ Прага · Доставка и самовывоз
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight md:text-5xl">Аренда товаров в Праге</h1>
            <p className="mt-3 max-w-xl text-base sm:text-lg text-green-100">
              Микро-аренда для бытовых задач: от 1 дня, доставка по Праге.
            </p>
            <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs sm:text-sm text-green-200">
              <span>✓ Пылесос</span><span className="hidden sm:inline">–</span>
              <span>✓ Лазерный уровень</span><span className="hidden sm:inline">–</span>
              <span>✓ Детектор проводки</span><span className="hidden sm:inline">–</span>
              <span>✓ Барбекю-гриль</span>
            </div>
            <div className="mt-5 sm:mt-6 space-y-3">
              <a href="#catalog"
                className="btn bg-white text-green-900 font-bold px-6 py-3 text-sm sm:text-base hover:bg-green-50 inline-block"
                style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.22)' }}>
                Смотреть каталог ↓
              </a>
              <div className="text-xs sm:text-sm text-green-100 space-y-0.5">
                <p className="text-green-200">Не получается оформить или есть вопросы?</p>
                <p>
                  <a href="/contact" className="text-white font-semibold underline underline-offset-2 hover:text-green-200">Оставьте заявку</a>
                  {' '}или напишите в{' '}
                  <a href="https://t.me/dailyrentprague" target="_blank" rel="noopener noreferrer"
                    className="text-white font-semibold underline underline-offset-2 hover:text-green-200">Telegram</a>
                  {' '}— свяжемся!
                </p>
              </div>
            </div>
          </div>

          {/* Right: billboard — hidden on smallest screens, shown from sm */}
          <div className="hidden sm:block w-full md:w-[380px] lg:w-[460px] shrink-0" style={{
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(120,191,46,0.32)',
            borderRadius: '20px',
            padding: '24px 28px',
            minHeight: '220px',
            boxShadow: '0 0 50px rgba(26,140,63,0.14), 0 8px 32px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.10)',
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
              <div style={{ fontSize: '2.5rem', lineHeight: 1, marginBottom: '12px' }}>
                {billboardSlides[slide].icon}
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                {billboardSlides[slide].title}
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#a8e4b4', fontWeight: 600, margin: '5px 0 10px' }}>
                {billboardSlides[slide].sub}
              </p>
              <p style={{ fontSize: '0.875rem', color: 'rgba(220,240,228,0.90)', lineHeight: 1.6, margin: 0 }}>
                {billboardSlides[slide].body}
              </p>
            </div>
          </div>
        </div>
      </section>



      {/* Catalog anchor */}
      <div id="catalog">

      {/* Promo banner */}
      <div className="rounded-2xl px-4 sm:px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between mb-4"
        style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', border: '1px solid rgba(245,158,11,0.35)' }}>
        <div className="flex items-start gap-3">
          <span className="text-2xl mt-0.5 shrink-0">🎉</span>
          <div>
            <p className="font-bold text-amber-900 text-sm sm:text-base">
              Промокод <span className="font-mono bg-amber-200 px-1.5 py-0.5 rounded text-xs sm:text-sm">summerbundle</span>
            </p>
            <p className="text-xs sm:text-sm text-amber-800 mt-0.5">
              Аренда 2 и более позиций — скидка <strong>20%</strong> на всю стоимость аренды.
            </p>
          </div>
        </div>
        <a href="#catalog" className="btn text-sm font-semibold shrink-0 self-end sm:self-center"
          style={{ background: '#f59e0b', color: 'white', border: 'none' }}>
          Выбрать →
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
