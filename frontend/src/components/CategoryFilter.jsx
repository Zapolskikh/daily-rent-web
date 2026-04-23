export default function CategoryFilter({ categories, activeCategory, onSelect }) {
  const activeStyle = {
    background: 'linear-gradient(135deg,#0d9488,#0f766e)',
    boxShadow: '0 2px 8px rgba(13,148,136,0.32)',
    color: 'white',
    fontWeight: 600,
  }
  const inactiveStyle = {
    background: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(45,212,191,0.18)',
    color: '#94a3b8',
  }
  return (
    <div className="mb-2 flex flex-wrap gap-2">
      <button
        className="btn border text-sm px-4 py-1.5 transition-all duration-150"
        style={activeCategory ? inactiveStyle : activeStyle}
        onClick={() => onSelect('')}
      >
        Все товары
      </button>
      {categories.map((item) => (
        <button
          key={item.slug}
          className="btn border text-sm px-4 py-1.5 transition-all duration-150"
          style={activeCategory === item.slug ? activeStyle : inactiveStyle}
          onClick={() => onSelect(item.slug)}
        >
          {item.name}
        </button>
      ))}
    </div>
  )
}
