import { useEffect, useState } from "react";
import axios from "axios";
import API_CONFIG from '../config/api';

const API = API_CONFIG.baseURL;

export default function NormativesManager({ sport }) {
  const [disciplines, setDisciplines] = useState([]);
  const [selectedDiscipline, setSelectedDiscipline] = useState("");
  const [params, setParams] = useState([]); // параметры дисциплины (lnk_discipline_parameters)
  const [selectedParams, setSelectedParams] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [selectedRequirement, setSelectedRequirement] = useState("");
  const [rankValues, setRankValues] = useState(Array(9).fill("")); // значения для 9 разрядов
  const [ranks, setRanks] = useState([]);

  // === Загрузка дисциплин данного вида спорта ===
  useEffect(() => {
    if (!sport?.id) return;
    axios.get(`${API}/disciplines/json`).then((r) => {
      const filtered = (r.data.disciplines || []).filter(
        (d) => d.sport_id === sport.id
      );
      setDisciplines(filtered);
    });
  }, [sport]);

  // === Загрузка всех разрядов ===
  useEffect(() => {
    axios.get(`${API}/ranks/json`).then((r) => setRanks(r.data.ranks || []));
  }, []);

  // === Загрузка требований ===
  useEffect(() => {
    axios.get(`${API}/requirements/json`).then((r) => {
      setRequirements(r.data.requirements || []);
    });
  }, []);

  // === Загрузка параметров дисциплины ===
  const loadDisciplineParams = async (disciplineId) => {
    if (!disciplineId) return;
    const r = await axios.get(`${API}/discipline-parameters/${disciplineId}`);
    setParams(r.data.parameters || []);
  };

  // === При выборе дисциплины ===
  const handleDisciplineChange = (e) => {
    const id = e.target.value;
    setSelectedDiscipline(id);
    setSelectedParams([]);
    loadDisciplineParams(id);
  };

  // === Обработка чекбоксов параметров ===
  const toggleParam = (id) => {
    setSelectedParams((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  // === Изменение значений норм по разрядам ===
  const handleRankChange = (index, value) => {
    const updated = [...rankValues];
    updated[index] = value;
    setRankValues(updated);
  };

  // === Отправка данных ===
  const handleSubmit = async () => {
    if (!selectedDiscipline || !selectedRequirement || selectedParams.length === 0) {
      alert("Выберите дисциплину, параметры и требование.");
      return;
    }

    const rankEntries = ranks.map((r, i) => ({
      rank_id: r.id,
      condition_value: rankValues[i] || "",
    }));

    const payload = {
      discipline_id: parseInt(selectedDiscipline),
      ldp_ids: selectedParams,
      requirement_id: parseInt(selectedRequirement),
      rank_entries: rankEntries,
    };

    try {
      const res = await axios.post(`${API}/normatives`, payload);
      alert(`✅ Добавлено ${res.data.created.length} нормативов`);
      setRankValues(Array(9).fill(""));
    } catch (err) {
      console.error(err);
      alert("Ошибка при добавлении норматива.");
    }
  };

  return (
    <div>
      <h3 className="font-semibold mb-4 text-lg">Добавление норматива</h3>

      {/* === Выбор дисциплины === */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Дисциплина:</label>
        <select
          className="border p-2 rounded w-full"
          value={selectedDiscipline}
          onChange={handleDisciplineChange}
        >
          <option value="">— выберите дисциплину —</option>
          {disciplines.map((d) => (
            <option key={d.id} value={d.id}>
              {d.discipline_name}
            </option>
          ))}
        </select>
      </div>

      {/* === Выбор параметров === */}
      {params.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Параметры дисциплины:</label>
          <div className="flex flex-wrap gap-3 border rounded p-3 bg-gray-50">
            {params.map((p) => (
              <label key={p.id} className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={selectedParams.includes(p.id)}
                  onChange={() => toggleParam(p.id)}
                />
                {p.parameter_type_name}: {p.parameter_value}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* === Выбор требования === */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Требование:</label>
        <select
          className="border p-2 rounded w-full"
          value={selectedRequirement}
          onChange={(e) => setSelectedRequirement(e.target.value)}
        >
          <option value="">— выберите требование —</option>
          {requirements.map((r) => (
            <option key={r.id} value={r.id}>
              {r.requirement_value}
            </option>
          ))}
        </select>
      </div>

      {/* === Поля для разрядов === */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Введите значения нормы для каждого разряда:
        </label>
        <div className="grid grid-cols-3 gap-2">
          {ranks.map((r, i) => (
            <div key={r.id} className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1">{r.short_name}</label>
              <input
                type="text"
                value={rankValues[i]}
                onChange={(e) => handleRankChange(i, e.target.value)}
                className="border p-2 rounded"
                placeholder="Введите значение"
              />
            </div>
          ))}
        </div>
      </div>

      {/* === Кнопка добавления === */}
      <button
        onClick={handleSubmit}
        className="bg-green-600 text-white px-5 py-2 rounded hover:bg-green-700"
      >
        ➕ Добавить норматив
      </button>
    </div>
  );
}