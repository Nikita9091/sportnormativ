const TYPE_BADGE = {
  norm: 'bg-green-100 text-green-700 border-green-200',
  comp: 'bg-blue-100 text-blue-700 border-blue-200',
  other: 'bg-gray-100 text-gray-600 border-gray-200',
};

const TYPE_LABEL = {
  norm: 'норм',
  comp: 'соревн',
  other: 'доп',
};

export default function ConditionTree({ conditions, depth = 0 }) {
  if (!conditions || conditions.length === 0) return null;

  return (
    <div className={depth > 0 ? 'ml-3 mt-1 border-l-2 border-gray-100 pl-3' : ''}>
      {conditions.map((cond) => (
        <div key={cond.id} className="mb-1">
          <div className="flex items-start gap-1.5 flex-wrap">
            {cond.type && (
              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border leading-none mt-0.5 ${TYPE_BADGE[cond.type] ?? TYPE_BADGE.other}`}>
                {TYPE_LABEL[cond.type] ?? cond.type}
              </span>
            )}
            <span className="text-xs text-gray-500">{cond.name}:</span>
            <span className="text-xs font-semibold text-gray-900">{cond.value ?? '—'}</span>
          </div>
          {cond.additional && cond.additional.length > 0 && (
            <ConditionTree conditions={cond.additional} depth={depth + 1} />
          )}
        </div>
      ))}
    </div>
  );
}
