import { getSportEmoji } from '../../utils/sportEmojis';

function SkeletonRow() {
  return (
    <div className="animate-pulse flex items-center gap-4 p-4 border border-gray-100 rounded-xl bg-white">
      <div className="w-10 h-10 bg-gray-200 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function DisciplineList({ sport, disciplines, loading, onDisciplineSelect, onBack }) {
  const emoji = getSportEmoji(sport.sport_name, sport.sport_type);

  return (
    <div>
      {/* Breadcrumb + title */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-[#3A9B6F] hover:text-[#2D7F5F] font-medium mb-3 transition-colors"
        >
          ← Назад к видам спорта
        </button>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{emoji}</span>
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">{sport.sport_name}</h2>
            {sport.sport_type && (
              <span className="text-sm text-gray-500">{sport.sport_type}</span>
            )}
          </div>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-700 mb-4">Выберите дисциплину</h3>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : disciplines.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-4">📋</div>
          <p className="font-medium">Нет активных дисциплин для этого вида спорта</p>
        </div>
      ) : (
        <div className="space-y-3">
          {disciplines.map((disc) => {
            const start = formatDate(disc.start_date);
            const end = disc.end_date ? formatDate(disc.end_date) : 'по н.в.';
            return (
              <button
                key={disc.discipline_id}
                onClick={() => onDisciplineSelect(disc)}
                className="w-full text-left flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-[#3A9B6F] hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 bg-[#E8F4EE] rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-[#3A9B6F] transition-colors">
                  <svg className="w-5 h-5 text-[#3A9B6F] group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{disc.discipline_name}</p>
                  {start && (
                    <p className="text-xs text-gray-400 mt-0.5">{start} — {end}</p>
                  )}
                </div>
                <svg className="w-5 h-5 text-gray-300 group-hover:text-[#3A9B6F] flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
