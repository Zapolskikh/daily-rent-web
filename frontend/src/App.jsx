import { useEffect, useRef } from 'react'
import { Link, Route, Routes, useNavigate } from 'react-router-dom'
import { CartProvider, useCart } from './context/CartContext'
import HomePage from './pages/HomePage'
import AdminPage from './pages/AdminPage'
import DeliveryTermsPage from './pages/DeliveryTermsPage'
import CartPage from './pages/CartPage'
import ContactPage from './pages/ContactPage'

function CartIcon() {
  const { totalCount } = useCart()
  return (
    <Link to="/cart" className="rounded-xl bg-white/20 px-5 py-2.5 text-lg font-semibold text-white hover:bg-white/30 transition relative">
      🛒 Корзина
      {totalCount > 0 && (
        <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-teal-900">
          {totalCount}
        </span>
      )}
    </Link>
  )
}

function Layout() {
  const headerRef = useRef(null)

  useEffect(() => {
    function onScroll() {
      const el = headerRef.current
      if (!el) return
      const pct = Math.min(window.scrollY / 4, 100)
      el.style.backgroundPosition = `${pct}% 50%`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen">
      <header
        ref={headerRef}
        className="sticky top-0 z-40"
        style={{
          background: 'linear-gradient(135deg, #134e4a 0%, #0f766e 20%, #0891b2 45%, #0e7490 65%, #0f766e 80%, #134e4a 100%)',
          backgroundSize: '300% 100%',
          backgroundPosition: '0% 50%',
          boxShadow: '0 4px 20px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.2), inset 0 -2px 0 rgba(255,255,255,0.12), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            style={{ fontFamily: "'Dancing Script', cursive" }}
            className="text-[2rem] leading-tight font-bold text-white drop-shadow-md"
          >
            Daily Rent Prague
          </Link>
          <nav className="flex gap-3">
            <Link to="/" className="rounded-xl px-5 py-2.5 text-lg font-semibold text-white hover:bg-white/20 transition">🏷️ Каталог</Link>
            <Link to="/delivery-terms" className="rounded-xl px-5 py-2.5 text-lg font-semibold text-white hover:bg-white/20 transition">📋 Условия</Link>
            <Link to="/contact" className="rounded-xl px-5 py-2.5 text-lg font-semibold text-white hover:bg-white/20 transition">📩 Связаться</Link>
            <CartIcon />
            {import.meta.env.DEV && (
              <Link to="/admin" className="rounded-xl bg-white/20 px-5 py-2.5 text-base font-semibold text-white hover:bg-white/30 transition">Админ</Link>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/delivery-terms" element={<DeliveryTermsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <CartProvider>
      <Layout />
    </CartProvider>
  )
}
