import { useEffect, useState } from "react";
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

  const toggleDiscipline = (disciplineKey) => {
    setExpandedDisciplines(prev => ({
      ...prev,
      [disciplineKey]: !prev[disciplineKey]
    }));
  };

  // Группируем нормативы по дисциплинам И параметрам
  const groupedByDisciplineAndParams = data?.normatives.reduce((acc, normative) => {
    // Создаем уникальный ключ: дисциплина + параметры
    const key = `${normative.discipline_id}_${normative.discipline_parameters}`;

    if (!acc[key]) {
      acc[key] = {
        discipline_name: normative.discipline_name,
        discipline_code: normative.discipline_code,
        discipline_parameters: normative.discipline_parameters,
        discipline_id: normative.discipline_id,
        normatives: []
      };
    }
    acc[key].normatives.push(normative);
    return acc;
  }, {}) || {};

  // Порядок разрядов от высшего к низшему
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

  // Группируем по дисциплинам для статистики (без учета параметров)
  const disciplinesCount = new Set(data?.normatives?.map(n => n.discipline_id) || []).size;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="container-responsive">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Загрузка нормативов...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="container-responsive">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="text-center text-red-600 dark:text-red-400">
              <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="font-medium mb-4">{error}</p>
              <button
                onClick={loadNormatives}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Повторить попытку
              </button>
            </div>
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
                {data.sport_name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Спортивные нормативы и требования</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-4 py-2 rounded-lg text-sm border border-blue-200 dark:border-blue-800">
              ID: {data.sport_id}
            </div>
          </div>
        </div>

        {/* Статистика */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{disciplinesCount}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Дисциплин</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{data.total_count}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Нормативов</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {new Set(data.normatives.map(n => n.rank_short)).size}
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
                        {disciplineData.discipline_parameters && (
                          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2 mb-2">
                            <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Параметры:</p>
                            <p className="text-sm text-blue-700 dark:text-blue-400">
                              {disciplineData.discipline_parameters}
                            </p>
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
                        {sortedNormatives.map((normative, index) => (
                          <div
                            key={index}
                            className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-500 transition-colors bg-white dark:bg-gray-800"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRankColor(normative.rank_short)}`}>
                                {normative.rank_short}
                              </span>
                              <span className="text-lg font-bold text-gray-900 dark:text-white">
                                {normative.condition_value}
                              </span>
                            </div>

                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Требование:</span>
                                <span className="ml-1 font-medium text-gray-900 dark:text-white">
                                  {normative.requirement_short}
                                </span>
                              </div>
                              {normative.requirement_desc && (
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Описание:</span>
                                  <span className="ml-1 text-gray-700 dark:text-gray-300">
                                    {normative.requirement_desc}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
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