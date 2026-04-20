import { useState } from 'react';
import { getSportEmoji } from '../../utils/sportEmojis';

export default function SportCard({ sport, onClick }) {
  const emoji = getSportEmoji(sport.sport_name, sport.sport_type);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '192px',
        height: '210px',
        background: '#F9FFFC',
        borderRadius: '10px',
        padding: '15px 20px',
        boxShadow: hovered ? '5px 5px 12px 0px #071A14' : '3px 3px 7px 0px #071A14',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        textAlign: 'center',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-5px)' : 'translateY(0)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ width: '88px', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '64px' }}>
        {emoji}
      </div>
      <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: '16px', color: '#1B6C53', lineHeight: '1.2' }}>
        {sport.sport_name}
      </span>
    </div>
  );
}
