import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_CONFIG from '../config/api';
import { getSportEmoji } from '../utils/sportEmojis';
import './CatalogPage.css';

const API = API_CONFIG.baseURL;

const CATEGORY_LABELS = {
  'Летний олимпийский':                           'Летние',
  'Зимний олимпийский':                           'Зимние',
  'Неолимпийский':                                'Неолимпийские',
  'Национальный':                                 'Национальные',
  'Адаптивный':                                   'Адаптивные',
};

const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS);

const SORT_OPTIONS = [
  { value: 'name',       label: 'По названию' },
  { value: 'popularity', label: 'По популярности' },
  { value: 'recent',     label: 'Новое' },
];

const DEMO_SPORTS = [
  { id: 'badminton',  name: 'Бадминтон',        category: 'Летний олимпийский',  icon: '🏸' },
  { id: 'basketball', name: 'Баскетбол',         category: 'Летний олимпийский',  icon: '🏀' },
  { id: 'baseball',   name: 'Бейсбол',           category: 'Летний олимпийский',  icon: '⚾' },
  { id: 'boxing',     name: 'Бокс',              category: 'Летний олимпийский',  icon: '🥊' },
  { id: 'athletics',  name: 'Легкая атлетика',   category: 'Летний олимпийский',  icon: '🏃' },
  { id: 'golf',       name: 'Гольф',             category: 'Летний олимпийский',  icon: '⛳' },
  { id: 'football',   name: 'Футбол',            category: 'Летний олимпийский',  icon: '⚽' },
  { id: 'volleyball', name: 'Волейбол',          category: 'Летний олимпийский',  icon: '🏐' },
  { id: 'tennis',     name: 'Теннис',            category: 'Летний олимпийский',  icon: '🎾' },
  { id: 'judo',       name: 'Дзюдо',             category: 'Летний олимпийский',  icon: '🥋' },
  { id: 'skiing',     name: 'Лыжи',              category: 'Зимний олимпийский',  icon: '⛷️' },
  { id: 'skating',    name: 'Фигурное катание',  category: 'Зимний олимпийский',  icon: '⛸️' },
  { id: 'snowboard',  name: 'Сноуборд',          category: 'Зимний олимпийский',  icon: '🏂' },
  { id: 'icehockey',  name: 'Хоккей',            category: 'Зимний олимпийский',  icon: '🏒' },
  { id: 'curling',    name: 'Керлинг',           category: 'Зимний олимпийский',  icon: '🥌' },
  { id: 'cheerleading', name: 'Чирлидинг',       category: 'Неолимпийский',       icon: '📣' },
  { id: 'parkour',    name: 'Паркур',            category: 'Неолимпийский',       icon: '🤸' },
  { id: 'sumo',       name: 'Сумо',              category: 'Национальный',        icon: '⭕' },
  { id: 'kabaddi',    name: 'Кабадди',           category: 'Национальный',        icon: '👥' },
  { id: 'wbasket',    name: 'Инвалидный баскет', category: 'Адаптивный',          icon: '♿' },
  { id: 'paraswim',   name: 'Пара-плавание',     category: 'Адаптивный',          icon: '♿' },
];

