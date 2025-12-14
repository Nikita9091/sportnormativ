import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import API_CONFIG from '../config/api';

const API = API_CONFIG.baseURL;

export default function NormativePage() {
  const { sport_id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedDisciplines, setExpandedDisciplines] = useState({});
  const [deletingId, setDeletingId] = useState(null);

  // Состояния фильтров - теперь для каждого типа параметра свой фильтр
  const [filters, setFilters] = useState({
    discipline: '',
    rank: '',
    // Динамические фильтры для каждого типа параметра
    parameterFilters: {}
  });

  useEffect(() => {
    loadNormatives();
  }, [sport_id]);

  const loadNormatives = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API}/sports/${sport_id}/normatives/json`);
      setData(response.data);
    } catch (err) {
      console.error("Ошибка при загрузке нормативов:", err);
      setError("Не удалось загрузить нормативы");
    } finally {
      setLoading(false);
    }
  };

  // Функция удаления норматива
  const handleDeleteNormative = async (normativeId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот норматив?')) {
      return;
    }

    setDeletingId(normativeId);
    try {
      const response = await axios.delete(`${API}/normative/${normativeId}`);

      if (response.data.success) {
        // Удаляем норматив из локального состояния
        setData(prev => ({
          ...prev,
          normatives: prev.normatives.filter(n => n.id !== normativeId),
          total_count: prev.total_count - 1
        }));
        alert('Норматив успешно удален');
      } else {
        alert(`Ошибка при удалении: ${response.data.error}`);
      }
    } catch (err) {
      console.error("Ошибка при удалении норматива:", err);
      alert('Не удалось удалить норматив');
    } finally {
      setDeletingId(null);
    }
  };

  // Функции для фильтрации
  const filteredNormatives = useMemo(() => {
    if (!data?.normatives) return [];

    return data.normatives.filter(normative => {
      // Фильтр по дисциплине (точное совпадение по ID)
      if (filters.discipline && normative.discipline_id !== parseInt(filters.discipline)) {
        return false;
      }

      // Фильтр по разряду
      if (filters.rank && normative.rank_short !== filters.rank) {
        return false;
      }

      // Фильтр по параметрам - проверяем каждый активный фильтр
      const activeParameterFilters = Object.entries(filters.parameterFilters).filter(
        ([_, value]) => value !== ''
      );

      for (const [paramType, paramValue] of activeParameterFilters) {
        if ((normative.discipline_parameters?.[paramType] ?? '') !== paramValue) {
          return false;
        }
      }

      return true;
    });
  }, [data, filters]);

  // Получаем уникальные значения для селектов фильтров
  const filterOptions = useMemo(() => {
    if (!data?.normatives) return {
      disciplines: [],
      ranks: [],
      parameterTypes: []
    };

    // Дисциплины с ID для точной фильтрации
    const disciplines = [];
    const disciplineMap = new Map();

    data.normatives.forEach(normative => {
      if (!disciplineMap.has(normative.discipline_id)) {
        disciplineMap.set(normative.discipline_id, {
          id: normative.discipline_id,
          name: normative.discipline_name,
          code: normative.discipline_code
        });
      }
    });

    disciplines.push(...disciplineMap.values());

    const ranks = [...new Set(data.normatives.map(n => n.rank_short).filter(Boolean))];

    // Собираем типы параметров и их возможные значения
    const parameterTypesMap = new Map();

    data.normatives.forEach(normative => {
      Object.entries(normative.discipline_parameters || {}).forEach(([type, value]) => {
        if (!parameterTypesMap.has(type)) {
          parameterTypesMap.set(type, new Set());
        }
        if (value && String(value).trim() !== '') {
          parameterTypesMap.get(type).add(String(value));
        }
      });
    });

    // Преобразуем в массив для удобства
    const parameterTypes = Array.from(parameterTypesMap.entries()).map(([type, values]) => ({
      type,
      values: [...values].sort()
    }));

    return {
      disciplines: disciplines.sort((a, b) => (a.name || '').localeCompare(b.name || '')),
      ranks,
      parameterTypes
    };
  }, [data]);

  // Инициализируем фильтры параметров при загрузке данных
  useEffect(() => {
    if (filterOptions.parameterTypes.length > 0) {
      const initialParameterFilters = {};
      filterOptions.parameterTypes.forEach(({ type }) => {
        initialParameterFilters[type] = '';
      });

      setFilters(prev => ({
        ...prev,
        parameterFilters: initialParameterFilters
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterOptions.parameterTypes.length]);

  const toggleDiscipline = (disciplineKey) => {
    setExpandedDisciplines(prev => ({
      ...prev,
      [disciplineKey]: !prev[disciplineKey]
    }));
  };

  // Обработчик для фильтров параметров
  const handleParameterFilterChange = (paramType, value) => {
    setFilters(prev => ({
      ...prev,
      parameterFilters: {
        ...prev.parameterFilters,
        [paramType]: value
      }
    }));
  };

  // Сброс всех фильтров параметров
  const resetAllParameterFilters = () => {
    const resetParameterFilters = {};
    Object.keys(filters.parameterFilters).forEach(type => {
      resetParameterFilters[type] = '';
    });

    setFilters(prev => ({
      ...prev,
      parameterFilters: resetParameterFilters
    }));
  };

  // Проверяем, есть ли активные фильтры параметров
  const hasActiveParameterFilters = useMemo(() => {
    return Object.values(filters.parameterFilters).some(value => value !== '');
  }, [filters.parameterFilters]);

  // Группируем отфильтрованные нормативы
  const groupedByDisciplineAndParams = useMemo(() => {
    return filteredNormatives.reduce((acc, normative) => {
      const paramsString = JSON.stringify(normative.discipline_parameters || {});
      const key = `${normative.discipline_id}_${paramsString}`;

      if (!acc[key]) {
        acc[key] = {
          discipline_name: normative.discipline_name,
          discipline_code: normative.discipline_code,
          discipline_parameters: normative.discipline_parameters || {},
          discipline_id: normative.discipline_id,
          normatives: []
        };
      }
      acc[key].normatives.push(normative);
      return acc;
    }, {});
  }, [filteredNormatives]);

  // Остальной код (ранк-ордер, цвета и т.д.) остается таким же...
  const rankOrder = ['МСМК', 'МС', 'КМС', 'I', 'II', 'III', 'I юн.', 'II юн.', 'III юн.'];

  const getRankColor = (rank) => {
    const colors = {
      'МСМК': 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-700',
      'МС': 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700',
      'КМС': 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-700',
      'I': 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700',
      'II': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700',
      'III': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700',
      'I юн.': 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900 dark:text-indigo-200 dark:border-indigo-700',
      'II юн.': 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900 dark:text-teal-200 dark:border-teal-700',
      'III юн.': 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900 dark:text-cyan-200 dark:border-cyan-700'
    };
    return colors[rank] || 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600';
  };

  // Компонент фильтров
  const FiltersSection = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Фильтры</h3>

      <div className="space-y-6">
        {/* Основные фильтры */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Фильтр по дисциплине */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Дисциплина
            </label>
            <select
              value={filters.discipline}
              onChange={(e) => setFilters(prev => ({ ...prev, discipline: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Все дисциплины</option>
              {filterOptions.disciplines.map(discipline => (
                <option key={discipline.id} value={discipline.id}>
                  {discipline.name} {discipline.code && `(${discipline.code})`}
                </option>
              ))}
            </select>
          </div>

          {/* Фильтр по разряду */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Разряд
            </label>
            <select
              value={filters.rank}
              onChange={(e) => setFilters(prev => ({ ...prev, rank: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Все разряды</option>
              {filterOptions.ranks.map(rank => (
                <option key={rank} value={rank}>{rank}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Фильтры по параметрам */}
        {filterOptions.parameterTypes.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Фильтры по параметрам
              </label>
              {hasActiveParameterFilters && (
                <button
                  onClick={resetAllParameterFilters}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                >
                  Сбросить все параметры
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filterOptions.parameterTypes.map(({ type, values }) => (
                <div key={type} className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                    {type}
                  </label>
                  <select
                    value={filters.parameterFilters[type] || ''}
                    onChange={(e) => handleParameterFilterChange(type, e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">--</option>
                    {values.map(value => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Кнопка сброса всех фильтров */}
      {(filters.discipline || filters.rank || hasActiveParameterFilters) && (
        <div className="mt-4 flex justify-end border-t border-gray-200 dark:border-gray-600 pt-4">
          <button
            onClick={() => setFilters({
              discipline: '',
              rank: '',
              parameterFilters: Object.fromEntries(
                Object.keys(filters.parameterFilters).map(type => [type, ''])
              )
            })}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline"
          >
            Сбросить все фильтры
          </button>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="container-responsive">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 border border-gray-200 dark:border-gray-700 text-center">
            Загрузка...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="container-responsive">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 border border-gray-200 dark:border-gray-700 text-center text-red-500">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!data?.normatives?.length) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="container-responsive">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 border border-gray-200 dark:border-gray-700">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">Нормативы не найдены</h3>
              <p className="text-sm mb-4">Для выбранного вида спорта нет нормативов</p>
              <Link to="/" className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors inline-block">
                Вернуться к заполнению
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container-responsive">
        {/* Хлебные крошки и заголовок */}
        <div className="mb-6">
          <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
            <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Главная
            </Link>
            <span>›</span>
            <span className="text-gray-900 dark:text-gray-100 font-medium">Нормативы</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {data?.sport_name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Спортивные нормативы и требования</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-4 py-2 rounded-lg text-sm border border-blue-200 dark:border-blue-800">
              ID: {data?.sport_id}
            </div>
          </div>
        </div>

        {/* Статистика - обновляем с учетом фильтров */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {new Set(filteredNormatives.map(n => n.discipline_id)).size}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Дисциплин</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {filteredNormatives.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Нормативов</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {new Set(filteredNormatives.map(n => n.rank_short)).size}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Разрядов</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {Object.keys(groupedByDisciplineAndParams).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Конфигураций</div>
            </div>
          </div>
        </div>

        {/* Секция фильтров */}
        <FiltersSection />

        {/* Список нормативов по дисциплинам и параметрам */}
        <div className="space-y-4">
          {Object.entries(groupedByDisciplineAndParams).map(([disciplineKey, disciplineData]) => {
            const isExpanded = expandedDisciplines[disciplineKey];
            const sortedNormatives = disciplineData.normatives.sort((a, b) =>
              rankOrder.indexOf(a.rank_short) - rankOrder.indexOf(b.rank_short)
            );

            return (
              <div key={disciplineKey} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                {/* Заголовок дисциплины с параметрами */}
                <button
                  onClick={() => toggleDiscipline(disciplineKey)}
                  className="w-full flex justify-between items-start p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left dark:bg-gray-800/50"
                >
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                          {disciplineData.discipline_name}
                        </h3>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {disciplineData.discipline_code && (
                            <span className="inline-block bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs font-medium border border-gray-200 dark:border-gray-600">
                              {disciplineData.discipline_code}
                            </span>
                          )}
                        </div>

                        {/* Отображение параметров как объекта */}
                        {disciplineData.discipline_parameters && Object.keys(disciplineData.discipline_parameters).length > 0 && (
                          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2 mb-2">
                            <div className="space-y-1">
                              {Object.entries(disciplineData.discipline_parameters).map(([paramType, paramValue]) => (
                                <div key={paramType} className="flex items-start text-sm">
                                  <span className="text-blue-700 dark:text-blue-400 font-medium min-w-[80px] flex-shrink-0">
                                    {paramType}: {paramValue}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {disciplineData.normatives.length} нормативов • {sortedNormatives[0]?.rank_short} - {sortedNormatives[sortedNormatives.length - 1]?.rank_short}
                        </p>
                      </div>
                    </div>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 transform transition-transform flex-shrink-0 mt-2 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Содержимое дисциплины */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700">
                    <div className="p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {sortedNormatives.flatMap((normative, normativeIndex) => {
                          // Преобразуем объект condition в массив условий
                          const conditionEntries = Object.entries(normative.condition || {});

                          // Если нет условий, возвращаем одну карточку
                          if (conditionEntries.length === 0) {
                            return [
                              <div
                                key={`${normative.id}_default`}
                                className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-500 transition-colors bg-white dark:bg-gray-800 relative"
                              >
                                <button
                                  onClick={() => handleDeleteNormative(normative.id)}
                                  disabled={deletingId === normative.id}
                                  className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Удалить норматив"
                                >
                                  {deletingId === normative.id ? (
                                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                                  ) : (
                                    <span className="text-lg font-bold">✕</span>
                                  )}
                                </button>

                                <div className="absolute top-2 left-2">
                                  <span className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                    ID: {normative.id}
                                  </span>
                                </div>

                                <div className="mt-6 flex justify-between items-start mb-3">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRankColor(normative.rank_short)}`}>
                                    {normative.rank_short}
                                  </span>
                                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                                    —
                                  </span>
                                </div>

                                <div className="space-y-2 text-sm">
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">Нет условий</span>
                                  </div>
                                </div>
                              </div>
                            ];
                          }

                          // Создаем карточку для каждого условия
                          return conditionEntries.map(([conditionKey, conditionValue], conditionIndex) => (
                            <div
                              key={`${normative.id}_${conditionKey}_${conditionIndex}`}
                              className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-500 transition-colors bg-white dark:bg-gray-800 relative"
                            >
                              <button
                                onClick={() => handleDeleteNormative(normative.id)}
                                disabled={deletingId === normative.id}
                                className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Удалить норматив"
                              >
                                {deletingId === normative.id ? (
                                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                                ) : (
                                  <span className="text-lg font-bold">✕</span>
                                )}
                              </button>

                              {/* ID норматива */}
                              <div className="absolute top-2 left-2">
                                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                  ID: {normative.id}
                                </span>
                              </div>

                              <div className="mt-6 flex justify-between items-start mb-3">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRankColor(normative.rank_short)}`}>
                                  {normative.rank_short}
                                </span>
                                <span className="text-lg font-bold text-gray-900 dark:text-white">
                                  {conditionValue ?? '—'}
                                </span>
                              </div>

                              <div className="space-y-2 text-sm">
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Условие:</span>
                                  <span className="ml-1 font-medium text-gray-900 dark:text-white">
                                    {conditionKey ?? normative.requirement_short ?? '—'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ));
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}