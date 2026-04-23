export default function CategoryFilter({ categories, activeCategory, onSelect }) {
  const activeStyle = {
    background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
    boxShadow: '0 0 0 1px rgba(45,212,191,0.5), 0 4px 16px rgba(20,184,166,0.35)',
    color: 'white',
    fontWeight: 700,
    borderColor: 'transparent',
  }
  const inactiveStyle = {
    background: 'rgba(255,255,255,0.07)',
    borderColor: 'rgba(255,255,255,0.15)',
    color: '#cbd5e1',
  }
  return (
    <div className="mb-2">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: '#5eead4' }}>
        Категории
      </p>
      <div className="flex flex-wrap gap-2.5">
        <button
          className="btn border text-sm px-5 py-2 transition-all duration-150 hover:border-teal-400/50 hover:text-white"
          style={activeCategory ? inactiveStyle : activeStyle}
          onClick={() => onSelect('')}
        >
          Все товары
        </button>
        {categories.map((item) => (
          <button
            key={item.slug}
            className="btn border text-sm px-5 py-2 transition-all duration-150 hover:border-teal-400/50 hover:text-white"
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
