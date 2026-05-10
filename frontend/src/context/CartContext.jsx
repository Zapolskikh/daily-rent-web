import { createContext, useCallback, useContext, useState } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState([]) // [{product, selectedOptions, quantity:1}]

  const addToCart = useCallback((product, selectedOptions = []) => {
    setItems((prev) => {
      const key = product.id + '_' + selectedOptions.map((o) => o.id).sort().join(',')
      const maxQty = product.stock_quantity ?? 1
      const existing = prev.find(
        (item) =>
          item.product.id === product.id &&
          item.selectedOptions.map((o) => o.id).sort().join(',') === selectedOptions.map((o) => o.id).sort().join(','),
      )
      if (existing) {
        if (existing.quantity >= maxQty) return prev // already at stock limit
        return prev.map((item) =>
          item === existing ? { ...item, quantity: item.quantity + 1 } : item,
        )
      }
      if (maxQty <= 0) return prev // out of stock
      return [...prev, { product, selectedOptions, quantity: 1, _key: key }]
    })
  }, [])

  const removeFromCart = useCallback((key) => {
    setItems((prev) => prev.filter((item) => item._key !== key))
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, clearCart, totalCount }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
