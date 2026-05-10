export default function DeliveryTermsPage() {
  const deliveryRows = [
    ['Самовывоз', '0 Kč', 'Бесплатно, Прага 7'],
    ['Доставка рядом / свой район', '99 Kč', 'В течение часа'],
    ['Стандартная доставка по Праге', '149 Kč', 'Базовый тариф'],
    ['Дальняя Прага / сложный адрес / вечер', '199 Kč', 'Повышенный тариф'],
    ['Забор обратно', '149 Kč', 'Отдельно от доставки'],
    ['Доставка + возврат', '249 Kč', 'Пакет'],
  ]

  const discountRows = [
    ['1 день', '0%', 'Базовая ставка'],
    ['2–3 дня', '−10%', '× 0.90'],
    ['4–7 дней', '−20%', '× 0.80'],
    ['8–14 дней', '−30%', '× 0.70'],
    ['от 15 дней', '−40%', '× 0.60'],
  ]

  return (
    <div className="space-y-6">
      <section className="card" style={{ background: 'linear-gradient(135deg, #0a3d1f 0%, #157033 30%, #1a8c3f 70%, #0a3d1f 100%)' }}>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Доставка и условия аренды</h1>
        <p className="mt-2 text-green-100">
          Прозрачные тарифы по Праге и простые правила аренды.
        </p>
      </section>

      {/* Delivery pricing */}
      <section className="card">
        <h2 className="mb-4 text-xl sm:text-2xl font-semibold">Тарифы доставки</h2>
        <div className="overflow-x-auto -mx-5 px-5">
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
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Точная стоимость доставки уточняется при оформлении заказа. Тариф зависит от адреса и времени.
        </p>
      </section>

      {/* Multi-day discounts */}
      <section className="card">
        <h2 className="mb-2 text-xl sm:text-2xl font-semibold">Скидки за длительную аренду</h2>
        <p className="mb-4 text-slate-600 text-sm">
          Чем дольше аренда — тем выгоднее цена. Скидка применяется автоматически в корзине.
        </p>
        <div className="overflow-x-auto -mx-5 px-5">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2 pr-4">Срок</th>
              <th className="py-2 pr-4">Скидка</th>
              <th className="py-2">Коэффициент</th>
            </tr>
          </thead>
          <tbody>
            {discountRows.map((row) => (
              <tr key={row[0]} className="border-b border-slate-100">
                <td className="py-2 pr-4 font-medium">{row[0]}</td>
                <td className="py-2 pr-4 font-semibold text-green-700">{row[1]}</td>
                <td className="py-2 text-slate-600">{row[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </section>

      {/* Deposit principle */}
      <section className="card">
        <h2 className="mb-3 text-xl sm:text-2xl font-semibold">Залог (депозит)</h2>
        <p className="text-slate-700 mb-3">
          При выдаче инструмента берётся возвратный залог (депозит). Его размер зависит от стоимости позиции
          и указан на странице каждого товара.
        </p>
        <ul className="space-y-2 text-slate-700 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-green-700 font-bold mt-0.5">✓</span>
            <span>Залог оплачивается удобным для вас способом — наличными, переводом или картой.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-700 font-bold mt-0.5">✓</span>
            <span>После возврата и проверки инструмента залог возвращается тем же платёжным способом.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-700 font-bold mt-0.5">✓</span>
            <span>Срок возврата — в день сдачи или в течение 1–2 рабочих дней при безналичной оплате.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-600 font-bold mt-0.5">!</span>
            <span>Залог не возвращается в случае поломки или утери имущества по вине клиента.</span>
          </li>
        </ul>
      </section>

      {/* Rental terms */}
      <section className="card">
        <h2 className="mb-4 text-2xl font-semibold">Условия аренды</h2>
        <ol className="list-decimal space-y-2 pl-5 text-slate-700 text-sm">
          <li>Инструмент передаётся в рабочем состоянии с полной комплектацией.</li>
          <li>Клиент проверяет комплектность при получении — после подтверждения претензии не принимаются.</li>
          <li>Возврат — в том же состоянии, с учётом нормального износа.</li>
          <li>Потеря аксессуаров (зарядка, кабель, биты и др.) оплачивается по стоимости замены.</li>
          <li>Поломка из-за неправильного использования оплачивается клиентом.</li>
          <li>Просрочка до 4 часов — +50% дневной ставки; более суток — дополнительный день аренды.</li>
          <li>Расходные материалы (диски, свёрла и т.п.) в аренду не входят и оплачиваются отдельно.</li>
          <li>Для оформления аренды необходимы контактные данные и оплата залога.</li>
        </ol>
      </section>
    </div>
  )
}
