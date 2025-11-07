import { useEffect, useState } from "react";
import axios from "axios";
import API_CONFIG from '../config/api';

const API = API_CONFIG.baseURL;

export default function LinkManager({ disciplines = [], parameters = [], onChange, sport }) {
  const [disciplineId, setDisciplineId] = useState("");
  const [selectedParams, setSelectedParams] = useState([]);
  const [linked, setLinked] = useState([]);

  // Сбрасываем выбор дисциплины и выбранных параметров при смене вида спорта
  useEffect(() => {
    setDisciplineId("");
    setSelectedParams([]);
    setLinked([]);
  }, [sport?.id]);

  const toggleParam = (id) => {
    setSelectedParams((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!disciplineId || selectedParams.length === 0) {
      alert("Выберите дисциплину и хотя бы один параметр.");
      return;
    }
    try {
      const res = await axios.post(`${API}/link-parameters`, {
        discipline_id: parseInt(disciplineId),
        parameter_ids: selectedParams,
      });
      setLinked(res.data.inserted || []);
      setSelectedParams([]);
      if (onChange) onChange();
    } catch (err) {
      console.error("Ошибка при сохранении связей:", err);
      alert("Ошибка при сохранении. Посмотрите консоль.");
    }
  };

  // Если sport не передан — показываем подсказку (доп. защита)
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

  // фильтруем дисциплины, оставляя только те, что принадлежат текущему виду спорта
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

      <div className="grid grid-cols-2 gap-2 mb-4">
        {(parameters || []).map((p) => (
          <label key={p.id} className="flex items-center gap-2 border p-2 rounded">
            <input
              type="checkbox"
              checked={selectedParams.includes(p.id)}
              onChange={() => toggleParam(p.id)}
            />
            <span>
              {p.parameter_type_name}: {p.parameter_value}
            </span>
          </label>
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded">
          💾 Сохранить связь
        </button>

        <button
          onClick={() => {
            setDisciplineId("");
            setSelectedParams([]);
          }}
          className="bg-gray-200 px-4 py-2 rounded"
        >
          Сбросить
        </button>
      </div>

      {linked.length > 0 && (
        <div className="mt-4 bg-green-50 border p-3 rounded">
          <h4 className="font-semibold mb-2">Добавлены связи:</h4>
          <ul className="list-disc pl-5 text-sm">
            {linked.map((l, i) => (
              <li key={i}>Параметр ID {l.parameter_id}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}