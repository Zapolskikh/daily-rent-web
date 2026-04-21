import { Link, Route, Routes, useNavigate } from 'react-router-dom'
import { CartProvider, useCart } from './context/CartContext'
import HomePage from './pages/HomePage'
import AdminPage from './pages/AdminPage'
import DeliveryTermsPage from './pages/DeliveryTermsPage'
import CartPage from './pages/CartPage'

function CartIcon() {
  const { totalCount } = useCart()
  return (
    <Link to="/cart" className="btn-outline relative">
      Корзина
      {totalCount > 0 && (
        <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand text-xs text-white">
          {totalCount}
        </span>
      )}
    </Link>
  )
}

function Layout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-xl font-bold text-slate-900">Rent Prague</Link>
          <nav className="flex gap-3">
            <Link to="/" className="btn-outline">Каталог</Link>
            <Link to="/delivery-terms" className="btn-outline">Доставка и условия</Link>
            <CartIcon />
            <Link to="/admin" className="btn-primary">Админ</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
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
