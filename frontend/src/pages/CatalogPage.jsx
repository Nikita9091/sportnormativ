import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import API_CONFIG from '../config/api';
import CategoryFilter from '../components/catalog/CategoryFilter';
import SportsGrid from '../components/catalog/SportsGrid';
import DisciplineList from '../components/catalog/DisciplineList';
import NormativesTable from '../components/catalog/NormativesTable';

const API = API_CONFIG.baseURL;

function CatalogHeader() {
  return (
    <header className="bg-gradient-to-r from-[#2D7F5F] to-[#3A9B6F] shadow-sm mb-10">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <a href="/catalog" className="flex items-center gap-2 text-white font-semibold text-lg no-underline">
          <div className="w-7 h-7 bg-white/30 rounded-md flex items-center justify-center font-bold text-sm">N</div>
          NormaSport
        </a>
        <nav className="flex items-center gap-6">
          <a href="/catalog" className="text-white/90 hover:text-white text-sm transition-colors">Главная</a>
          <a href="#sports-grid" className="text-white/90 hover:text-white text-sm transition-colors">Виды спорта</a>
          <a href="/" className="text-white/90 hover:text-white text-sm transition-colors">Управление</a>
        </nav>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <div className="bg-gradient-to-br from-[#3A9B6F]/5 to-[#2D7F5F]/5 rounded-2xl p-10 mb-12 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
      <div>
        <h1 className="text-4xl font-semibold text-gray-900 leading-tight mb-4">
          Проверь свой спортивный уровень!
        </h1>
        <p className="text-gray-500 text-base leading-relaxed">
          Найди нормативы для своего вида спорта и оцени свои достижения. Более 40 видов спорта в одной базе.
        </p>
      </div>
      <div className="bg-gradient-to-br from-[#D1E8DC] to-[#C0E0D6] rounded-xl h-48 flex items-center justify-center text-[#7A9E8D] text-4xl">
        🏆
      </div>
    </div>
  );
}

function CatalogFooter() {
  return (
    <footer className="bg-gradient-to-r from-[#2D7F5F] to-[#3A9B6F] text-white mt-16 py-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 mb-8">
          <div>
            <h4 className="text-sm font-semibold mb-3">NormaSport</h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li><a href="/catalog" className="hover:text-white transition-colors">Главная</a></li>
              <li><a href="#sports-grid" className="hover:text-white transition-colors">Виды спорта</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Ресурсы</h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li><a href="/" className="hover:text-white transition-colors">Управление нормативами</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Контакты</h4>
            <div className="text-sm text-white/80 space-y-1">
              <div>support@normasport.ru</div>
              <div>+7 (800) 250-89-88</div>
            </div>
          </div>
        </div>
        <div className="border-t border-white/20 pt-6 flex justify-between items-center text-sm text-white/70">
          <span>© 2025 NormaSport. Все права защищены</span>
        </div>
      </div>
    </footer>
  );
}

