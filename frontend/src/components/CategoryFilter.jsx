export default function CategoryFilter({ categories, activeCategory, onSelect }) {
  const activeStyle = {
    background: 'linear-gradient(135deg, #1a8c3f 0%, #157033 100%)',
    boxShadow: '0 0 0 1px rgba(26,140,63,0.45), 0 4px 16px rgba(26,140,63,0.28)',
    color: 'white',
    fontWeight: 700,
    borderColor: 'transparent',
  }
  const inactiveStyle = {
    background: 'rgba(255,255,255,0.80)',
    borderColor: 'rgba(26,140,63,0.20)',
    color: '#2e5a3a',
  }
  return (
    <div className="mb-2">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: '#157033' }}>
        Категории
      </p>
      <div className="flex flex-wrap gap-2.5">
        <button
          className="btn border text-sm px-5 py-2 transition-all duration-150 hover:border-green-500/50 hover:text-white"
          style={activeCategory ? inactiveStyle : activeStyle}
          onClick={() => onSelect('')}
        >
          Все товары
        </button>
        {categories.map((item) => (
          <button
            key={item.slug}
            className="btn border text-sm px-5 py-2 transition-all duration-150 hover:border-green-500/50 hover:text-white"
            style={activeCategory === item.slug ? activeStyle : inactiveStyle}
            onClick={() => onSelect(item.slug)}
          >
            {item.name}
          </button>
        ))}
      </div>
    </div>
  )
}
