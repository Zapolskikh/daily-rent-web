import { useEffect, useRef, useState } from 'react'
import { Link, Route, Routes, useNavigate, useLocation } from 'react-router-dom'
import { CartProvider, useCart } from './context/CartContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import HomePage from './pages/HomePage'
import AdminPage from './pages/AdminPage'
import DeliveryTermsPage from './pages/DeliveryTermsPage'
import CartPage from './pages/CartPage'
import ContactPage from './pages/ContactPage'
import AuthPage from './pages/AuthPage'
import ProfilePage from './pages/ProfilePage'
import CookieBanner from './components/CookieBanner'

function CartIcon({ onClick }) {
  const { totalCount } = useCart()
  return (
    <Link to="/cart" onClick={onClick} className="rounded-xl bg-white/20 px-4 py-2 text-base font-semibold text-white hover:bg-white/30 transition relative">
      🛒 Корзина
      {totalCount > 0 && (
        <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-green-900">
          {totalCount}
        </span>
      )}
    </Link>
  )
}

function UserNav({ onClick }) {
  const { user } = useAuth()
  if (user) {
    return (
      <Link to="/profile" onClick={onClick} className="rounded-xl bg-white/20 px-4 py-2 text-base font-semibold text-white hover:bg-white/30 transition">
        👤 {user.name}
      </Link>
    )
  }
  return (
    <Link to="/auth" onClick={onClick} className="rounded-xl px-4 py-2 text-base font-semibold text-white hover:bg-white/20 transition">
      🔑 Войти
    </Link>
  )
}

function Layout() {
  const headerRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

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
          background: 'linear-gradient(135deg, #0a3d1f 0%, #157033 20%, #105528 50%, #157033 80%, #0a3d1f 100%)',
          backgroundSize: '300% 100%',
          backgroundPosition: '0% 50%',
          boxShadow: '0 4px 24px rgba(0,0,0,0.22), 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(120,191,46,0.20)',
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <Link
            to="/"
            style={{ fontFamily: "'Dancing Script', cursive" }}
            className="text-[1.6rem] sm:text-[2rem] leading-tight font-bold text-white drop-shadow-md"
          >
            Daily Rent Prague
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex gap-2 lg:gap-3">
            <Link to="/" className="rounded-xl px-4 py-2 text-base font-semibold text-white hover:bg-white/20 transition">🏷️ Каталог</Link>
            <Link to="/delivery-terms" className="rounded-xl px-4 py-2 text-base font-semibold text-white hover:bg-white/20 transition">📋 Условия</Link>
            <Link to="/contact" className="rounded-xl px-4 py-2 text-base font-semibold text-white hover:bg-white/20 transition">📩 Связаться</Link>
            <CartIcon />
            <UserNav />
            {import.meta.env.DEV && (
              <Link to="/admin" className="rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/30 transition">Админ</Link>
            )}
          </nav>

          {/* Mobile: cart badge + hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <CartIcon />
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-xl bg-white/20 p-2 text-white hover:bg-white/30 transition"
              aria-label="Меню"
            >
              {menuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div
            className="md:hidden border-t border-white/10 px-4 pb-4 pt-3 flex flex-col gap-1"
            style={{ background: 'rgba(10,61,31,0.97)' }}
          >
            <Link to="/" className="rounded-xl px-4 py-3 text-base font-semibold text-white hover:bg-white/10 transition">🏷️ Каталог</Link>
            <Link to="/delivery-terms" className="rounded-xl px-4 py-3 text-base font-semibold text-white hover:bg-white/10 transition">📋 Условия</Link>
            <Link to="/contact" className="rounded-xl px-4 py-3 text-base font-semibold text-white hover:bg-white/10 transition">📩 Связаться</Link>
            <UserNav onClick={() => setMenuOpen(false)} />
            {import.meta.env.DEV && (
              <Link to="/admin" className="rounded-xl px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 transition">⚙️ Админ</Link>
            )}
          </div>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-10">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/delivery-terms" element={<DeliveryTermsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Layout />
        <CookieBanner />
      </CartProvider>
    </AuthProvider>
  )
}
