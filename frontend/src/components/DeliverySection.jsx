import { Link } from 'react-router-dom'

export default function DeliverySection() {
  return (
    <section className="card" style={{
      background: 'linear-gradient(135deg, rgba(237,249,242,0.95) 0%, rgba(220,245,230,0.90) 100%)',
      borderColor: 'rgba(26,140,63,0.18)',
    }}>
      <div className="flex items-start gap-4">
        <span className="text-4xl mt-0.5">🚚</span>
        <div className="flex-1">
          <h2 className="text-xl font-bold" style={{ color: '#0a3d1f' }}>Доставка по Праге</h2>
          <p className="mt-1 text-sm" style={{ color: '#2e5a3a' }}>
            Самовывоз, стандартная доставка, вечерние/сложные адреса, забор обратно и пакетные тарифы.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {['Самовывоз — 0 Kč', 'Ближняя — 99 Kč', 'Прага — 149 Kč', 'Доставка+возврат — 249 Kč'].map(t => (
              <span key={t} className="badge-brand">{t}</span>
            ))}
          </div>
        </div>
        <Link to="/delivery-terms" className="btn-outline text-sm shrink-0 hidden sm:inline-flex">
          Подробнее →
        </Link>
      </div>
      <Link to="/delivery-terms" className="btn-outline text-sm mt-3 sm:hidden">
        Подробные условия →
      </Link>
    </section>
  )
}
