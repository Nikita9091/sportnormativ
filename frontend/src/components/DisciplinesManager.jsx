import { useState } from "react";
import axios from "axios";
import API_CONFIG from '../config/api';

const API = API_CONFIG.baseURL;

export default function DisciplinesManager({ sport, disciplines, onChange }) {
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

  const filteredDisciplines = disciplines.filter((d) => d.sport_id === sport.id);

  return (
    <div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Название дисциплины"
          className="border p-2 rounded text-sm sm:text-base"
        />
        <input
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          placeholder="Код дисциплины"
          className="border p-2 rounded text-sm sm:text-base"
        />
        <button
          onClick={handleAdd}
          className="bg-green-600 text-white px-4 py-2 rounded text-sm sm:text-base hover:bg-green-700 transition-colors"
        >
          ➕ Добавить
        </button>
      </div>

      {filteredDisciplines.length > 0 ? (
        <ul className="divide-y border rounded">
          {filteredDisciplines.map((d) => (
            <li
              key={d.id}
              className="flex justify-between items-center px-3 py-2 hover:bg-gray-50"
            >
              <div className="text-sm sm:text-base">
                <span className="font-medium">{d.discipline_name}</span>
                {d.discipline_code && (
                  <span className="ml-2 text-sm text-gray-500">
                    ({d.discipline_code})
                  </span>
                )}
              </div>
              <button
                className="text-gray-400 hover:text-red-600 transition-colors p-1"
                onClick={() => handleDelete(d.id)}
                title="Удалить"
              >
                ❌
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 text-center py-4 text-sm sm:text-base">
          Нет дисциплин для этого вида спорта
        </p>
      )}
    </div>
  );
}