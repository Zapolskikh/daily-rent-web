import { Link } from 'react-router-dom'

export default function DeliverySection() {
  return (
    <section className="card" style={{
      background: 'linear-gradient(135deg,rgba(240,253,250,1) 0%,rgba(204,251,241,0.6) 100%)',
      borderColor: 'rgba(13,148,136,0.15)',
    }}>
      <div className="flex items-start gap-4">
        <span className="text-4xl mt-0.5">🚚</span>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-900">Доставка по Праге</h2>
          <p className="mt-1 text-slate-600 text-sm">
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
