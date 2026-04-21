export default function CategoryFilter({ categories, activeCategory, onSelect }) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      <button
        className={activeCategory ? 'btn-outline' : 'btn-primary'}
        onClick={() => onSelect('')}
      >
        Все товары
      </button>
      {categories.map((item) => (
        <button
          key={item.slug}
          className={activeCategory === item.slug ? 'btn-primary' : 'btn-outline'}
          onClick={() => onSelect(item.slug)}
        >
          {item.name}
        </button>
      ))}
    </div>
  )
}
