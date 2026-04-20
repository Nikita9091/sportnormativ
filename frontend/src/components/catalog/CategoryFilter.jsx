export default function CategoryFilter({ categories, selected, onSelect }) {
  const btnBase = {
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 20px',
    minWidth: '110px',
    height: '38px',
    border: '1px solid #95463D',
    borderRadius: '15px',
    fontFamily: "'Nunito', sans-serif",
    fontWeight: 400,
    fontSize: '16px',
    lineHeight: '110%',
    color: '#95463D',
    background: '#FFFFFF',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '20px', flexWrap: 'wrap', marginBottom: '32px' }}>
      <button
        onClick={() => onSelect(null)}
        style={{ ...btnBase, background: selected === null ? '#FFD5D0' : '#FFFFFF' }}
        onMouseEnter={e => { if (selected !== null) e.currentTarget.style.background = '#fff5f3'; }}
        onMouseLeave={e => { e.currentTarget.style.background = selected === null ? '#FFD5D0' : '#FFFFFF'; }}
      >
        Все
      </button>
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          style={{ ...btnBase, background: selected === cat ? '#FFD5D0' : '#FFFFFF' }}
          onMouseEnter={e => { if (selected !== cat) e.currentTarget.style.background = '#fff5f3'; }}
          onMouseLeave={e => { e.currentTarget.style.background = selected === cat ? '#FFD5D0' : '#FFFFFF'; }}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
