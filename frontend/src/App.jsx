import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import axios from "axios";
import DisciplinesManager from "./components/DisciplinesManager";
import ParamTypeManager from "./components/ParamTypeManager";
import ParameterManager from "./components/ParameterManager";
import LinkManager from "./components/LinkManager";
import NormativesManager from "./components/NormativesManager";
import NormativesPage from "./components/NormativesPage";
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

  const toggleTab = (tabName) => {
    setActiveTabs(prev => ({
      ...prev,
      [tabName]: !prev[tabName]
    }));
  };

  const tabs = [
    { key: "disciplines", label: "Дисциплины", icon: "🏃", component: DisciplinesManager },
    { key: "paramTypes", label: "Типы параметров", icon: "📊", component: ParamTypeManager },
    { key: "parameters", label: "Параметры", icon: "⚙️", component: ParameterManager },
    { key: "links", label: "Связи", icon: "🔗", component: LinkManager },
    { key: "normatives", label: "Добавление нормативов", icon: "➕", component: NormativesManager }
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 py-6">
      <div className="container-responsive">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6 px-4">
          📚 Управление справочниками SportNormativ
        </h1>

        {/* Выбор вида спорта */}
        <div className="card-responsive mb-6 mx-auto max-w-2xl">
          <label className="block mb-2 font-semibold text-sm sm:text-base">
            Выберите вид спорта:
          </label>
          <select
            className="border w-full p-2 sm:p-3 rounded text-sm sm:text-base"
            onChange={e => {
              const id = parseInt(e.target.value);
              setSelectedSport(sports.find(s => s.id === id));
              // Закрываем все вкладки при смене спорта
              setActiveTabs({
                disciplines: false,
                paramTypes: false,
                parameters: false,
                links: false,
                normatives: false
              });
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
          <div className="card-responsive mx-auto max-w-6xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-center sm:text-left">
                Вид спорта: <span className="text-blue-700">{selectedSport.sport_name}</span>
              </h2>
              
              {/* Ссылка на просмотр нормативов */}
              <Link 
                to={`/normatives/${selectedSport.id}`}
                className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                  Просмотр нормативов
              </Link>
            </div>

            {/* Аккордеон вкладки */}
            <div className="space-y-4">
              {tabs.map((tab) => (
                <div key={tab.key} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleTab(tab.key)}
                    className="w-full flex justify-between items-center p-4 sm:p-6 bg-white hover:bg-gray-50 transition-colors text-left"
                  >
                    <span className="font-semibold text-sm sm:text-base">{tab.label}</span>
                    <svg
                      className={`w-5 h-5 transform transition-transform ${
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
                    className={`accordion-content overflow-hidden ${
                      activeTabs[tab.key] 
                        ? 'max-h-[2000px] opacity-100' 
                        : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="p-4 sm:p-6 border-t bg-gray-50">
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
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/normatives/:sport_id" element={<NormativesPage />} />
        <Route path="/" element={<MainApp />} />
      </Routes>
    </Router>
  );
}