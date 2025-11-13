import { useEffect, useState } from "react";
import axios from "axios";
import API_CONFIG from '../config/api';

const API = API_CONFIG.baseURL;

export default function ParameterManager({ onChange }) {
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
                  className="text-gray-400 hover:text-red-600 transition-colors p-1 sm:p-2 group-hover:bg-red-50 rounded"
                  onClick={() => handleDelete(p.id)}
                  title="Удалить тип параметра"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
          </li>
        ))}
      </ul>
      {/* Статистика */}
      {params.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs sm:text-sm text-blue-700 text-center">
            Всего параметров: <span className="font-semibold">{params.length}</span>
          </p>
        </div>
      )}
    </div>
  );
}