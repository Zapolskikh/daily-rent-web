import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import CategoryFilter from '../components/CategoryFilter'
import ContactForm from '../components/ContactForm'
import DeliverySection from '../components/DeliverySection'
import ProductCard from '../components/ProductCard'
import ProductModal from '../components/ProductModal'
import { getCategories, getProducts } from '../lib/api'

export default function HomePage() {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [activeCategory, setActiveCategory] = useState('')
  const [modalProduct, setModalProduct] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
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
      <section className="card bg-gradient-to-r from-teal-700 to-cyan-700 text-white">
        <h1 className="text-3xl font-bold">Аренда товаров в Праге</h1>
        <p className="mt-2 max-w-3xl text-teal-50">
          Микро-аренда для бытовых задач: 1-3 дня, доставка по Праге, понятные наборы.
        </p>
        <p className="mt-2 text-teal-100">Лучшие позиции: пылесос, лазерный уровень, детектор проводки.</p>
        <a href="#contact" className="btn mt-4 w-fit bg-white text-teal-800 hover:bg-teal-100">
          Оставить заявку
        </a>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="card">
          <h2 className="text-xl font-semibold">Популярные наборы</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>Move-in set: дрель + шуруповерт + детектор — 299 Kč/день</li>
            <li>Wall-mount set: дрель + лазер + детектор — 319 Kč/день</li>
            <li>Cut & clean set: лобзик + пылесос — 299 Kč/день</li>
            <li>Weekend repair set — 399-499 Kč</li>
          </ul>
        </article>

        <article className="card">
          <h2 className="text-xl font-semibold">Тарифы на срок аренды</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>1 день — базовая ставка</li>
            <li>Weekend — 1.5x</li>
            <li>3 дня — 2.2x</li>
            <li>7 дней — 4x</li>
          </ul>
          <Link to="/delivery-terms" className="btn-outline mt-4">
            Смотреть доставку и условия
          </Link>
        </article>
      </section>

      <CategoryFilter
        categories={categories}
        activeCategory={activeCategory}
        onSelect={setActiveCategory}
      />

      {error && <p className="text-red-600">{error}</p>}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} onOpenModal={openModal} />
        ))}
      </section>

      <DeliverySection />

      <ContactForm selectedProduct={selectedProduct} />

      {modalProduct && (
        <ProductModal product={modalProduct} onClose={closeModal} />
      )}
    </div>
  )
}
