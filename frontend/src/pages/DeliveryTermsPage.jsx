export default function DeliveryTermsPage() {
  const deliveryRows = [
    ['Самовывоз', '0 Kč', 'Бесплатно'],
    ['Доставка рядом / свой район', '99 Kč', 'Быстрый слот'],
    ['Стандартная доставка по Праге', '149 Kč', 'Базовый тариф'],
    ['Дальняя Прага / сложный адрес / вечер', '199 Kč', 'Повышенный тариф'],
    ['Забор обратно', '149 Kč', 'Отдельно от доставки'],
    ['Доставка + возврат', '249 Kč', 'Пакет'],
    ['Доставка + покупка расходников в 1 магазине', '249 Kč', 'По чеку'],
    ['Доставка + возврат + 1 магазин', '349-399 Kč', 'По чеку'],
    ['Каждый дополнительный магазин', '+100 Kč', 'За точку'],
    ['Длинный список / ожидание / сложный заказ', '+50-100 Kč', 'Надбавка'],
  ]

  const depositRows = [
    ['Низкий риск', '500 Kč', 'Детектор, тепловая пушка'],
    ['Средний риск', '1 000 Kč', 'Шуруповерт, дрель, лобзик, шлифмашина'],
    ['Более дорогие позиции', '1 500 Kč', 'Пылесос, лазерный уровень'],
    ['Комплекты', '1 500-2 000 Kč', 'Bundles'],
  ]

  const terms = [
    'Инструмент передается в рабочем состоянии.',
    'Клиент проверяет комплектность при получении.',
    'Возврат — в том же состоянии, кроме нормального износа.',
    'Потеря аксессуаров / зарядки / кабеля оплачивается отдельно.',
    'Поломка из-за неправильного использования оплачивается клиентом.',
    'Просрочка до 4 часов — +50% дневной ставки; более суток — +1 день аренды.',
    'Расходники оплачиваются отдельно по чеку.',
    'Без документа, контактов и кауце выдача не производится.',
  ]

  return (
    <div className="space-y-6">
      <section className="card bg-gradient-to-r from-slate-900 to-slate-700 text-white">
        <h1 className="text-3xl font-bold">Доставка и условия аренды</h1>
        <p className="mt-2 text-slate-200">
          Прозрачные тарифы по Праге, кауце по уровню риска и простые правила выдачи.
        </p>
      </section>

      <section className="card overflow-x-auto">
        <h2 className="mb-4 text-2xl font-semibold">Тарифы доставки</h2>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2 pr-4">Услуга</th>
              <th className="py-2 pr-4">Цена</th>
              <th className="py-2">Комментарий</th>
            </tr>
          </thead>
          <tbody>
            {deliveryRows.map((row) => (
              <tr key={row[0]} className="border-b border-slate-100">
                <td className="py-2 pr-4 font-medium">{row[0]}</td>
                <td className="py-2 pr-4 text-brand">{row[1]}</td>
                <td className="py-2 text-slate-600">{row[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card overflow-x-auto">
        <h2 className="mb-4 text-2xl font-semibold">Кауце (депозит)</h2>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2 pr-4">Категория</th>
              <th className="py-2 pr-4">Кауце</th>
              <th className="py-2">Позиции</th>
            </tr>
          </thead>
          <tbody>
            {depositRows.map((row) => (
              <tr key={row[0]} className="border-b border-slate-100">
                <td className="py-2 pr-4 font-medium">{row[0]}</td>
                <td className="py-2 pr-4 text-brand">{row[1]}</td>
                <td className="py-2 text-slate-600">{row[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2 className="mb-4 text-2xl font-semibold">Ключевые условия аренды</h2>
        <ol className="list-decimal space-y-2 pl-5 text-slate-700">
          {terms.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>

      <section className="card">
        <h2 className="mb-4 text-2xl font-semibold">Что фиксируем перед выдачей</h2>
        <ul className="list-disc space-y-2 pl-5 text-slate-700">
          <li>Фото инструмента и комплектации</li>
          <li>Фото серийного номера</li>
          <li>Короткое видео, что инструмент работает</li>
          <li>Фото документа клиента</li>
          <li>Телефон, адрес, дата и время выдачи</li>
          <li>Сумма аренды и сумма кауце</li>
        </ul>
      </section>
    </div>
  )
}
