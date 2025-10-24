import { useEffect, useState } from "react";
import axios from "axios";

const API = "/api";

export default function App() {
  const [sports, setSports] = useState([]);
  const [selectedSport, setSelectedSport] = useState(null);
  const [activeTab, setActiveTab] = useState("disciplines");

  const [disciplines, setDisciplines] = useState([]);
  const [paramTypes, setParamTypes] = useState([]);
  const [parameters, setParameters] = useState([]);

  // загрузка всех справочников
  const reloadAll = async () => {
    const [disc, params, types] = await Promise.all([
      axios.get(`${API}/disciplines/json`),
      axios.get(`${API}/parameters/json`),
      axios.get(`${API}/parameter_types/json`)
    ]);
    setDisciplines(disc.data.disciplines || []);
    setParameters(params.data.parameters || []);
    setParamTypes(types.data.parameters || []);
  };

  useEffect(() => {
    axios.get(`${API}/sports/json`).then(r => setSports(r.data.sports));
    reloadAll();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <h1 className="text-2xl font-bold text-center mb-6">📚 Управление справочниками SportNormativ</h1>

      {/* Выбор вида спорта */}
      <div className="max-w-lg mx-auto bg-white shadow rounded-2xl p-5 mb-6">
        <label className="block mb-2 font-semibold">Выберите вид спорта:</label>
        <select
          className="border w-full p-2 rounded"
          onChange={e => {
            const id = parseInt(e.target.value);
            setSelectedSport(sports.find(s => s.id === id));
          }}
        >
          <option value="">— выберите —</option>
          {sports.map(s => (
            <option key={s.id} value={s.id}>
              {s.sport_name}
            </option>
          ))}
        </select>
      </div>

      {selectedSport && (
        <div className="max-w-5xl mx-auto bg-white shadow rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">
            Вид спорта: <span className="text-blue-700">{selectedSport.sport_name}</span>
          </h2>

          {/* Вкладки */}
          <div className="flex gap-3 border-b mb-4">
            {[
              { key: "disciplines", label: "Дисциплины" },
              { key: "paramTypes", label: "Типы параметров" },
              { key: "parameters", label: "Параметры" },
              { key: "links", label: "Связь дисциплин и параметров" }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-t-lg ${
                  activeTab === tab.key ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Контент вкладок */}
          {activeTab === "disciplines" && (
            <DisciplinesManager sport={selectedSport} onChange={reloadAll} disciplines={disciplines} />
          )}

          {activeTab === "paramTypes" && <ParamTypeManager onChange={reloadAll} disciplines={disciplines}/>}

          {activeTab === "parameters" && (
            <ParameterManager paramTypes={paramTypes} onChange={reloadAll} />
          )}
            {activeTab === "links" && (
              <LinkManager
                disciplines={disciplines}
                parameters={parameters}
                onChange={reloadAll}
                sport={selectedSport}   // <- передаём выбранный вид спорта
              />
            )}
        </div>
      )}
    </div>
  );
}

/* === Управление дисциплинами === */
function DisciplinesManager({ sport, disciplines, onChange }) {
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");

  const handleAdd = async () => {
    if (!newName.trim() || !newCode.trim()) {
      alert("Введите и название, и код дисциплины.");
      return;
    }

    try {
      await axios.post(`${API}/disciplines`, {
        sport_id: sport.id,
        discipline_names: [newName.trim()],
        discipline_codes: [newCode.trim()],
      });
      setNewName("");
      setNewCode("");
      onChange();
    } catch (err) {
      console.error("Ошибка при добавлении дисциплины:", err);
      alert("Ошибка при добавлении дисциплины. Проверьте консоль.");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Удалить эту дисциплину?")) return;
    try {
      await axios.delete(`${API}/disciplines/${id}`);
      onChange();
    } catch (err) {
      console.error("Ошибка при удалении дисциплины:", err);
    }
  };

  return (
    <div>
      <h3 className="font-semibold mb-3">Дисциплины</h3>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Название дисциплины"
          className="border p-2 rounded"
        />
        <input
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          placeholder="Код дисциплины"
          className="border p-2 rounded"
        />
        <button
          onClick={handleAdd}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          ➕ Добавить
        </button>
      </div>

      <ul className="divide-y border rounded">
        {disciplines
          .filter((d) => d.sport_id === sport.id)
          .map((d) => (
            <li
              key={d.id}
              className="flex justify-between items-center px-3 py-2 hover:bg-gray-50"
            >
              <div>
                <span className="font-medium">{d.discipline_name}</span>
                {d.discipline_code && (
                  <span className="ml-2 text-sm text-gray-500">
                    ({d.discipline_code})
                  </span>
                )}
              </div>
              <button
                className="text-gray-400 hover:text-red-600"
                onClick={() => handleDelete(d.id)}
                title="Удалить"
              >
                ❌
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
}

/* === Управление типами параметров === */
function ParamTypeManager({ onChange }) {
  const [types, setTypes] = useState([]);
  const [newType, setNewType] = useState("");

  const loadTypes = async () => {
    const r = await axios.get(`${API}/parameter_types/json`);
    setTypes(r.data.parameter_types || []);
  };

  useEffect(() => {
    loadTypes();
  }, []);

  const handleAdd = async () => {
    if (!newType.trim()) return;
    await axios.post(`${API}/parameter-types`, { short_name: newType.trim() });
    setNewType("");
    loadTypes();
    onChange();
  };

  const handleDelete = async (id) => {
    //if (!confirm("Удалить этот тип параметра?")) return;
    await axios.delete(`${API}/parameter-types/${id}`);
    loadTypes();
    onChange();
  };

  return (
    <div>
      <h3 className="font-semibold mb-3">Типы параметров</h3>
      <div className="flex gap-2 mb-4">
        <input
          value={newType}
          onChange={(e) => setNewType(e.target.value)}
          placeholder="Например: Дистанция, Пол, Хронометраж"
          className="border p-2 flex-grow rounded"
        />
        <button
          onClick={handleAdd}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          ➕ Добавить
        </button>
      </div>

      <ul className="divide-y border rounded">
        {types.map((t) => (
          <li
            key={t.id}
            className="flex justify-between items-center px-3 py-2 hover:bg-gray-50"
          >
            <span>{t.parameter_type_name}</span>
            <button
              className="text-gray-400 hover:text-red-600"
              onClick={() => handleDelete(t.id)}
              title="Удалить"
            >
              ❌
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* === Управление параметрами === */
function ParameterManager({ onChange }) {
  const [params, setParams] = useState([]);
  const [paramTypes, setParamTypes] = useState([]);
  const [selectedType, setSelectedType] = useState("");
  const [newValue, setNewValue] = useState("");

  const loadParams = async () => {
    const r = await axios.get(`${API}/parameters/json`);
    setParams(r.data.parameters || []);
  };

  const loadParamTypes = async () => {
    const r = await axios.get(`${API}/parameter_types/json`);
    setParamTypes(r.data.parameter_types || []);
  };

  useEffect(() => {
    loadParams();
    loadParamTypes();
  }, []);

  const handleAdd = async () => {
    if (!selectedType || !newValue.trim()) return;
    await axios.post(`${API}/parameters`, {
      parameter_type_id: parseInt(selectedType),
      parameter_value: newValue.trim(),
    });
    setNewValue("");
    loadParams();
    onChange();
  };

  const handleDelete = async (id) => {
    //if (!confirm("Удалить этот параметр?")) return;
    await axios.delete(`${API}/parameters/${id}`);
    loadParams();
    onChange();
  };

  return (
    <div>
      <h3 className="font-semibold mb-3">Параметры</h3>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <select
          className="border p-2 rounded"
          onChange={(e) => setSelectedType(e.target.value)}
          value={selectedType}
        >
          <option value="">Тип параметра</option>
          {paramTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.parameter_type_name}
            </option>
          ))}
        </select>

        <input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="Значение (например: 30 м)"
          className="border p-2 rounded col-span-2"
        />
      </div>

      <button
        onClick={handleAdd}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        ➕ Добавить
      </button>

      <ul className="divide-y border rounded mt-4">
        {params.map((p) => (
          <li
            key={p.id}
            className="flex justify-between items-center px-3 py-2 hover:bg-gray-50"
          >
            <span>
              {p.parameter_type_name}: {p.parameter_value}
            </span>
            <button
              className="text-gray-400 hover:text-red-600"
              onClick={() => handleDelete(p.id)}
              title="Удалить"
            >
              ❌
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* === Управление связями дисциплин и параметров === */
function LinkManager({ disciplines = [], parameters = [], onChange, sport }) {
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