export default function CatalogPage() {
  const navigate = useNavigate();
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState('Летний олимпийский');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSort, setCurrentSort] = useState('name');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    axios
      .get(`${API}/v_1/sports`)
      .then((res) => {
        const raw = res.data.sports ?? [];
        setSports(raw.map((s, i) => ({
          id: s.id || `sport-${i}`,
          name: s.name || s.sport_name || 'Неизвестный вид спорта',
          category: s.sport_type || 'Летний олимпийский',
          image_url: s.image_url || null,
          icon: getSportEmoji(s.sport_name, s.sport_type),
        })));
      })
      .catch(() => setSports(DEMO_SPORTS))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onScroll = () => setIsSticky(window.scrollY > 90);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const categories = useMemo(() => {
    const present = new Set(sports.map((s) => s.category));
    return CATEGORY_ORDER.filter((c) => present.has(c));
  }, [sports]);

  const visibleSports = useMemo(() => {
    let list = sports.filter((s) => s.category === selectedCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q));
    }
    if (currentSort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    return list;
  }, [sports, selectedCategory, searchQuery, currentSort]);

  return (
    <div className="catalog-page" data-theme={selectedCategory}>
      {/* Фоновый градиент */}
      <div className="catalog-bg-gradient" />

      {/* ===== HEADER ===== */}
      <header className={`catalog-header${isSticky ? ' sticky' : ''}`}>
        <div className="catalog-logo">
          <div className="catalog-logo-icon" />
          NormaSport
        </div>
        <nav className="catalog-nav">
          {['Главная', 'Инфо', 'ГТО', 'Новости', 'Контакты'].map((label) => (
            <button key={label}>{label}</button>
          ))}
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

      {/* ===== HERO SECTION ===== */}
      <section className="catalog-hero">
        <div className="sun-picture" />
        <div className="hero-image-decoration" />
        <div className="sportsman-decoration" />
        <div className="ball-decoration" />
        <div className="promo-title">
          проверь свой<br />спортивный уровень!
        </div>
      </section>

      {/* ===== MAIN WRAPPER ===== */}
      <div className="catalog-wrapper">
        <main className="catalog-main">
          <div className="catalog-main-content">

            <h2 className="sport-selection-title">Выбери вид спорта для поиска норматива</h2>

            {/* Фильтр + сортировка */}
            <div className="buttons-row">
              <div className="sport-categories">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    className={`category-btn${selectedCategory === cat ? ' active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {CATEGORY_LABELS[cat] || cat}
                  </button>
                ))}
                <button className="category-btn" disabled title="ГТО пока недоступно">ГТО</button>
              </div>

              <div className="sort-dropdown">
                <button className="sort-btn" onClick={() => setSortMenuOpen((o) => !o)}>
                  <span>Сортировка</span>
                  <svg width="13" height="8" viewBox="0 0 13 8" fill="none">
                    <path d="M11.91 2.19345e-05L12.97 1.06102L7.193 6.84002C7.10043 6.93318 6.99036 7.0071 6.86911 7.05755C6.74786 7.108 6.61783 7.13397 6.4865 7.13397C6.35517 7.13397 6.22514 7.108 6.10389 7.05755C5.98264 7.0071 5.87257 6.93318 5.78 6.84002L0 1.06102L1.06 0.00102186L6.485 5.42502L11.91 2.19345e-05Z" fill="#95463D" />
                  </svg>
                </button>
                {sortMenuOpen && (
                  <div className="sort-menu">
                    {SORT_OPTIONS.map(({ value, label }) => (
                      <button
                        key={value}
                        className={`sort-menu-item${currentSort === value ? ' active' : ''}`}
                        onClick={() => { setCurrentSort(value); setSortMenuOpen(false); }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Сетка видов спорта */}
            <div className="catalog-sports-grid">
              {loading ? (
                <div className="catalog-grid-empty">Загрузка видов спорта…</div>
              ) : visibleSports.length === 0 ? (
                <div className="catalog-grid-empty">Виды спорта не найдены</div>
              ) : (
                visibleSports.map((sport) => (
                  <div
                    key={sport.id}
                    className="catalog-sport-card"
                    onClick={() => navigate(`/normatives/${sport.id}`)}
                  >
                    <div className="catalog-sport-icon">
                      {sport.image_url ? (
                        <img
                          src={sport.image_url}
                          alt={sport.name}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <span style={{ display: sport.image_url ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {sport.icon}
                      </span>
                    </div>
                    <span className="catalog-sport-name">{sport.name}</span>
                  </div>
                ))
              )}
            </div>

            {/* Новостная секция */}
            <div className="catalog-news-section">
              <div className="sport-news" />
            </div>

          </div>
        </main>
      </div>

      {/* ===== FOOTER ===== */}
      <footer className="catalog-footer">
        <div className="catalog-footer-gradient" />
        <div className="catalog-footer-inner">

          {/* Brand */}
          <div className="catalog-footer-brand">
            <svg width="11" height="18" viewBox="0 0 11 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.5 1V4M1.5 1V7M9.5 1V7M5.5 15.5L2.5 17L3 13.5L1 11.5L4 11L5.5 8L7 11L10 11.5L8 13.5L8.5 17L5.5 15.5Z" stroke="#071A14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="catalog-footer-logo">NormaSport</span>
          </div>

          {/* Navigation */}
          <div className="catalog-footer-col">
            <p className="catalog-footer-col-title">Навигация</p>
            {['Главная', 'Инфо', 'Нормативы', 'Новости'].map((label) => (
              <button key={label}>{label}</button>
            ))}
          </div>

          {/* Resources */}
          <div className="catalog-footer-col catalog-footer-resources">
            <p className="catalog-footer-col-title">Ресурсы</p>
            <a href="#">Единая всероссийская спортивная классификация (ЕВСК)</a>
            <a href="#">Требования Минспорта</a>
          </div>

          {/* Contacts */}
          <div className="catalog-footer-col catalog-footer-contacts">
            <p className="catalog-footer-col-title">Контакты</p>
            <p className="catalog-footer-contact-item">normasport.info@gmail.com</p>
            <p className="catalog-footer-contact-item">8 (800) 393-89-89</p>
            <div className="catalog-footer-socials">
              {/* Telegram */}
              <button className="catalog-footer-social-btn" aria-label="Telegram">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M21.8 3.2L2.6 10.6c-1.3.5-1.3 1.3-.2 1.6l4.9 1.5 1.9 5.7c.2.7.4.9 1 .9.5 0 .7-.2 1-.5l2.4-2.3 4.8 3.5c.9.5 1.5.2 1.7-.8l3.1-14.5c.3-1.3-.5-1.9-1.3-1.5z" fill="white"/>
                </svg>
              </button>
              {/* VK */}
              <button className="catalog-footer-social-btn" aria-label="ВКонтакте">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M13.2 17.5c-5.4 0-8.5-3.7-8.6-9.9h2.7c.1 4.5 2.1 6.5 3.7 6.9V7.6h2.6v4c1.5-.2 3.1-2 3.6-4h2.5c-.4 2.5-2.2 4.3-3.5 5 1.3.6 3.3 2.2 4 5h-2.7c-.6-1.9-2-3.3-3.8-3.5v3.5h-.5z" fill="white"/>
                </svg>
              </button>
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
}
