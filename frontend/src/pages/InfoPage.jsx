import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CatalogPage.css';
import './InfoPage.css';

const RANKS = [
  'III юношеский разряд',
  'II юношеский разряд',
  'I юношеский разряд',
  'III спортивный разряд',
  'II спортивный разряд',
  'I спортивный разряд',
];

const TITLES = [
  'Кандидат в мастера спорта (КМС)',
  'Мастер спорта России (МС)',
  'Мастер спорта международного класса (МСМК)',
  'Заслуженный мастер спорта России (ЗМС)',
];

const USEFUL_LINKS = [
  {
    iconBg: '#E8820C',
    iconText: 'ГТО',
    text: 'Информация о ГТО в регионах России',
    href: 'https://gto.ru',
  },
  {
    iconBg: '#2D6DB5',
    iconText: 'ГТО',
    text: 'Центры тестирования ВФСК ГТО в Санкт-Петербурге',
    href: 'https://gto-spb.ru',
  },
  {
    iconBg: '#C0392B',
    iconText: '🔥',
    text: 'Информация о сдаче ГТО в Москве',
    href: 'https://mos.ru',
  },
  {
    iconBg: '#7F8C8D',
    iconText: '⚖',
    text: 'Нормативные акты ЕВСК Министерства Спорта России',
    href: 'https://minsport.gov.ru',
  },
  {
    iconBg: '#2980B9',
    iconText: '🏛',
    text: 'Спортивные комплексы в Санкт-Петербурге',
    href: 'https://kzs.ru',
  },
  {
    iconBg: '#95868A',
    iconText: '📋',
    text: 'Положение о Единой Всероссийской Спортивной Классификации',
    href: 'https://minsport.gov.ru',
  },
];

export default function InfoPage() {
  const navigate = useNavigate();
  const [isSticky, setIsSticky] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const onScroll = () => setIsSticky(window.scrollY > 90);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="catalog-page info-page">

      {/* ===== HEADER ===== */}
      <header className={`catalog-header${isSticky ? ' sticky' : ''}`}>
        <div className="catalog-logo">
          <div className="catalog-logo-icon" />
          NormaSport
        </div>
        <nav className="catalog-nav">
          <button onClick={() => navigate('/catalog')}>Главная</button>
          <button className="info-nav-active">Инфо</button>
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

      {/* ===== HERO ===== */}
      <section className="info-hero">
        <div className="info-hero-gradient" />

        <div className="info-hero-content">
          <h1 className="info-hero-title">
            Спортивные<br />нормативы
          </h1>
          <p className="info-hero-subtitle">
            Термин означает стандарты, которые устанавливают требования к физической
            подготовке и результатам в различных видах спорта.<br />
            Сайт предназначен для быстрого и удобного поиска спортивных нормативов по
            категориям и видам спорта.
          </p>
          <div className="info-hero-buttons">
            <button className="info-btn-primary" onClick={() => navigate('/catalog')}>
              Спортивные нормативы
            </button>
            <button className="info-btn-secondary">
              Нормативы ГТО
            </button>
          </div>
        </div>

        <div className="info-hero-image-area">
          <div className="info-hero-dots" />
          {/* Замените background-image в InfoPage.css (.info-hero-photo) на URL фото баскетбольной корзины */}
          <div className="info-hero-photo" />
        </div>
      </section>

      {/* ===== EVSK SECTION ===== */}
      <section className="info-evsk-section">
        <div className="info-evsk-inner">

          <div className="info-evsk-left">
            {/* Замените background-image в InfoPage.css (.info-evsk-photo) на URL фото спринтеров */}
            <div className="info-evsk-photo" />
            <p className="info-evsk-caption">
              Единая всероссийская спортивная классификация (ЕВСК) —
              нормативный документ, определяющий порядок присвоения и
              подтверждения спортивных знаний и разрядов в Российской
              Федерации.
            </p>
          </div>

          <div className="info-evsk-right">
            <p className="info-evsk-intro">
              Спортивные нормативы в Российской Федерации подразделяются
              на звания и разряды. Это разделение закреплено в ЕВСК.
            </p>

            <div className="info-evsk-grid">
              <div className="info-evsk-col">
                <h3 className="info-evsk-col-title">Разряды</h3>
                <ul className="info-evsk-list">
                  {RANKS.map((r) => <li key={r}>{r}</li>)}
                </ul>
              </div>
              <div className="info-evsk-col">
                <h3 className="info-evsk-col-title">Звания</h3>
                <ul className="info-evsk-list">
                  {TITLES.map((t) => <li key={t}>{t}</li>)}
                </ul>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ===== USEFUL LINKS ===== */}
      <section className="info-links-section">
        <div className="info-links-inner">
          <h2 className="info-links-title">Полезные ссылки</h2>
          <div className="info-links-grid">
            {USEFUL_LINKS.map((link) => (
              <a
                key={link.text}
                href={link.href}
                className="info-link-card"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div
                  className="info-link-icon"
                  style={{ background: link.iconBg }}
                >
                  <span>{link.iconText}</span>
                </div>
                <span className="info-link-text">{link.text}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="catalog-footer">
        <div className="info-footer-gradient catalog-footer-gradient" />
        <div className="catalog-footer-inner">

          <div className="catalog-footer-brand">
            <svg width="11" height="18" viewBox="0 0 11 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.5 1V4M1.5 1V7M9.5 1V7M5.5 15.5L2.5 17L3 13.5L1 11.5L4 11L5.5 8L7 11L10 11.5L8 13.5L8.5 17L5.5 15.5Z" stroke="#071A14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="catalog-footer-logo">NormaSport</span>
          </div>

          <div className="catalog-footer-col">
            <p className="catalog-footer-col-title">Навигация</p>
            {['Главная', 'Инфо', 'Нормативы', 'Новости'].map((label) => (
              <button key={label}>{label}</button>
            ))}
          </div>

          <div className="catalog-footer-col catalog-footer-resources">
            <p className="catalog-footer-col-title">Ресурсы</p>
            <a href="#">Единая всероссийская спортивная классификация (ЕВСК)</a>
            <a href="#">Требования Минспорта</a>
          </div>

          <div className="catalog-footer-col catalog-footer-contacts">
            <p className="catalog-footer-col-title">Контакты</p>
            <p className="catalog-footer-contact-item">normasport.info@gmail.com</p>
            <p className="catalog-footer-contact-item">8 (800) 393-89-89</p>
            <div className="catalog-footer-socials">
              <button className="catalog-footer-social-btn" aria-label="Telegram">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M21.8 3.2L2.6 10.6c-1.3.5-1.3 1.3-.2 1.6l4.9 1.5 1.9 5.7c.2.7.4.9 1 .9.5 0 .7-.2 1-.5l2.4-2.3 4.8 3.5c.9.5 1.5.2 1.7-.8l3.1-14.5c.3-1.3-.5-1.9-1.3-1.5z" fill="white"/>
                </svg>
              </button>
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
