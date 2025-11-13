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
        <h3 className="font-semibold mb-3">Связь дисциплин и параметров</h3>
        <div className="text-sm text-gray-600">
          Сначала выберите вид спорта (вверху), затем переходите к связям.
        </div>
      </div>
    );
  }

  const disciplinesForSport = (disciplines || []).filter((d) => d.sport_id === sport.id);

  return (
    <div>
      <h3 className="font-semibold mb-3">Связь дисциплин и параметров</h3>

      <select
        className="border p-2 rounded w-full mb-3"
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
      {isLoading && <div className="text-sm text-gray-500 mb-2">Загрузка параметров...</div>}

      <div className="grid grid-cols-2 gap-2 mb-4">
        {(parameters || []).map((p) => {
          // Проверяем, привязан ли этот параметр
          const isLinked = linkedParams.includes(p.id);

          // Динамически назначаем классы
          const labelClass = `
            flex items-center gap-2 border p-2 rounded
            ${!disciplineId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${isLinked ? 'bg-green-100 border-green-400 font-medium' : 'bg-white'}
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
              />
              <span>
                {p.parameter_type_name}: {p.parameter_value}
              </span>
            </label>
          );
        })}
      </div>

      {/* Кнопки "Сохранить" и "Сбросить" больше не нужны */}
    </div>
  );
}