import { Link } from 'react-router-dom'

export default function DeliverySection() {
  return (
    <section className="card" style={{
      background: 'linear-gradient(135deg, rgba(9,31,28,0.9) 0%, rgba(13,45,55,0.85) 100%)',
      borderColor: 'rgba(45,212,191,0.18)',
    }}>
      <div className="flex items-start gap-4">
        <span className="text-4xl mt-0.5">🚚</span>
        <div className="flex-1">
          <h2 className="text-xl font-bold" style={{ color: '#f0f6ff' }}>Доставка по Праге</h2>
          <p className="mt-1 text-sm" style={{ color: '#94a3b8' }}>
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
