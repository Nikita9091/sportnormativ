import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_CONFIG from '../config/api';
import DisciplineList from './catalog/DisciplineList';
import NormativesTable from './catalog/NormativesTable';
import '../pages/CatalogPage.css';

const API = API_CONFIG.baseURL;

export default function NormativePage() {
  const { sport_id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const sport = state?.sport;
  const sportForComponents = {
    sport_name: sport?.name ?? `Вид спорта #${sport_id}`,
    sport_type: sport?.category ?? null,
  };

  const [disciplines, setDisciplines] = useState([]);
  const [disciplinesLoading, setDisciplinesLoading] = useState(true);

  const [selectedDiscipline, setSelectedDiscipline] = useState(null);
  const [normativesData, setNormativesData] = useState(null);
  const [normativesLoading, setNormativesLoading] = useState(false);

  const [isSticky, setIsSticky] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setDisciplinesLoading(true);
    axios
      .get(`${API}/v_2/sports/${sport_id}/disciplines`)
      .then((res) => setDisciplines(res.data.disciplines ?? []))
      .catch(() => setDisciplines([]))
      .finally(() => setDisciplinesLoading(false));
  }, [sport_id]);

  useEffect(() => {
    const onScroll = () => setIsSticky(window.scrollY > 90);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSelectDiscipline = (disc) => {
    setSelectedDiscipline(disc);
    setNormativesData(null);
    setNormativesLoading(true);
    axios
      .get(`${API}/v_1/disciplines/${disc.discipline_id}/normatives`)
      .then((res) => setNormativesData(res.data))
      .catch(() => setNormativesData(null))
      .finally(() => setNormativesLoading(false));
  };

  return (
    <div className="catalog-page" data-theme={sportForComponents.sport_type}>
      <div className="catalog-bg-gradient" />

      <header className={`catalog-header${isSticky ? ' sticky' : ''}`}>
        <div className="catalog-logo">
          <div className="catalog-logo-icon" />
          СпортНорматив
        </div>
        <nav className="catalog-nav">
          <button onClick={() => navigate('/catalog')}>Главная</button>
          <button onClick={() => navigate('/info')}>Инфо</button>
          <button>ГТО</button>
          <button>Новости</button>
          <button>Контакты</button>
        </nav>
        <div className="catalog-search">
          <svg className="catalog-search-icon" viewBox="0 0 24 24" fill="none" stroke="#071A14" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            className="catalog-search-input"
            placeholder="Поиск"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      <div className="min-h-screen bg-[#F5F9F4] text-gray-900 pt-[120px] pb-8">
        <div className="max-w-4xl mx-auto px-4">
          {!selectedDiscipline ? (
            <DisciplineList
              sport={sportForComponents}
              disciplines={disciplines}
              loading={disciplinesLoading}
              onDisciplineSelect={handleSelectDiscipline}
              onBack={() => navigate('/catalog')}
            />
          ) : (
            <NormativesTable
              sport={sportForComponents}
              discipline={selectedDiscipline}
              data={normativesData}
              loading={normativesLoading}
              onBack={() => setSelectedDiscipline(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
