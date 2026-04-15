export const RANK_ORDER = ['МСМК', 'МС', 'КМС', 'I', 'II', 'III', 'I юн.', 'II юн.', 'III юн.'];

export function getRankColor(rank) {
  const colors = {
    'МСМК': 'bg-purple-100 text-purple-800 border-purple-200',
    'МС': 'bg-red-100 text-red-800 border-red-200',
    'КМС': 'bg-orange-100 text-orange-800 border-orange-200',
    'I': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'II': 'bg-green-100 text-green-800 border-green-200',
    'III': 'bg-blue-100 text-blue-800 border-blue-200',
    'I юн.': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'II юн.': 'bg-teal-100 text-teal-800 border-teal-200',
    'III юн.': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  };
  return colors[rank] ?? 'bg-gray-100 text-gray-700 border-gray-200';
}
