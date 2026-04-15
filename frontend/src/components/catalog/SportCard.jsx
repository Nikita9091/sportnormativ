import { getSportEmoji } from '../../utils/sportEmojis';

export default function SportCard({ sport, onClick }) {
  const emoji = getSportEmoji(sport.sport_name, sport.sport_type);
  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-xl p-5 text-center cursor-pointer transition-all hover:border-[#3A9B6F] hover:shadow-md hover:-translate-y-0.5"
    >
      <div className="text-4xl mb-3">{emoji}</div>
      <p className="text-sm font-medium text-gray-800 leading-tight">{sport.sport_name}</p>
    </div>
  );
}
