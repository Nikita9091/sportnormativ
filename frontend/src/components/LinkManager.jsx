import { useEffect, useState } from "react";
import axios from "axios";
import API_CONFIG from '../config/api';

const API = API_CONFIG.baseURL;

export default function LinkManager({ disciplines = [], parameters = [], onChange, sport }) {
  const [disciplineId, setDisciplineId] = useState("");
  // Тут храним ID параметров, УЖЕ привязанных к дисциплине
  const [linkedParams, setLinkedParams] = useState([]);
  // Добавляем состояние загрузки
  const [isLoading, setIsLoading] = useState(false);

  // 1. Сбрасываем все, если изменился ВЕСЬ вид спорта
  useEffect(() => {
    setDisciplineId("");
    setLinkedParams([]);
  }, [sport?.id]);

  // 2. ГЛАВНАЯ НОВАЯ ЛОГИКА:
  // Загружаем привязанные параметры, как только меняется `disciplineId`
  useEffect(() => {
    // Если выбрали "Выберите дисциплину" (пустое значение)
    if (!disciplineId) {
      setLinkedParams([]); // Сбрасываем список
      return;
    }

    const fetchLinkedParameters = async () => {
      setIsLoading(true);
      try {
        const res = await axios.get(`${API}/discipline-parameters/${disciplineId}`);
        // Превращаем массив объектов в массив ID
        const linkedIds = res.data.lnk_discipline_parameters.map((p) => p.id);
        setLinkedParams(linkedIds);
      } catch (err) {
        console.error("Ошибка при загрузке связанных параметров:", err);
        alert("Не удалось загрузить связанные параметры.");
        setLinkedParams([]); // Сбрасываем в случае ошибки
      } finally {
        setIsLoading(false);
      }
    };

    fetchLinkedParameters();
  }, [disciplineId]); // Зависимость - `disciplineId`

  // 3. Обработчик клика по параметру (добавление/удаление)
  const handleParamClick = async (paramId) => {
    // Не даем кликать, пока не выбрана дисциплина
    if (!disciplineId) return;

    const isLinked = linkedParams.includes(paramId);
    const originalLinkedParams = [...linkedParams]; // Сохраняем для отката

    let action;
    let optimismUI;

    if (isLinked) {
      // --- Логика УДАЛЕНИЯ ---
      action = 'unlink';
      // Оптимистично убираем из UI
      optimismUI = () => setLinkedParams((prev) => prev.filter((id) => id !== paramId));
    } else {
      // --- Логика ДОБАВЛЕНИЯ ---
      action = 'link';
      // Оптимистично добавляем в UI
      optimismUI = () => setLinkedParams((prev) => [...prev, paramId]);
    }

    // 1. Применяем оптимистичное обновление
    optimismUI();

    // 2. Отправляем запрос на сервер
    try {
      if (action === 'link') {
        await axios.post(`${API}/link-parameters`, {
          discipline_id: parseInt(disciplineId),
          parameter_ids: [paramId], // Отправляем массив с одним ID
        });
      } else if (action === 'unlink') {
        await axios.delete(`${API}/link-parameters`, {
          data: {
            discipline_id: parseInt(disciplineId),
            parameter_id: paramId,
          },
        });
      }

      // Если родительский компонент слушает изменения
      if (onChange) onChange();

    } catch (err) {
      console.error(`Ошибка при ${action === 'link' ? 'добавлении' : 'удалении'} связи:`, err);
      alert("Ошибка при обновлении связи. Изменения будут отменены.");
      // 3. В случае ошибки — ОТКАТЫВАЕМ UI
      setLinkedParams(originalLinkedParams);
    }
  };

  // --- Рендеринг ---

  if (!sport) {
    return (
      <div>
        <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Связь дисциплин и параметров</h3>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Сначала выберите вид спорта (вверху), затем переходите к связям.
        </div>
      </div>
    );
  }

  const disciplinesForSport = (disciplines || []).filter((d) => d.sport_id === sport.id);

  return (
    <div>
      <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Связь дисциплин и параметров</h3>

      <select
        className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2 rounded w-full mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
        onChange={(e) => setDisciplineId(e.target.value)}
        value={disciplineId}
      >
        <option value="">Выберите дисциплину</option>
        {disciplinesForSport.map((d) => (
          <option key={d.id} value={d.id}>
            {d.discipline_name}
          </option>
        ))}
      </select>

      {/* Индикатор загрузки */}
      {isLoading && (
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400"></div>
          Загрузка параметров...
        </div>
      )}

      {/* Контейнер для параметров с фиксированной высотой и прокруткой */}
      <div className="mb-4">
        <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
          {parameters.length > 0 ? (
            <>Доступно параметров: <span className="font-medium">{parameters.length}</span></>
          ) : (
            "Нет доступных параметров"
          )}
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50 p-4">
          <div
            className="
              grid grid-cols-1 md:grid-cols-2 gap-2
              max-h-96 overflow-y-auto
              pr-2
              [&::-webkit-scrollbar]:w-2
              [&::-webkit-scrollbar-track]:bg-gray-100
              [&::-webkit-scrollbar-track]:dark:bg-gray-800
              [&::-webkit-scrollbar-thumb]:bg-gray-300
              [&::-webkit-scrollbar-thumb]:dark:bg-gray-600
              [&::-webkit-scrollbar-thumb]:rounded-full
              hover:[&::-webkit-scrollbar-thumb]:bg-gray-400
              hover:[&::-webkit-scrollbar-thumb]:dark:bg-gray-500
            "
          >
            {(parameters || []).map((p) => {
              // Проверяем, привязан ли этот параметр
              const isLinked = linkedParams.includes(p.id);

              // Динамически назначаем классы
              const labelClass = `
                flex items-center gap-3 border p-3 rounded transition-all duration-200
                ${!disciplineId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'}
                ${isLinked
                  ? 'bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-600 font-medium text-green-800 dark:text-green-300'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-500'
                }
              `;

              return (
                <label key={p.id} className={labelClass}>
                  <input
                    type="checkbox"
                    // Блокируем, если не выбрана дисциплина или идет загрузка
                    disabled={!disciplineId || isLoading}
                    // Состояние чекбокса = привязан или нет
                    checked={isLinked}
                    // При изменении вызываем наш новый обработчик
                    onChange={() => handleParamClick(p.id)}
                    className="
                      w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded
                      focus:ring-blue-500 dark:focus:ring-blue-400 dark:ring-offset-gray-800
                      focus:ring-2 dark:bg-gray-700 dark:border-gray-600
                      disabled:opacity-50 disabled:cursor-not-allowed
                    "
                  />
                  <span className="flex-1 min-w-0">
                    <span className="font-medium text-sm block">
                      {p.parameter_type_name}
                    </span>
                    <span className="text-s opacity-80 block mt-1">
                      {p.parameter_value}
                    </span>
                  </span>

                  {/* Индикатор статуса */}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    isLinked
                      ? 'bg-green-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`} />
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* Статистика */}
      {disciplineId && parameters.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <div className="flex justify-between items-center">
              <span>Привязано параметров:</span>
              <span className="font-bold">
                {linkedParams.length} / {parameters.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Подсказка */}
      {!disciplineId && parameters.length > 0 && (
        <div className="text-sm text-gray-500 dark:text-gray-400 italic">
          Выберите дисциплину, чтобы управлять привязкой параметров
        </div>
      )}
    </div>
  );
}