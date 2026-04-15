export default function CategoryFilter({ categories, selected, onSelect }) {
  return (
    <div className="flex gap-2 flex-wrap mb-5">
      <button
        onClick={() => onSelect(null)}
        className={`px-4 py-2 rounded-md text-sm font-medium border transition-all ${
          selected === null
            ? 'bg-[#3A9B6F] text-white border-[#3A9B6F]'
            : 'bg-white text-gray-600 border-gray-300 hover:border-[#3A9B6F] hover:text-[#3A9B6F]'
        }`}
      >
        Все
      </button>
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className={`px-4 py-2 rounded-md text-sm font-medium border transition-all ${
            selected === cat
              ? 'bg-[#3A9B6F] text-white border-[#3A9B6F]'
              : 'bg-white text-gray-600 border-gray-300 hover:border-[#3A9B6F] hover:text-[#3A9B6F]'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
