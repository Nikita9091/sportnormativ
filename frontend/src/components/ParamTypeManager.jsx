import { useEffect, useState } from "react";
import axios from "axios";
import API_CONFIG from '../config/api';

const API = API_CONFIG.baseURL;

export default function ParamTypeManager({ onChange }) {
  const [types, setTypes] = useState([]);
  const [newType, setNewType] = useState("");
  const [loading, setLoading] = useState(false);

  const loadTypes = async () => {
    try {
      setLoading(true);
      const r = await axios.get(`${API}/parameter_types`);
      setTypes(r.data.parameter_types || []);
    } catch (err) {
      console.error("Ошибка при загрузке типов параметров:", err);
      alert("Ошибка при загрузке типов параметров");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTypes();
  }, []);

  const handleAdd = async () => {
    if (!newType.trim()) {
      alert("Введите название типа параметра");
      return;
    }

    try {
      await axios.post(`${API}/parameter-types`, { short_name: newType.trim() });
      setNewType("");
      loadTypes();
      if (onChange) onChange();
    } catch (err) {
      console.error("Ошибка при добавлении типа параметра:", err);
      alert("Ошибка при добавлении типа параметра");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Удалить этот тип параметра?")) return;
    
    try {
      await axios.delete(`${API}/parameter-types/${id}`);
      loadTypes();
      if (onChange) onChange();
    } catch (err) {
      console.error("Ошибка при удалении типа параметра:", err);
      alert("Ошибка при удалении типа параметра");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  return (
    <div>
      
      {/* Форма добавления */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          value={newType}
          onChange={(e) => setNewType(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Например: Дистанция, Пол, Хронометраж"
          className="border p-2 sm:p-3 flex-grow rounded text-sm sm:text-base"
        />
        <button
          onClick={handleAdd}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded text-sm sm:text-base hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? "⏳" : "➕"} Добавить
        </button>
      </div>

      {/* Список типов параметров */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-500 mt-2 text-sm">Загрузка...</p>
        </div>
      ) : types.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <ul className="divide-y">
            {types.map((t) => (
              <li
                key={t.id}
                className="flex justify-between items-center px-3 sm:px-4 py-3 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm sm:text-base font-medium">
                    {t.parameter_type_name}
                  </span>
                </div>
                <button
                  className="text-gray-400 hover:text-red-600 transition-colors p-1 sm:p-2 group-hover:bg-red-50 rounded"
                  onClick={() => handleDelete(t.id)}
                  title="Удалить тип параметра"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-center py-8 border rounded-lg bg-gray-50">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500 text-sm sm:text-base">Нет типов параметров</p>
          <p className="text-gray-400 text-xs mt-1">Добавьте первый тип параметра выше</p>
        </div>
      )}

      {/* Статистика */}
      {types.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs sm:text-sm text-blue-700 text-center">
            Всего типов параметров: <span className="font-semibold">{types.length}</span>
          </p>
        </div>
      )}
    </div>
  );
}