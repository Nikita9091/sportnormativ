import { useEffect, useState } from "react";
import axios from "axios";
import API_CONFIG from '../config/api';

const API = API_CONFIG.baseURL;

// Утилита для сброса формы
const getInitialFormState = () => ({
  selectedParamIds: [],
  rankValues: {}, // { rank_id_1: "value", rank_id_2: "value" }
});

export default function NormativeManager({
  sport,
  disciplines = [],
  onChange
}) {
  const [disciplineId, setDisciplineId] = useState("");
  const [ranks, setRanks] = useState([]);

  // Параметры, *привязанные* к выбранной дисциплине
  const [disciplineParams, setDisciplineParams] = useState([]);

  // Состояние для полей формы
  const [formState, setFormState] = useState(getInitialFormState());

  const [requires, setRequires] = useState([]);

  // Состояния для UI
  const [isLoadingParams, setIsLoadingParams] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });

  const loadRequires = async () => {
    const r = await axios.get(`${API}/requirements/json`);
    setRequires(r.data.requirements || []);
  };
  const loadRanks = async () => {
    const r = await axios.get(`${API}/ranks/json`);
    setRanks(r.data.ranks || []);
  };

  useEffect(() => {
    loadRequires();
    loadRanks();
  }, []);

  // 1. Фильтруем дисциплины по спорту
  const disciplinesForSport = (disciplines || []).filter(
    (d) => d.sport_id === sport?.id
  );

  // 2. Сбрасываем все, если изменился вид спорта
  useEffect(() => {
    setDisciplineId("");
    setDisciplineParams([]);
    setFormState(getInitialFormState());
    setStatusMessage({ type: "", text: "" });
  }, [sport?.id]);

  // 3. Загружаем параметры при смене ДИСЦИПЛИНЫ
  useEffect(() => {
    // Сбрасываем все, кроме 'disciplineId'
    setDisciplineParams([]);
    setFormState(getInitialFormState());
    setStatusMessage({ type: "", text: "" });

    if (!disciplineId) return;

    const fetchParams = async () => {
      setIsLoadingParams(true);
      try {
        const res = await axios.get(`${API}/discipline-parameters/${disciplineId}`);
        setDisciplineParams(res.data.lnk_discipline_parameters || []);
      } catch (err) {
        console.error("Ошибка при загрузке параметров дисциплины:", err);
        setStatusMessage({ type: "error", text: "Не удалось загрузить параметры" });
      } finally {
        setIsLoadingParams(false);
      }
    };

    fetchParams();
  }, [disciplineId]);

  // --- ОБРАБОТЧИКИ ФОРМЫ ---

  const handleDisciplineChange = (e) => {
    setDisciplineId(e.target.value);
  };

  const toggleParam = (ldpId) => {
    setFormState((prev) => ({
      ...prev,
      selectedParamIds: prev.selectedParamIds.includes(ldpId)
        ? prev.selectedParamIds.filter((id) => id !== ldpId)
        : [...prev.selectedParamIds, ldpId],
    }));
  };

  const handleRequirementChange = (e) => {
    setFormState((prev) => ({ ...prev, requirementId: e.target.value }));
  };

  const handleRankValueChange = (rankId, value) => {
    setFormState((prev) => ({
      ...prev,
      rankValues: {
        ...prev.rankValues,
        [rankId]: value, // Динамически обновляем значение по 'rankId'
      },
    }));
  };

  // --- ОТПРАВКА ФОРМЫ ---

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage({ type: "", text: "" });

    // --- Валидация ---
    if (!disciplineId || !formState.requirementId || formState.selectedParamIds.length === 0) {
      setStatusMessage({ type: "error", text: "Выберите дисциплину, требование и хотя бы один параметр." });
      return;
    }

    // Преобразуем { rank_id: "value" } в [{ rank_id: ..., condition_value: "..." }]
    const rankEntries = Object.keys(formState.rankValues).map((rankId) => ({
      rank_id: parseInt(rankId),
      condition_value: formState.rankValues[rankId] || null, // Отправляем null, если строка пустая
    }));

    // Отфильтруем те, где значение не введено (хотя бэкенд это и так делает)
    const validRankEntries = rankEntries.filter(entry => entry.condition_value);

    if (validRankEntries.length === 0) {
      setStatusMessage({ type: "error", text: "Введите значение хотя бы для одного разряда." });
      return;
    }

    // --- Формируем тело запроса ---
    const payload = {
      discipline_id: parseInt(disciplineId),
      ldp_ids: formState.selectedParamIds,
      requirement_id: parseInt(formState.requirementId),
      rank_entries: validRankEntries,
    };

    // --- Отправка ---
    setIsSubmitting(true);
    try {
      const res = await axios.post(`${API}/normatives`, payload);

      const createdCount = res.data.created?.length || 0;
      const errorCount = res.data.errors?.length || 0;

      setStatusMessage({
        type: "success",
        text: `Успешно добавлено нормативов: ${createdCount}. Ошибок: ${errorCount}.`,
      });

      // Сбрасываем форму
      setFormState(getInitialFormState());

      // Уведомляем родителя (если нужно)
      if (onChange) onChange();

    } catch (err) {
      console.error("Ошибка при добавлении норматива:", err);
      const errorDetail = err.response?.data?.detail || "Неизвестная ошибка сервера.";
      setStatusMessage({ type: "error", text: `Ошибка: ${errorDetail}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- РЕНДЕРИНГ ---

  if (!sport) {
    return (
      <div>
        <h3 className="font-semibold mb-3">Добавление норматива</h3>
        <div className="text-sm text-gray-600">
          Сначала выберите вид спорта (вверху).
        </div>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* --- 1. ВЫБОР ДИСЦИПЛИНЫ --- */}
        <section>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            1. Выберите дисциплину
          </label>
          <select
            className="border p-2 rounded w-full"
            onChange={handleDisciplineChange}
            value={disciplineId}
          >
            <option value="">Выберите...</option>
            {disciplinesForSport.map((d) => (
              <option key={d.id} value={d.id}>
                {d.discipline_name}
              </option>
            ))}
          </select>
        </section>

        {/* --- 2. ВЫБОР ПАРАМЕТРОВ (зависит от дисциплины) --- */}
        {disciplineId && (
          <section>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              2. Отметьте параметры (для этой группы нормативов)
            </label>
            {isLoadingParams && <div className="text-sm">Загрузка параметров...</div>}
            {!isLoadingParams && disciplineParams.length === 0 && (
              <div className="text-sm text-gray-500">
                Для этой дисциплины не найдено связанных параметров. (Сначала настройте их во вкладке "Связь")
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {disciplineParams.map((p) => (
                <label key={p.ldp_id} className="flex items-center gap-2 border p-2 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formState.selectedParamIds.includes(p.ldp_id)}
                    onChange={() => toggleParam(p.ldp_id)}
                  />
                  <span>
                    {p.parameter_value} (ID: {p.ldp_id})
                  </span>
                </label>
              ))}
            </div>
          </section>
        )}

        {/* --- 3. ВЫБОР ТРЕБОВАНИЯ --- */}
        {disciplineId && (
          <section>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              3. Выберите требование
            </label>
            <select
              className="border p-2 rounded w-full"
              onChange={handleRequirementChange}
              value={formState.requirementId}
            >
              <option value="">Выберите...</option>
              {requires.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.requirement_value}
                </option>
              ))}
            </select>
          </section>
        )}

        {/* --- 4. ВВОД ЗНАЧЕНИЙ ПО РАЗРЯДАМ --- */}
        {disciplineId && (
          <section>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              4. Введите значения нормативов
            </label>
            <div className="space-y-2">
              {ranks.map((rank) => (
                <div key={rank.id} className="grid grid-cols-3 gap-2 items-center">
                  <span className="text-sm font-medium text-gray-600">
                    {rank.short_name}
                  </span>
                  <input
                    type="text"
                    className="border p-2 rounded col-span-2"
                    value={formState.rankValues[rank.id] || ""}
                    onChange={(e) => handleRankValueChange(rank.id, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* --- 5. КНОПКА И СТАТУС --- */}
        {disciplineId && (
          <section className="pt-4 border-t">
            <button
              type="submit"
              className="bg-blue-600 text-white px-5 py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
              disabled={isSubmitting || isLoadingParams}
            >
              {isSubmitting ? "Добавление..." : "Добавить норматив"}
            </button>

            {statusMessage.text && (
              <div
                className={`mt-3 p-3 rounded text-sm ${
                  statusMessage.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {statusMessage.text}
              </div>
            )}
          </section>
        )}

      </form>
    </div>
  );
}