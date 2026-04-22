import { Link, Route, Routes, useNavigate } from 'react-router-dom'
import { CartProvider, useCart } from './context/CartContext'
import HomePage from './pages/HomePage'
import AdminPage from './pages/AdminPage'
import DeliveryTermsPage from './pages/DeliveryTermsPage'
import CartPage from './pages/CartPage'

function CartIcon() {
  const { totalCount } = useCart()
  return (
    <Link to="/cart" className="rounded-xl bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30 transition relative">
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
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 bg-gradient-to-r from-teal-800 to-cyan-700 shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-2xl font-extrabold tracking-tight text-white drop-shadow">Daily Rent Prague</Link>
          <nav className="flex gap-2">
            <Link to="/" className="rounded-xl px-4 py-2 text-sm font-medium text-teal-100 hover:bg-white/15 transition">🛍 Каталог</Link>
            <Link to="/delivery-terms" className="rounded-xl px-4 py-2 text-sm font-medium text-teal-100 hover:bg-white/15 transition">📋 Условия</Link>
            <CartIcon />
            {import.meta.env.DEV && (
              <Link to="/admin" className="rounded-xl bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30 transition">Админ</Link>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/delivery-terms" element={<DeliveryTermsPage />} />
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
