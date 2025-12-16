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
    const r = await axios.get(`${API}/parameters`);
    setParams(r.data.parameters || []);
  };

  const loadParamTypes = async () => {
    const r = await axios.get(`${API}/parameter_types`);
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
      {/* Форма добавления */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <select
          className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
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
          className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2 rounded col-span-1 md:col-span-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 placeholder-gray-500 dark:placeholder-gray-400"
        />
      </div>

      <button
        onClick={handleAdd}
        disabled={!selectedType || !newValue.trim()}
        className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-6"
      >
        ➕ Добавить параметр
      </button>

      {/* Список параметров */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {/* Заголовок */}
        <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Список параметров ({params.length})
          </h3>
        </div>

        {/* Контейнер с прокруткой */}
        <div className="max-h-96 overflow-y-auto bg-white dark:bg-gray-800
          [&::-webkit-scrollbar]:w-2
          [&::-webkit-scrollbar-track]:bg-gray-100
          [&::-webkit-scrollbar-track]:dark:bg-gray-700
          [&::-webkit-scrollbar-thumb]:bg-gray-300
          [&::-webkit-scrollbar-thumb]:dark:bg-gray-600
          [&::-webkit-scrollbar-thumb]:rounded-full
          hover:[&::-webkit-scrollbar-thumb]:bg-gray-400
          hover:[&::-webkit-scrollbar-thumb]:dark:bg-gray-500">

          {/* Сетка параметров */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {params.map((p) => (
              <div
                key={p.id}
                className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white text-sm">
                    {p.parameter_type_name}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                    {p.parameter_value}
                  </div>
                </div>

                <button
                  className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg group-hover:bg-red-50 dark:group-hover:bg-red-900/20"
                  onClick={() => handleDelete(p.id)}
                  title="Удалить параметр"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Сообщение при пустом списке */}
        {params.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>Нет добавленных параметров</p>
          </div>
        )}
      </div>

      {/* Статистика */}
      {params.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 text-center">
            Всего параметров: <span className="font-semibold">{params.length}</span>
          </p>
        </div>
      )}
    </div>
  );
}