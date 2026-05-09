import ContactForm from '../components/ContactForm'

const contacts = [
  {
    icon: '✉️',
    label: 'Email',
    value: 'dailyrentprague@gmail.com',
    href: 'mailto:dailyrentprague@gmail.com',
  },
  {
    icon: '📱',
    label: 'Telegram',
    value: '@dailyrentprague',
    href: 'https://t.me/dailyrentprague',
  },
  {
    icon: '📍',
    label: 'Город',
    value: 'Прага, Чехия',
    href: null,
  },
  {
    icon: '🕐',
    label: 'Часы работы',
    value: 'Ежедневно 8:00 – 21:00',
    href: null,
  },
]

export default function ContactPage() {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl px-8 py-10 text-white"
        style={{ background: 'linear-gradient(135deg, #0a3d1f 0%, #157033 30%, #1a8c3f 70%, #0a3d1f 100%)' }}>
        <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #78bf2e, transparent 70%)' }} />
        <h1 className="text-3xl font-bold">Связаться с нами</h1>
        <p className="mt-2 text-green-200">
          Ответим в течение нескольких часов. Для быстрого ответа — пишите в Telegram.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr,420px]">
        {/* Contact form */}
        <ContactForm />

        {/* Contact info */}
        <aside className="space-y-4">
          <section className="card">
            <h2 className="mb-4 text-xl font-semibold">Контакты</h2>
            <ul className="space-y-3">
              {contacts.map((c) => (
                <li key={c.label} className="flex items-start gap-3">
                  <span className="text-2xl leading-none mt-0.5">{c.icon}</span>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#64748b' }}>{c.label}</p>
                    {c.href ? (
                      <a
                        href={c.href}
                        target={c.href.startsWith('http') ? '_blank' : undefined}
                        rel="noopener noreferrer"
                        className="font-medium hover:underline" style={{ color: '#1a8c3f' }}
                      >
                        {c.value}
                      </a>
                    ) : (
                      <p className="font-medium" style={{ color: '#0a2e14' }}>{c.value}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="card" style={{ borderColor: 'rgba(26,140,63,0.22)', background: 'linear-gradient(135deg, rgba(237,249,242,0.95) 0%, rgba(220,245,230,0.90) 100%)' }}>
            <h3 className="font-semibold mb-3" style={{ color: '#157033' }}>💡 Как мы работаем</h3>
            <ul className="space-y-2 text-sm" style={{ color: '#2e5a3a' }}>
              <li>1. Оставьте заявку или напишите в Telegram</li>
              <li>2. Уточняем детали и подтверждаем наличие</li>
              <li>3. Доставляем в удобное время или готовим к самовывозу</li>
              <li>4. После аренды заберём сами или вы привозите обратно</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}
