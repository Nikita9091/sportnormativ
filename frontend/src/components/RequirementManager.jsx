import { useEffect, useState } from "react";
import axios from "axios";
import API_CONFIG from '../config/api';

const API = API_CONFIG.baseURL;

export default function RequirementManager({ onChange }) {
  const [requires, setRequires] = useState([]);
  const [requireTypes, setRequireTypes] = useState([]);
  const [selectedType, setSelectedType] = useState("");
  const [newValue, setNewValue] = useState("");

  // Состояние для отображения ошибки дубликата
  const [errorMsg, setErrorMsg] = useState("");

  const loadRequires = async () => {
    try {
      const r = await axios.get(`${API}/requirements/json`);
      setRequires(r.data.requirements || []);
    } catch (error) {
      console.error("Ошибка при загрузке требований:", error);
    }
  };

  const loadRequireTypes = async () => {
    try {
      const r = await axios.get(`${API}/requirement_types/json`);
      setRequireTypes(r.data.requirements_types || []);
    } catch (error) {
      console.error("Ошибка при загрузке типов:", error);
    }
  };

  useEffect(() => {
    loadRequires();
    loadRequireTypes();
  }, []);

  const handleAdd = async () => {
    setErrorMsg(""); // Сбрасываем ошибку перед новой попыткой

    if (!selectedType || !newValue.trim()) return;

    const trimmedValue = newValue.trim();

    // --- 3. ЗАЩИТА ОТ ДУБЛИКАТОВ (Frontend) ---
    // Проверяем, есть ли уже требование с таким же ТИПОМ и таким же ЗНАЧЕНИЕМ
    const isDuplicate = requires.some(req =>
      // Сравниваем ID типа (приводим к числу оба, на всякий случай)
      // Примечание: убедись, что бэкенд возвращает requirement_type_id в списке requires
      // Если нет, логику придется поменять на сравнение имен.
      (req.requirement_type_id == selectedType) &&
      // Сравниваем строки без учета регистра
      (req.requirement_value.toLowerCase() === trimmedValue.toLowerCase())
    );

    if (isDuplicate) {
      setErrorMsg("Такое требование уже существует!");
      return;
    }

    try {
      await axios.post(`${API}/requirements`, {
        requirement_type_id: parseInt(selectedType),
        requirement_value: trimmedValue,
      });

      setNewValue("");
      setSelectedType(""); // Можно сбрасывать тип, можно оставлять - по желанию

      // --- 2. ОБНОВЛЕНИЕ НА ЛЕТУ ---
      loadRequires(); // Было loadParams(), исправил на правильную функцию
      if (onChange) onChange();

    } catch (error) {
      console.error("Ошибка при добавлении:", error);
      alert("Ошибка при сохранении");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Вы уверены, что хотите удалить это требование?")) return;

    try {
      // Исправил путь API: было /parameters/, стало /requirements/
      await axios.delete(`${API}/requirements/${id}`);

      // --- 2. ОБНОВЛЕНИЕ НА ЛЕТУ ---
      loadRequires(); // Было loadParams(), исправил на правильную функцию
      if (onChange) onChange();
    } catch (error) {
      console.error("Ошибка при удалении:", error);
      alert("Не удалось удалить требование");
    }
  };

  return (
    <div>

      {/* Блок добавления */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        <select
          className="border p-2 rounded focus:ring-2 focus:ring-blue-200 outline-none"
          onChange={(e) => {
            setSelectedType(e.target.value);
            setErrorMsg(""); // Убираем ошибку, если пользователь начал менять данные
          }}
          value={selectedType}
        >
          <option value="">Тип требования</option>
          {requireTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.requirement_type_name}
            </option>
          ))}
        </select>

        <input
          value={newValue}
          onChange={(e) => {
            setNewValue(e.target.value);
            setErrorMsg("");
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()} // Добавление по Enter
          placeholder="Значение (напр: Чемпионат Мира)"
          className={`border p-2 rounded col-span-2 focus:ring-2 outline-none ${errorMsg ? 'border-red-500 focus:ring-red-200' : 'focus:ring-blue-200'}`}
        />
      </div>

      {/* Сообщение об ошибке дубликата */}
      {errorMsg && (
        <div className="text-red-600 text-sm mb-2 font-medium">
          ⚠️ {errorMsg}
        </div>
      )}

      <button
        onClick={handleAdd}
        disabled={!selectedType || !newValue.trim()}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        ➕ Добавить
      </button>

      {/* --- 1. СКРОЛЛИНГ ---
          max-h-96: ограничивает высоту (примерно 24rem / 384px)
          overflow-y-auto: включает вертикальную прокрутку, если контент не влезает
      */}
      <div className="mt-4 border rounded max-h-96 overflow-y-auto bg-white shadow-inner">
        {requires.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            Список требований пуст
          </div>
        ) : (
          <ul className="divide-y">
            {requires.map((p) => (
              <li
                key={p.id}
                className="flex justify-between items-center px-3 py-2 hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm text-gray-800">
                  <span className="font-semibold text-gray-600 mr-2">{p.requirement_type_name}:</span>
                  {p.requirement_value}
                </span>
                <button
                  className="text-gray-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-full"
                  onClick={() => handleDelete(p.id)}
                  title="Удалить требование"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Статистика */}
      {requires.length > 0 && (
        <div className="mt-2 p-2 bg-blue-50 rounded-lg text-center">
          <p className="text-xs text-blue-700">
            Всего требований: <span className="font-semibold">{requires.length}</span>
          </p>
        </div>
      )}
    </div>
  );
}