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

  const toggleDiscipline = (disciplineId) => {
    setExpandedDisciplines(prev => ({
      ...prev,
      [disciplineId]: !prev[disciplineId]
    }));
  };

  // Группируем нормативы по дисциплинам
  const groupedByDiscipline = data?.normatives.reduce((acc, normative) => {
    const key = normative.discipline_id;
    if (!acc[key]) {
      acc[key] = {
        discipline_name: normative.discipline_name,
        discipline_code: normative.discipline_code,
        discipline_parameters: normative.discipline_parameters,
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
      'МСМК': 'bg-purple-100 text-purple-800 border-purple-200',
      'МС': 'bg-red-100 text-red-800 border-red-200',
      'КМС': 'bg-orange-100 text-orange-800 border-orange-200',
      'I': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'II': 'bg-green-100 text-green-800 border-green-200',
      'III': 'bg-blue-100 text-blue-800 border-blue-200',
      'I юн.': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'II юн.': 'bg-teal-100 text-teal-800 border-teal-200',
      'III юн.': 'bg-cyan-100 text-cyan-800 border-cyan-200'
    };
    return colors[rank] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container-responsive">
          <div className="sport-card p-8">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Загрузка нормативов...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container-responsive">
          <div className="sport-card p-6">
            <div className="text-center text-red-600">
              <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="font-medium mb-4">{error}</p>
              <button 
                onClick={loadNormatives}
                className="btn-primary"
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
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container-responsive">
          <div className="sport-card p-8">
            <div className="text-center text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium mb-2">Нормативы не найдены</h3>
              <p className="text-sm mb-4">Для выбранного вида спорта нет нормативов</p>
              <Link to="/" className="btn-primary">
                Вернуться к заполнению
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-responsive">
        {/* Хлебные крошки и заголовок */}
        <div className="mb-6">
          <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
            <Link to="/" className="hover:text-blue-600 transition-colors">
              Главная
            </Link>
            <span>›</span>
            <span className="text-gray-900 font-medium">Нормативы</span>
          </nav>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {data.sport_name}
              </h1>
              <p className="text-gray-600 mt-1">Спортивные нормативы и требования</p>
            </div>
            <div className="bg-blue-50 text-blue-800 px-4 py-2 rounded-lg text-sm">
              ID: {data.sport_id}
            </div>
          </div>
        </div>

        {/* Статистика */}
        <div className="sport-card p-6 mb-6">
          <div className="grid grid-cols-3 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{Object.keys(groupedByDiscipline).length}</div>
              <div className="text-sm text-gray-600">Дисциплин</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{data.total_count}</div>
              <div className="text-sm text-gray-600">Нормативов</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {new Set(data.normatives.map(n => n.rank_short)).size}
              </div>
              <div className="text-sm text-gray-600">Разрядов</div>
            </div>
          </div>
        </div>

        {/* Список нормативов по дисциплинам */}
        <div className="space-y-4">
          {Object.entries(groupedByDiscipline).map(([disciplineId, disciplineData]) => {
            const isExpanded = expandedDisciplines[disciplineId];
            const sortedNormatives = disciplineData.normatives.sort((a, b) => 
              rankOrder.indexOf(a.rank_short) - rankOrder.indexOf(b.rank_short)
            );

            return (
              <div key={disciplineId} className="sport-card">
                {/* Заголовок дисциплины */}
                <button
                  onClick={() => toggleDiscipline(disciplineId)}
                  className="w-full flex justify-between items-start p-6 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900 mb-1">
                          {disciplineData.discipline_name}
                        </h3>
                        {disciplineData.discipline_code && (
                          <span className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium mb-2">
                            {disciplineData.discipline_code}
                          </span>
                        )}
                        {disciplineData.discipline_parameters && (
                          <p className="text-sm text-gray-600">
                            {disciplineData.discipline_parameters}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
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
                  <div className="border-t border-gray-200">
                    <div className="p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {sortedNormatives.map((normative, index) => (
                          <div
                            key={index}
                            className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors bg-white"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRankColor(normative.rank_short)}`}>
                                {normative.rank_short}
                              </span>
                              <span className="text-lg font-bold text-gray-900">
                                {normative.condition_value}
                              </span>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="text-gray-600">Требование:</span>
                                <span className="ml-1 font-medium">
                                  {normative.requirement_short}
                                </span>
                              </div>
                              {normative.requirement_desc && (
                                <div>
                                  <span className="text-gray-600">Описание:</span>
                                  <span className="ml-1 text-gray-700">
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