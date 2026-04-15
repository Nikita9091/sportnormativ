import { useMemo } from 'react';
import { getRankColor, RANK_ORDER } from '../../utils/rankColors';
import ConditionTree from './ConditionTree';

function SkeletonTable() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-8 bg-gray-200 rounded w-full" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 bg-gray-100 rounded w-full" />
      ))}
    </div>
  );
}

// Groups normatives by discipline_parameters signature
function groupByParams(normatives) {
  const groups = new Map();
  for (const norm of normatives) {
    const key = JSON.stringify(norm.discipline_parameters ?? []);
    if (!groups.has(key)) groups.set(key, { params: norm.discipline_parameters ?? [], normatives: [] });
    groups.get(key).normatives.push(norm);
  }
  return [...groups.values()];
}

function ParamGroup({ params, normatives }) {
  // Sort ranks by RANK_ORDER (unknown ranks go to end)
  const sortedNorms = useMemo(() => {
    return [...normatives].sort((a, b) => {
      const ai = RANK_ORDER.indexOf(a.rank?.short);
      const bi = RANK_ORDER.indexOf(b.rank?.short);
      const av = ai === -1 ? 999 : ai;
      const bv = bi === -1 ? 999 : bi;
      if (av !== bv) return av - bv;
      return (a.rank?.prestige ?? 0) - (b.rank?.prestige ?? 0);
    });
  }, [normatives]);

  // Collect all root-level condition names across all normatives for this group
  const conditionNames = useMemo(() => {
    const names = [];
    const seen = new Set();
    for (const norm of sortedNorms) {
      for (const cond of (norm.conditions ?? [])) {
        if (!seen.has(cond.name)) {
          seen.add(cond.name);
          names.push(cond.name);
        }
      }
    }
    return names;
  }, [sortedNorms]);

  // Build a lookup: normativeId → { conditionName → condition }
  const condByNorm = useMemo(() => {
    const map = new Map();
    for (const norm of sortedNorms) {
      const byName = new Map();
      for (const cond of (norm.conditions ?? [])) {
        byName.set(cond.name, cond);
      }
      map.set(norm.id, byName);
    }
    return map;
  }, [sortedNorms]);

  const hasConditions = conditionNames.length > 0;

  return (
    <div className="mb-8">
      {/* Parameters header */}
      {params.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {params.map((p) => (
            <span key={p.type + p.value} className="inline-flex items-center gap-1 bg-[#E8F4EE] text-[#2D7F5F] px-2.5 py-1 rounded-full text-xs font-medium">
              <span className="opacity-70">{p.type}:</span> {p.value}
            </span>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              {hasConditions && (
                <th className="text-left px-4 py-3 font-semibold text-gray-600 border-b border-gray-200 min-w-[140px]">
                  Условие
                </th>
              )}
              {sortedNorms.map((norm) => (
                <th key={norm.id} className="px-3 py-3 font-semibold border-b border-gray-200 text-center min-w-[90px]">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRankColor(norm.rank?.short)}`}>
                    {norm.rank?.short ?? '—'}
                  </span>
                  {norm.rank?.full && (
                    <div className="text-[10px] text-gray-400 font-normal mt-0.5 leading-tight">{norm.rank.full}</div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hasConditions ? (
              conditionNames.map((condName, rowIdx) => (
                <tr key={condName} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="px-4 py-3 text-gray-700 font-medium border-b border-gray-100 align-top">
                    {condName}
                  </td>
                  {sortedNorms.map((norm) => {
                    const cond = condByNorm.get(norm.id)?.get(condName);
                    return (
                      <td key={norm.id} className="px-3 py-3 text-center border-b border-gray-100 align-top">
                        {cond ? (
                          <div>
                            <div className="font-semibold text-gray-900">{cond.value ?? '—'}</div>
                            {cond.additional && cond.additional.length > 0 && (
                              <div className="mt-1 text-left">
                                <ConditionTree conditions={cond.additional} depth={1} />
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              // No conditions — single row showing just rank values
              <tr className="bg-white">
                {sortedNorms.map((norm) => (
                  <td key={norm.id} className="px-3 py-4 text-center border-b border-gray-100">
                    <span className="text-gray-400 text-sm">—</span>
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function NormativesTable({ sport, discipline, data, loading, onBack }) {
  const groups = useMemo(() => {
    if (!data?.normatives?.length) return [];
    return groupByParams(data.normatives);
  }, [data]);

  return (
    <div>
      {/* Breadcrumb + title */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-[#3A9B6F] hover:text-[#2D7F5F] font-medium mb-3 transition-colors"
        >
          ← Назад к дисциплинам
        </button>
        <div className="flex items-start gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-semibold text-gray-900">{discipline.discipline_name}</h2>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{sport.sport_name}</p>
          </div>
          {data?.total_count != null && (
            <div className="ml-auto bg-[#E8F4EE] text-[#2D7F5F] px-3 py-1 rounded-full text-sm font-medium self-start">
              {data.total_count} нормативов
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <SkeletonTable />
      ) : !data?.normatives?.length ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-4">📊</div>
          <p className="font-medium">Нет нормативов для данной дисциплины</p>
        </div>
      ) : (
        <div>
          {groups.map((group, idx) => (
            <ParamGroup key={idx} params={group.params} normatives={group.normatives} />
          ))}
        </div>
      )}
    </div>
  );
}
