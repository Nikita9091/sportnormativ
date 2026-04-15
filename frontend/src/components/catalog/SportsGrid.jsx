import SportCard from './SportCard';

function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 text-center animate-pulse">
      <div className="w-10 h-10 bg-gray-200 rounded-full mx-auto mb-3" />
      <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto" />
    </div>
  );
}

export default function SportsGrid({ sports, onSportSelect, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-10">
        {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (sports.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <div className="text-5xl mb-4">🔍</div>
        <p className="text-base font-medium">Нет видов спорта в данной категории</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-10">
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
