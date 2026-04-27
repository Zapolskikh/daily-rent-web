import { useState, useEffect } from 'react'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('cookie_consent')) {
      setVisible(true)
    }
  }, [])

  function accept() {
    localStorage.setItem('cookie_consent', '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-4 bg-[#0a3d1f] px-6 py-4 text-white shadow-lg sm:flex-row flex-col text-center sm:text-left">
      <p className="text-sm leading-relaxed max-w-2xl">
        Этот сайт использует файлы cookie для обеспечения базовой функциональности (корзина, сессия).
        Мы не собираем персональные данные и не передаём информацию третьим лицам.
      </p>
      <button
        onClick={accept}
        className="shrink-0 rounded-xl bg-amber-400 px-6 py-2.5 text-sm font-semibold text-green-900 hover:bg-amber-300 transition whitespace-nowrap"
      >
        Принять
      </button>
    </div>
  )
}