export default function CatalogPage() {
  // Sports data
  const [sports, setSports] = useState([]);
  const [sportsLoading, setSportsLoading] = useState(true);
  const [sportsError, setSportsError] = useState(null);

  // Selection state
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSport, setSelectedSport] = useState(null);
  const [selectedDiscipline, setSelectedDiscipline] = useState(null);

  // Disciplines
  const [disciplines, setDisciplines] = useState([]);
  const [disciplinesLoading, setDisciplinesLoading] = useState(false);

  // Normatives
  const [normativesData, setNormativesData] = useState(null);
  const [normativesLoading, setNormativesLoading] = useState(false);

  // Load all sports on mount
  useEffect(() => {
    setSportsLoading(true);
    setSportsError(null);
    axios.get(`${API}/v_1/sports`)
      .then((r) => setSports(r.data.sports ?? []))
      .catch(() => setSportsError('Не удалось загрузить виды спорта'))
      .finally(() => setSportsLoading(false));
  }, []);

  // Derive unique categories from sports
  const categories = useMemo(() => {
    const types = sports.map((s) => s.sport_type).filter(Boolean);
    return [...new Set(types)];
  }, [sports]);

  // Filter sports by selected category
  const filteredSports = useMemo(() => {
    if (!selectedCategory) return sports;
    return sports.filter((s) => s.sport_type === selectedCategory);
  }, [sports, selectedCategory]);

  // When sport selected → load disciplines
  useEffect(() => {
    if (!selectedSport) return;
    setDisciplines([]);
    setSelectedDiscipline(null);
    setNormativesData(null);
    setDisciplinesLoading(true);
    axios.get(`${API}/v_2/sports/${selectedSport.id}/disciplines`)
      .then((r) => setDisciplines(r.data.disciplines ?? []))
      .catch(() => setDisciplines([]))
      .finally(() => setDisciplinesLoading(false));
  }, [selectedSport]);

  // When discipline selected → load normatives
  useEffect(() => {
    if (!selectedDiscipline) return;
    setNormativesData(null);
    setNormativesLoading(true);
    axios.get(`${API}/v_1/disciplines/${selectedDiscipline.discipline_id}/normatives`)
      .then((r) => setNormativesData(r.data))
      .catch(() => setNormativesData({ normatives: [], total_count: 0 }))
      .finally(() => setNormativesLoading(false));
  }, [selectedDiscipline]);

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    setSelectedSport(null);
    setSelectedDiscipline(null);
    setNormativesData(null);
    setDisciplines([]);
  };

  const handleSportSelect = (sport) => {
    setSelectedSport(sport);
  };

  const handleDisciplineSelect = (disc) => {
    setSelectedDiscipline(disc);
  };

  const handleBackToSports = () => {
    setSelectedSport(null);
    setSelectedDiscipline(null);
    setNormativesData(null);
    setDisciplines([]);
  };

  const handleBackToDisciplines = () => {
    setSelectedDiscipline(null);
    setNormativesData(null);
  };

  // Determine which view to show
  const view = selectedDiscipline ? 'normatives' : selectedSport ? 'disciplines' : 'sports';

  return (
    <div className="min-h-screen bg-[#F5F9F4] text-gray-900">
      <CatalogHeader />

      <main className="max-w-7xl mx-auto px-6 pb-10">
        {/* Hero — only on main sports view */}
        {view === 'sports' && <HeroSection />}

        {/* Error state */}
        {sportsError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6 mb-6 flex items-center justify-between">
            <span>{sportsError}</span>
            <button
              onClick={() => { setSportsError(null); setSportsLoading(true); axios.get(`${API}/v_1/sports`).then((r) => setSports(r.data.sports ?? [])).catch(() => setSportsError('Не удалось загрузить виды спорта')).finally(() => setSportsLoading(false)); }}
              className="text-sm font-medium underline hover:no-underline"
            >
              Попробовать снова
            </button>
          </div>
        )}

        {/* Sports view */}
        {view === 'sports' && (
          <section id="sports-grid">
            <h2 className="text-2xl font-semibold text-gray-900 mb-5">
              Выбери вид спорта для поиска норматива
            </h2>
            <CategoryFilter
              categories={categories}
              selected={selectedCategory}
              onSelect={handleCategorySelect}
            />
            <SportsGrid
              sports={filteredSports}
              onSportSelect={handleSportSelect}
              loading={sportsLoading}
            />
          </section>
        )}

        {/* Disciplines view */}
        {view === 'disciplines' && (
          <section>
            <DisciplineList
              sport={selectedSport}
              disciplines={disciplines}
              loading={disciplinesLoading}
              onDisciplineSelect={handleDisciplineSelect}
              onBack={handleBackToSports}
            />
          </section>
        )}

        {/* Normatives view */}
        {view === 'normatives' && (
          <section>
            <NormativesTable
              sport={selectedSport}
              discipline={selectedDiscipline}
              data={normativesData}
              loading={normativesLoading}
              onBack={handleBackToDisciplines}
            />
          </section>
        )}
      </main>

      <CatalogFooter />
    </div>
  );
}
