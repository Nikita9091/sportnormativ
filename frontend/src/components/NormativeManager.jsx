import { useEffect, useState } from "react";
import axios from "axios";
import API_CONFIG from '../config/api';

const API = API_CONFIG.baseURL;

// Утилита для сброса формы
const getInitialFormState = () => ({
  selectedParamIds: [],
  rankValues: {}, // { rank_id: "value" }
  requirementId: "",
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

  // Цвета для разрядов
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

  if (!sport) {
    return (
      <div>
        <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Добавление норматива</h3>
        <div className="text-sm text-gray-600 dark:text-gray-400">Сначала выберите вид спорта.</div>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* 1. Дисциплина */}
        <section>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">1. Выберите дисциплину</label>
          <select
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2 rounded w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">2. Отметьте параметры</label>
            {isLoadingParams && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400"></div>
                Загрузка параметров...
              </div>
            )}
            {!isLoadingParams && disciplineParams.length === 0 && (
              <div className="text-sm text-gray-500 dark:text-gray-400">Нет параметров.</div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1
              [&::-webkit-scrollbar]:w-2
              [&::-webkit-scrollbar-track]:bg-gray-100
              [&::-webkit-scrollbar-track]:dark:bg-gray-700
              [&::-webkit-scrollbar-thumb]:bg-gray-300
              [&::-webkit-scrollbar-thumb]:dark:bg-gray-600
              [&::-webkit-scrollbar-thumb]:rounded-full">
              {disciplineParams.map((p) => (
                <label key={p.ldp_id || p.id} className={`
                  flex items-center gap-3 border p-3 rounded cursor-pointer transition-all duration-200
                  ${formState.selectedParamIds.includes(p.ldp_id || p.id)
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600'
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
                  }
                `}>
                  <input
                    type="checkbox"
                    checked={formState.selectedParamIds.includes(p.ldp_id || p.id)}
                    onChange={() => toggleParam(p.ldp_id || p.id)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-400 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{p.parameter_value}</span>
                </label>
              ))}
            </div>
          </section>
        )}

        {/* 3. Требование */}
        {disciplineId && (
          <section>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">3. Выберите основное требование</label>
            <select
              className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2 rounded w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
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

        {/* 4. Разряды - УЛУЧШЕННАЯ ВЕРСИЯ */}
        {disciplineId && (
          <section>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">4. Введите значения для разрядов</label>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {ranks.map((rank) => (
                <div key={rank.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:shadow-sm transition-shadow">
                  <div className="flex flex-col gap-2">
                    <div className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium border ${getRankColor(rank.short_name)}`}>
                      {rank.short_name}
                    </div>
                    <input
                      type="text"
                      placeholder="00,00"
                      maxLength="10"
                      className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2 rounded text-center text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 placeholder-gray-400 dark:placeholder-gray-500"
                      value={formState.rankValues[rank.id] || ""}
                      onChange={(e) => handleRankValueChange(rank.id, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Заполните значения для нужных разрядов. Пустые поля будут проигнорированы.
            </div>
          </section>
        )}

        {/* 5. ДОПОЛНИТЕЛЬНЫЕ ТРЕБОВАНИЯ - ИСПРАВЛЕННАЯ МОБИЛЬНАЯ ВЕРСИЯ */}
        {disciplineId && (
          <section>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              5. Дополнительные требования
            </label>
            <div className="space-y-3 mb-3">
              {formState.additionalRequirements.map((req, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  {/* Мобильная версия - вертикальное расположение */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Тип (напр. Экипировка)"
                        className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2 rounded w-full text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 placeholder-gray-400 dark:placeholder-gray-500 mb-2 sm:mb-0"
                        value={req.type}
                        onChange={(e) => handleAddReqChange(index, "type", e.target.value)}
                      />
                    </div>
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        placeholder="Значение (напр. Кимоно)"
                        className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2 rounded flex-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 placeholder-gray-400 dark:placeholder-gray-500"
                        value={req.value}
                        onChange={(e) => handleAddReqChange(index, "value", e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => removeAddReq(index)}
                        className="text-red-500 hover:text-red-700 dark:hover:text-red-400 font-bold px-2 text-s transition-colors flex items-center justify-center min-w-[20px] max-h-[38px]"
                        title="Удалить"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addAddReq}
              className="text-blue-600 dark:text-blue-400 text-sm font-semibold hover:underline flex items-center gap-1 transition-colors"
            >
              + Добавить требование
            </button>
          </section>
        )}

        {/* Кнопка отправки - ИСПРАВЛЕНА ДЛЯ МОБИЛЬНОЙ ВЕРСИИ */}
        {disciplineId && (
          <section className="pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white px-6 py-3 rounded-lg shadow hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto font-medium flex items-center justify-center gap-2 min-h-[48px]"
                disabled={isSubmitting || isLoadingParams}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Сохранение...
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    Добавить норматив
                  </>
                )}
              </button>

              {/* Информация о выбранных элементах */}
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center sm:text-left">
                {formState.selectedParamIds.length > 0 && (
                  <div>Параметров: {formState.selectedParamIds.length}</div>
                )}
                {Object.values(formState.rankValues).filter(v => v.trim()).length > 0 && (
                  <div>Разрядов: {Object.values(formState.rankValues).filter(v => v.trim()).length}</div>
                )}
              </div>
            </div>

            {statusMessage.text && (
              <div className={`mt-3 p-3 rounded text-sm ${
                statusMessage.type === 'success'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}>
                {statusMessage.text}
              </div>
            )}
          </section>
        )}
      </form>
    </div>
  );
}