import SportCard from './SportCard';

function SkeletonCard() {
  return (
    <div style={{
      width: '192px',
      height: '210px',
      background: '#F9FFFC',
      borderRadius: '10px',
      boxShadow: '3px 3px 7px 0px #071A14',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '15px 20px',
      boxSizing: 'border-box',
      animation: 'pulse 1.5s ease-in-out infinite',
    }}>
      <div style={{ width: '88px', height: '110px', background: '#e2e8e4', borderRadius: '8px' }} />
      <div style={{ width: '120px', height: '16px', background: '#e2e8e4', borderRadius: '4px' }} />
    </div>
  );
}

export default function SportsGrid({ sports, onSportSelect, loading }) {
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, 192px)',
    gap: '32px',
    justifyContent: 'center',
    marginBottom: '50px',
  };

  if (loading) {
    return (
      <div style={gridStyle}>
        {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (sports.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 0', color: '#666' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
        <p style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: '16px', color: '#071A14' }}>
          Нет видов спорта в данной категории
        </p>
      </div>
    );
  }

  return (
    <div style={gridStyle}>
      {sports.map((sport) => (
        <SportCard
          key={sport.id}
          sport={sport}
          onClick={() => onSportSelect(sport)}
        />
      ))}
    </div>
  );
}
