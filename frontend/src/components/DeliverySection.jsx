import { Link } from 'react-router-dom'

export default function DeliverySection() {
  return (
    <section className="card">
      <h2 className="mb-2 text-2xl font-semibold">Доставка по Праге</h2>
      <p className="text-slate-700">
        Самовывоз, стандартная доставка, вечерние/сложные адреса, забор обратно и пакетные тарифы.
      </p>
      <Link to="/delivery-terms" className="btn-outline mt-4">
        Подробные условия аренды
      </Link>
    </section>
  )
}
