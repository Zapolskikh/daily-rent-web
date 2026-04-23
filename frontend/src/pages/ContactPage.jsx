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
      <section className="card bg-gradient-to-r from-teal-700 to-cyan-700 text-white">
        <h1 className="text-3xl font-bold">Связаться с нами</h1>
        <p className="mt-2 text-teal-100">
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
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{c.label}</p>
                    {c.href ? (
                      <a
                        href={c.href}
                        target={c.href.startsWith('http') ? '_blank' : undefined}
                        rel="noopener noreferrer"
                        className="text-teal-700 font-medium hover:underline"
                      >
                        {c.value}
                      </a>
                    ) : (
                      <p className="font-medium text-slate-800">{c.value}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="card bg-teal-50 border border-teal-200">
            <h3 className="font-semibold text-teal-900 mb-2">💡 Как мы работаем</h3>
            <ul className="space-y-1.5 text-sm text-teal-800">
              <li>1. Оставьте заявку или напишите в Telegram</li>
              <li>2. Уточняем детали и подтверждаем наличие</li>
              <li>3. Доставляем в удобный слот или готовим к самовывозу</li>
              <li>4. После аренды заберём сами или вы привозите обратно</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}
