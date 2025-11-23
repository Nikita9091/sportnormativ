import { useEffect, useState } from "react";
import axios from "axios";
import API_CONFIG from '../config/api';

const API = API_CONFIG.baseURL;

// Утилита для сброса формы
const getInitialFormState = () => ({
  selectedParamIds: [],
  rankValues: {}, // { rank_id: "value" }
  requirementId: "",
  // НОВОЕ: массив для доп. требований
  additionalRequirements: [] // структура: [{ type: "", value: "" }]
});

export default function NormativeManager({
  sport,
  disciplines = [],
  onChange
}) {
  const [disciplineId, setDisciplineId] = useState("");
  const [ranks, setRanks] = useState([]);
  const [disciplineParams, setDisciplineParams] = useState([]);
  const [requires, setRequires] = useState([]);

  // Состояние формы
  const [formState, setFormState] = useState(getInitialFormState());

  // Состояния UI
  const [isLoadingParams, setIsLoadingParams] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });

  const loadRequires = async () => {
    try {
      const r = await axios.get(`${API}/requirements/json`);
      setRequires(r.data.requirements || []);
    } catch (e) { console.error(e); }
  };
  const loadRanks = async () => {
    try {
      const r = await axios.get(`${API}/ranks/json`);
      setRanks(r.data.ranks || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    loadRequires();
    loadRanks();
  }, []);

  const disciplinesForSport = (disciplines || []).filter(
    (d) => d.sport_id == sport?.id
  );

  // Сброс при смене спорта
  useEffect(() => {
    setDisciplineId("");
    setDisciplineParams([]);
    setFormState(getInitialFormState());
    setStatusMessage({ type: "", text: "" });
  }, [sport?.id]);

  // Загрузка параметров при смене дисциплины
  useEffect(() => {
    setDisciplineParams([]);
    setFormState(getInitialFormState());
    setStatusMessage({ type: "", text: "" });

    if (!disciplineId) return;

    const fetchParams = async () => {
      setIsLoadingParams(true);
      try {
        const res = await axios.get(`${API}/discipline-parameters/${disciplineId}`);
        // Поддержка разных форматов ответа (с ключом или без)
        const paramsData = res.data.discipline_parameters || res.data.lnk_discipline_parameters || [];
        setDisciplineParams(paramsData);
      } catch (err) {
        console.error("Ошибка при загрузке параметров:", err);
        setStatusMessage({ type: "error", text: "Не удалось загрузить параметры" });
      } finally {
        setIsLoadingParams(false);
      }
    };

    fetchParams();
  }, [disciplineId]);

  // --- ОБРАБОТЧИКИ ОСНОВНЫЕ ---

  const handleDisciplineChange = (e) => setDisciplineId(e.target.value);

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
      rankValues: { ...prev.rankValues, [rankId]: value },
    }));
  };

  // --- ОБРАБОТЧИКИ ДОП. ТРЕБОВАНИЙ (НОВОЕ) ---

  // Добавить новую пустую строку
  const addAddReq = () => {
    setFormState((prev) => ({
      ...prev,
      additionalRequirements: [...prev.additionalRequirements, { type: "", value: "" }]
    }));
  };

  // Удалить строку по индексу
  const removeAddReq = (index) => {
    setFormState((prev) => ({
      ...prev,
      additionalRequirements: prev.additionalRequirements.filter((_, i) => i !== index)
    }));
  };

  // Изменить значение в строке
  const handleAddReqChange = (index, field, val) => {
    setFormState((prev) => {
      const newReqs = [...prev.additionalRequirements];
      newReqs[index] = { ...newReqs[index], [field]: val };
      return { ...prev, additionalRequirements: newReqs };
    });
  };

  // --- ОТПРАВКА ---

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage({ type: "", text: "" });

    if (!disciplineId || !formState.requirementId || formState.selectedParamIds.length === 0) {
      setStatusMessage({ type: "error", text: "Выберите дисциплину, требование и параметры." });
      return;
    }

    // Фильтруем разряды с введенными значениями
    const validRankEntries = Object.keys(formState.rankValues)
      .map((rankId) => ({
        rank_id: parseInt(rankId),
        condition_value: formState.rankValues[rankId],
      }))
      .filter((entry) => entry.condition_value && entry.condition_value.trim() !== "");

    if (validRankEntries.length === 0) {
      setStatusMessage({ type: "error", text: "Введите значение хотя бы для одного разряда." });
      return;
    }

    // Фильтруем пустые доп. требования (чтобы не слать мусор)
    const validAddReqs = formState.additionalRequirements.filter(
      req => req.type.trim() !== "" && req.value.trim() !== ""
    );

    const payload = {
      discipline_id: parseInt(disciplineId),
      ldp_ids: formState.selectedParamIds,
      requirement_id: parseInt(formState.requirementId),
      rank_entries: validRankEntries,
      // Отправляем новый массив
      additional_requirements: validAddReqs
    };

    setIsSubmitting(true);
    try {
      const res = await axios.post(`${API}/normatives`, payload);
      const createdCount = res.data.created?.length || 0;

      setStatusMessage({
        type: "success",
        text: `Успешно добавлено нормативов: ${createdCount}.`,
      });

      setFormState(getInitialFormState());
      if (onChange) onChange();
    } catch (err) {
      console.error("Ошибка:", err);
      const detail = err.response?.data?.detail || "Ошибка сервера";
      setStatusMessage({ type: "error", text: `Ошибка: ${detail}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!sport) {
    return (
      <div>
        <h3 className="font-semibold mb-3">Добавление норматива</h3>
        <div className="text-sm text-gray-600">Сначала выберите вид спорта.</div>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* 1. Дисциплина */}
        <section>
          <label className="block text-sm font-medium text-gray-700 mb-1">1. Выберите дисциплину</label>
          <select
            className="border p-2 rounded w-full"
            onChange={handleDisciplineChange}
            value={disciplineId}
          >
            <option value="">Выберите...</option>
            {disciplinesForSport.map((d) => (
              <option key={d.id} value={d.id}>{d.discipline_name}</option>
            ))}
          </select>
        </section>

        {/* 2. Параметры */}
        {disciplineId && (
          <section>
            <label className="block text-sm font-medium text-gray-700 mb-2">2. Отметьте параметры</label>
            {isLoadingParams && <div className="text-sm">Загрузка...</div>}
            {!isLoadingParams && disciplineParams.length === 0 && (
              <div className="text-sm text-gray-500">Нет параметров.</div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {disciplineParams.map((p) => (
                <label key={p.ldp_id || p.id} className="flex items-center gap-2 border p-2 rounded cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={formState.selectedParamIds.includes(p.ldp_id || p.id)}
                    onChange={() => toggleParam(p.ldp_id || p.id)}
                  />
                  <span>{p.parameter_value}</span>
                </label>
              ))}
            </div>
          </section>
        )}

        {/* 3. Требование */}
        {disciplineId && (
          <section>
            <label className="block text-sm font-medium text-gray-700 mb-1">3. Выберите основное требование</label>
            <select
              className="border p-2 rounded w-full"
              onChange={handleRequirementChange}
              value={formState.requirementId}
            >
              <option value="">Выберите...</option>
              {requires.map((r) => (
                <option key={r.id} value={r.id}>{r.requirement_value}</option>
              ))}
            </select>
          </section>
        )}

        {/* 4. Разряды (ОБНОВЛЕННАЯ СЕКЦИЯ) */}
        {disciplineId && (
          <section>
            <label className="block text-sm font-medium text-gray-700 mb-2">4. Введите значения для разрядов</label>
            <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded border">
              {ranks.map((rank) => (
                <div key={rank.id} className="col-span-1 grid grid-cols-2 gap-2 items-center">
                  <span className="col-span-1 text-sm font-medium text-gray-600 truncate">{rank.short_name}</span>
                  <input
                    type="number" // Используем number для мобильных клавиатур
                    pattern="[0-9]*" // Дополнительный хинт для мобильных
                    placeholder="00.00"
                    maxLength="4"
                    className="border p-2 rounded w-full text-center text-sm col-span-1 focus:ring-2 focus:ring-blue-200 outline-none"
                    value={formState.rankValues[rank.id] || ""}
                    onChange={(e) => handleRankValueChange(rank.id, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 5. ДОПОЛНИТЕЛЬНЫЕ ТРЕБОВАНИЯ (НОВОЕ) */}
        {disciplineId && (
          <section>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              5. Дополнительные требования
            </label>
            <div className="space-y-2 mb-2">
              {formState.additionalRequirements.map((req, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Тип (напр. Экипировка)"
                    className="border p-2 rounded w-1/3 text-sm"
                    value={req.type}
                    onChange={(e) => handleAddReqChange(index, "type", e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Значение (напр. Кимоно)"
                    className="border p-2 rounded w-full text-sm"
                    value={req.value}
                    onChange={(e) => handleAddReqChange(index, "value", e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeAddReq(index)}
                    className="text-red-500 hover:text-red-700 font-bold px-2 text-xl"
                    title="Удалить"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addAddReq}
              className="text-blue-600 text-sm font-semibold hover:underline flex items-center gap-1"
            >
              + Добавить требование
            </button>
          </section>
        )}

        {/* Кнопка отправки */}
        {disciplineId && (
          <section className="pt-4 border-t mt-6">
            <button
              type="submit"
              className="bg-green-600 text-white px-6 py-2 rounded shadow hover:bg-green-700 disabled:opacity-50 w-full sm:w-auto"
              disabled={isSubmitting || isLoadingParams}
            >
              {isSubmitting ? "Сохранение..." : "💾 Добавить норматив"}
            </button>

            {statusMessage.text && (
              <div className={`mt-3 p-3 rounded text-sm ${statusMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {statusMessage.text}
              </div>
            )}
          </section>
        )}
      </form>
    </div>
  );
}