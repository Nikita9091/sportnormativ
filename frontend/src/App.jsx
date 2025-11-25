import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import axios from "axios";
import DisciplinesManager from "./components/DisciplinesManager";
import ParamTypeManager from "./components/ParamTypeManager";
import ParameterManager from "./components/ParameterManager";
import LinkManager from "./components/LinkManager";
import NormativeManager from "./components/NormativeManager";
import NormativePage from "./components/NormativePage";
import RequirementManager from "./components/RequirementManager"
import API_CONFIG from './config/api';

const API = API_CONFIG.baseURL;

function MainApp() {
  const [sports, setSports] = useState([]);
  const [selectedSport, setSelectedSport] = useState(null);
  const [activeTabs, setActiveTabs] = useState({
    disciplines: false,
    paramTypes: false,
    parameters: false,
    links: false,
    normatives: false
  });

  const [disciplines, setDisciplines] = useState([]);
  const [paramTypes, setParamTypes] = useState([]);
  const [parameters, setParameters] = useState([]);

  // Загрузка сохраненного спорта из localStorage
  useEffect(() => {
    const savedSport = localStorage.getItem('selectedSport');
    if (savedSport) {
      try {
        const sportData = JSON.parse(savedSport);
        setSelectedSport(sportData);
      } catch (e) {
        console.error('Error parsing saved sport:', e);
        localStorage.removeItem('selectedSport');
      }
    }
  }, []);

  // Сохранение выбранного спорта в localStorage
  useEffect(() => {
    if (selectedSport) {
      localStorage.setItem('selectedSport', JSON.stringify(selectedSport));
    }
  }, [selectedSport]);

  // загрузка всех справочников
  const reloadAll = async () => {
    const [disc, params, types, requires, require_types] = await Promise.all([
      axios.get(`${API}/disciplines/json`),
      axios.get(`${API}/parameters/json`),
      axios.get(`${API}/parameter_types/json`),
      axios.get(`${API}/requirements/json`),
      axios.get(`${API}/requirement_types/json`)
    ]);
    setDisciplines(disc.data.disciplines || []);
    setParameters(params.data.parameters || []);
    setParamTypes(types.data.parameters || []);
  };

  useEffect(() => {
    axios.get(`${API}/sports/json`).then(r => {
      setSports(r.data.sports);

      // Если есть сохраненный спорт, обновляем его данные из свежего списка
      if (selectedSport) {
        const updatedSport = r.data.sports.find(s => s.id === selectedSport.id);
        if (updatedSport) {
          setSelectedSport(updatedSport);
        }
      }
    });
    reloadAll();
  }, []);

  const toggleTab = (tabName) => {
    setActiveTabs(prev => ({
      ...prev,
      [tabName]: !prev[tabName]
    }));
  };

  const handleSportChange = (sportId) => {
    if (!sportId) {
      setSelectedSport(null);
      localStorage.removeItem('selectedSport');
      return;
    }

    const sport = sports.find(s => s.id === parseInt(sportId));
    if (sport) {
      setSelectedSport(sport);
      // Закрываем все вкладки при смене спорта
      setActiveTabs({
        disciplines: false,
        paramTypes: false,
        parameters: false,
        links: false,
        requires: false,
        normatives: false
      });
    }
  };

  const tabs = [
    { key: "disciplines", label: "Дисциплины", icon: "🏃", component: DisciplinesManager },
    { key: "paramTypes", label: "Типы параметров", icon: "📊", component: ParamTypeManager },
    { key: "parameters", label: "Параметры", icon: "⚙️", component: ParameterManager },
    { key: "links", label: "Связи", icon: "🔗", component: LinkManager },
    { key: "requires", label: "Требования", icon: "🎯", component: RequirementManager },
    { key: "normatives", label: "Добавление нормативов", icon: "➕", component: NormativeManager }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 py-6">
      <div className="container-responsive">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6 px-4">
          📚 Управление справочниками SportNormativ
        </h1>

        {/* Выбор вида спорта */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6 mx-auto max-w-2xl">
          <label className="block mb-2 font-semibold text-sm sm:text-base text-gray-900 dark:text-white">
            Выберите вид спорта:
          </label>
          <select
            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-full p-2 sm:p-3 rounded text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
            value={selectedSport?.id || ""}
            onChange={e => handleSportChange(e.target.value)}
          >
            <option value="">— выберите —</option>
            {sports.map(s => (
              <option key={s.id} value={s.id}>
                {s.sport_name}
              </option>
            ))}
          </select>

          {/* Кнопка сброса выбора */}
          {selectedSport && (
            <button
              onClick={() => handleSportChange("")}
              className="mt-3 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
            >
              Сбросить выбор
            </button>
          )}
        </div>

        {selectedSport && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mx-auto max-w-6xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg sm:text-xl font-semibold text-center sm:text-left text-gray-900 dark:text-white">
                Вид спорта: <span className="text-blue-700 dark:text-blue-400">{selectedSport.sport_name}</span>
              </h2>

              {/* Ссылка на просмотр нормативов */}
              <Link
                to={`/normatives/${selectedSport.id}`}
                className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors text-sm sm:text-base font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Просмотр нормативов
              </Link>
            </div>

            {/* Аккордеон вкладки */}
            <div className="space-y-4 p-6">
              {tabs.map((tab) => (
                <div key={tab.key} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleTab(tab.key)}
                    className="w-full flex justify-between items-center p-4 sm:p-6 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    <span className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">
                      {tab.icon} {tab.label}
                    </span>
                    <svg
                      className={`w-5 h-5 transform transition-transform text-gray-500 dark:text-gray-400 ${
                        activeTabs[tab.key] ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  <div
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${
                      activeTabs[tab.key]
                        ? 'max-h-[2000px] opacity-100'
                        : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                      {tab.key === "disciplines" && (
                        <tab.component
                          sport={selectedSport}
                          onChange={reloadAll}
                          disciplines={disciplines}
                        />
                      )}
                      {tab.key === "paramTypes" && (
                        <tab.component
                          onChange={reloadAll}
                        />
                      )}
                      {tab.key === "parameters" && (
                        <tab.component
                          paramTypes={paramTypes}
                          onChange={reloadAll}
                        />
                      )}
                      {tab.key === "links" && (
                        <tab.component
                          disciplines={disciplines}
                          parameters={parameters}
                          onChange={reloadAll}
                          sport={selectedSport}
                        />
                      )}
                      {tab.key === "requires" && (
                        <tab.component
                          onChange={reloadAll}
                        />
                      )}
                      {tab.key === "normatives" && (
                        <tab.component
                          disciplines={disciplines}
                          parameters={parameters}
                          onChange={reloadAll}
                          sport={selectedSport}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Состояние когда спорт не выбран */}
        {!selectedSport && sports.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center mx-auto max-w-2xl">
            <div className="text-gray-500 dark:text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Выберите вид спорта
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Для начала работы выберите вид спорта из списка выше
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/normatives/:sport_id" element={<NormativePage />} />
        <Route path="/" element={<MainApp />} />
      </Routes>
    </Router>
  );
}