import { useEffect, useState, useMemo, useRef } from 'react';
import axios from 'axios';
import API_CONFIG from '../config/api';
import { getSportEmoji } from '../utils/sportEmojis';

const API = API_CONFIG.baseURL;

// CSS для анимации хэдера
const styles = `
  @keyframes slideDown {
    from {
      transform: translateY(-100%);
    }
    to {
      transform: translateY(0);
    }
  }

  .header-sticky {
    position: fixed !important;
    top: 0 !important;
    transform: translateY(-100%) !important;
    background: transparent !important;
    backdrop-filter: blur(12px) !important;
    -webkit-backdrop-filter: blur(12px) !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08) !important;
    animation: slideDown 0.2s forwards !important;
  }
`;

function CatalogHeader({ isScrolled }) {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header
      style={{
        background: 'transparent',
        padding: '20px 60px',
        paddingLeft: '118px',
        display: 'flex',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'space-between',
        border: 'none',
        position: 'absolute',
        top: 0,
        zIndex: 100,
        transition: 'background 0.3s ease',
        backdropFilter: 'blur(1px)',
        WebkitBackdropFilter: 'blur(2px)',
        // Применяем sticky стили если scrolled
        ...(isScrolled && {
          position: 'fixed',
          top: 0,
          transform: 'translateY(0)',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        }),
      }}
    >
      <div style={{
        fontFamily: "'Nunito', sans-serif",
        fontWeight: 700,
        fontSize: '30px',
        color: '#071A14',
        lineHeight: 1,
        width: '173px',
        height: '41px',
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        NormaSport
      </div>

      <nav style={{
        display: 'flex',
        gap: '50px',
        flex: 1,
        justifyContent: 'center',
      }}>
        {[
          { label: 'Главная', href: '/' },
          { label: 'Инфо', href: '#info' },
          { label: 'ГТО', href: '#gto' },
          { label: 'Новости', href: '#news' },
          { label: 'Контакты', href: '#contacts' },
        ].map(({ label }) => (
          <button
            key={label}
            style={{
              background: 'transparent',
              border: 'none',
              fontFamily: "'Nunito', sans-serif",
              fontWeight: 700,
              fontSize: '12px',
              color: '#071A14',
              textTransform: 'uppercase',
              cursor: 'pointer',
              padding: 0,
              height: '16px',
              letterSpacing: 0,
              transition: 'opacity 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            onClick={() => {}}
          >
            {label}
          </button>
        ))}
      </nav>

      <div style={{
        width: '170px',
        height: '25px',
        border: '0.5px solid #071A14',
        borderRadius: '15px',
        padding: '5px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: 'transparent',
        flexShrink: 0,
      }}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#071A14"
          strokeWidth="2"
          style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Поиск"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            border: 'none',
            background: 'transparent',
            fontFamily: "'Nunito', sans-serif",
            fontWeight: 400,
            fontSize: '12px',
            color: '#071A14',
            outline: 'none',
            flex: 1,
            width: '100%',
          }}
        />
      </div>
    </header>
  );
}

function CatalogFooter() {
  return (
    <footer style={{
      position: 'relative',
      width: '100%',
      height: '204px',
      left: 0,
      marginTop: 'auto',
      background: 'linear-gradient(185.1deg, rgba(217, 217, 217, 0) 32.19%, #259572 96.17%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <div style={{
        fontFamily: "'Oswald', sans-serif",
        fontWeight: 700,
        fontSize: '36px',
        color: '#071A14',
        opacity: 0.5,
      }}>
        NormaSport
      </div>
    </footer>
  );
}

export default function CatalogPage() {
  const [sportsData, setSportsData] = useState([]);
  const [sportsLoading, setSportsLoading] = useState(true);
  const [sportsError, setSportsError] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState('Летний олимпийский');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSort, setCurrentSort] = useState('name');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  // Состояние для отслеживания скролла хэдера
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
  const headerRef = useRef(null);
  const lastScrollYRef = useRef(0);

  // Загрузка данных спорта с API
  useEffect(() => {
    setSportsLoading(true);
    setSportsError(null);
    axios
      .get(`${API}/v_1/sports`)
      .then((response) => {
        const sports = response.data.sports ?? [];
        const mappedSports = sports.map((sport, index) => ({
          id: sport.id || `sport-${index}`,
          name: sport.name || sport.sport_name || 'Неизвестный вид спорта',
          category: sport.sport_type || 'summer',
          image_url: sport.image_url || null,
          icon: getSportEmoji(sport.sport_name, sport.sport_type),
        }));
        setSportsData(mappedSports);
      })
      .catch((error) => {
        console.error('Ошибка загрузки спорта:', error);
        // Демо-данные с правильными категориями
        setSportsData([
          { id: 'badminton', name: 'Бадминтон', category: 'Летний олимпийский', icon: '🏸' },
          { id: 'basketball', name: 'Баскетбол', category: 'Летний олимпийский', icon: '🏀' },
          { id: 'baseball', name: 'Бейсбол', category: 'Летний олимпийский', icon: '⚾' },
          { id: 'boxing', name: 'Бокс', category: 'Летний олимпийский', icon: '🥊' },
          { id: 'athletics', name: 'Легкая атлетика', category: 'Летний олимпийский', icon: '🏃' },
          { id: 'golf', name: 'Гольф', category: 'Летний олимпийский', icon: '⛳' },
          { id: 'football', name: 'Футбол', category: 'Летний олимпийский', icon: '⚽' },
          { id: 'volleyball', name: 'Волейбол', category: 'Летний олимпийский', icon: '🏐' },
          { id: 'tennis', name: 'Теннис', category: 'Летний олимпийский', icon: '🎾' },
          { id: 'judo', name: 'Дзюдо', category: 'Летний олимпийский', icon: '🥋' },

          { id: 'skiing', name: 'Лыжи', category: 'Зимний олимпийский', icon: '⛷️' },
          { id: 'skating', name: 'Фигурное катание', category: 'Зимний олимпийский', icon: '⛸️' },
          { id: 'snowboarding', name: 'Сноуборд', category: 'Зимний олимпийский', icon: '🏂' },
          { id: 'ice-hockey', name: 'Хоккей', category: 'Зимний олимпийский', icon: '🏒' },
          { id: 'curling', name: 'Керлинг', category: 'Зимний олимпийский', icon: '🥌' },

          { id: 'cheerleading', name: 'Чирлидинг', category: 'Неолимпийский', icon: '📣' },
          { id: 'parkour', name: 'Паркур', category: 'Неолимпийский', icon: '🤸' },

          { id: 'martial-arts', name: 'Боевые искусства', category: 'Военно-прикладной и служебно-прикладной', icon: '🥋' },
          { id: 'shooting', name: 'Стрельба', category: 'Военно-прикладной и служебно-прикладной', icon: '🎯' },

          { id: 'sumo', name: 'Сумо', category: 'Национальный', icon: '⭕' },
          { id: 'kabaddi', name: 'Кабадди', category: 'Национальный', icon: '👥' },

          { id: 'wheelchair-basketball', name: 'Инвалидный баскетбол', category: 'Адаптивный', icon: '♿' },
          { id: 'paraswimming', name: 'Паралимпийское плавание', category: 'Адаптивный', icon: '♿' },
        ]);
      })
      .finally(() => setSportsLoading(false));
  }, []);

  // Обработка скролла для анимации хэдера
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY || document.documentElement.scrollTop;
      const headerHeight = headerRef.current?.offsetHeight || 60;

      // Если скроллили ниже высоты хэдера + 30px
      if (currentScrollY > headerHeight + 30) {
        setIsHeaderScrolled(true);
      } else {
        setIsHeaderScrolled(false);
      }

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Маппинг категорий из API в отображаемые названия
  const categoryMapping = {
    'Летний олимпийский': { id: 'summer-olympic', label: 'Летние' },
    'Зимний олимпийский': { id: 'winter-olympic', label: 'Зимние' },
    'Неолимпийский': { id: 'non-olympic', label: 'Неолимпийские' },
    'Военно-прикладной и служебно-прикладной': { id: 'military', label: 'Военные' },
    'Национальный': { id: 'national', label: 'Национальные' },
    'Адаптивный': { id: 'adaptive', label: 'Адаптивные' },
  };

  // Уникальные категории из API
  const categories = useMemo(() => {
    const categoryList = [];
    const categorySet = new Set(sportsData.map((s) => s.category));

    // Добавляем категории в правильном порядке
    const categoryOrder = [
      'Летний олимпийский',
      'Зимний олимпийский',
      'Неолимпийский',
      'Военно-прикладной и служебно-прикладной',
      'Национальный',
      'Адаптивный',
    ];

    categoryOrder.forEach((cat) => {
      if (categorySet.has(cat)) {
        categoryList.push(cat);
      }
    });

    return categoryList;
  }, [sportsData]);

  // Фильтрованные и отсортированные виды спорта
  const filteredAndSortedSports = useMemo(() => {
    let filtered = sportsData.filter((sport) => sport.category === selectedCategory);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((sport) => sport.name.toLowerCase().includes(query));
    }

    filtered.sort((a, b) => {
      if (currentSort === 'name') {
        return a.name.localeCompare(b.name, 'ru');
      } else if (currentSort === 'popularity') {
        return Math.random() - 0.5;
      } else if (currentSort === 'recent') {
        return Math.random() - 0.5;
      }
      return 0;
    });

    return filtered;
  }, [sportsData, selectedCategory, searchQuery, currentSort]);

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
  };

  const handleSportCardClick = (sport) => {
    console.log('Выбран вид спорта:', sport.name);
    alert(`Открытие нормативов для: ${sport.name}`);
  };

  const handleSortSelect = (sortType) => {
    setCurrentSort(sortType);
    setSortMenuOpen(false);
  };

  return (
    <div style={{
      background: '#ffffff',
      color: '#071A14',
      position: 'relative',
      width: '100%',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <style>{styles}</style>

      {/* Фоновый градиент */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '1040px',
          background: 'linear-gradient(5.1deg, rgba(217, 217, 217, 0) 42.19%, #259572 96.17%)',
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />

      {/* SVG солнце - полный код */}
      <svg
        width="915"
        height="914"
        viewBox="0 0 627 922"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          position: 'absolute',
          width: '915px',
          height: '914px',
          top: '10px',
          left: '-150px',
          opacity: 0.4,
          pointerEvents: 'none',
          zIndex: 0,
          filter: 'drop-shadow(4px 4px 4px #114333)',
        }}
      >
        <g opacity="0.3" filter="url(#filter0_d_468_161)">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M-70.6558 63.368C-60.2022 57.2062 -47.7323 55.4448 -35.9895 58.4712C-24.2467 61.4976 -14.1927 69.0639 -8.03949 79.5058L14.2796 117.381L66.7597 206.438L-12.0713 252.904L-64.5514 163.847L-86.8706 125.972C-93.0238 115.53 -94.7723 103.068 -91.7314 91.3279C-88.6906 79.5873 -81.1095 69.5299 -70.6558 63.368ZM-103.192 413.875L-102.401 505.338L-205.879 506.284L-249.849 506.739C-261.983 506.858 -273.663 502.153 -282.318 493.66C-290.972 485.168 -295.893 473.583 -295.998 461.454C-296.103 449.325 -291.383 437.646 -282.877 428.986C-274.371 420.326 -262.775 415.395 -250.64 415.276L-206.647 414.86L-103.192 413.875ZM-5.91876 667.494L-56.8937 757.536L-78.5672 795.827C-81.7416 801.063 -83.8327 806.882 -84.7164 812.938C-85.6001 818.995 -85.2586 825.165 -83.712 831.084C-82.1653 837.004 -79.4451 842.551 -75.7125 847.397C-71.9799 852.244 -67.3111 856.291 -61.9826 859.299C-56.6541 862.307 -50.7745 864.214 -44.6924 864.907C-38.6102 865.601 -32.4494 865.067 -26.575 863.336C-20.7005 861.606 -15.2321 858.715 -10.4939 854.834C-5.75574 850.954 -1.84421 846.163 1.00879 840.745L22.7055 802.494L73.6804 712.451L-5.91876 667.494ZM255.944 707.717L334.775 661.25L387.255 750.308L409.574 788.182C415.727 798.624 417.476 811.086 414.435 822.827C411.394 834.567 403.813 844.625 393.359 850.787C382.906 856.949 370.436 858.71 358.693 855.684C346.95 852.657 336.896 845.091 330.743 834.649L308.424 796.774L255.944 707.717ZM425.896 500.28L529.414 499.311L573.344 498.879C579.376 498.861 585.346 497.652 590.91 495.319C596.475 492.987 601.524 489.578 605.768 485.289C610.011 480.999 613.365 475.914 615.635 470.326C617.906 464.738 619.049 458.758 618.998 452.729C618.948 446.701 617.705 440.743 615.34 435.199C612.976 429.655 609.538 424.635 605.223 420.427C600.908 416.219 595.802 412.906 590.199 410.68C584.596 408.454 578.607 407.358 572.576 407.455L528.622 407.848L425.128 408.856L425.896 500.28ZM331.304 249.64L251.705 204.683L302.68 114.64L324.353 76.3497C327.29 71.0805 331.24 66.4429 335.976 62.7037C340.711 58.9646 346.139 56.1978 351.947 54.5627C357.754 52.9277 363.827 52.4566 369.815 53.1766C375.802 53.8966 381.587 55.7934 386.836 58.758C392.085 61.7225 396.694 65.6962 400.399 70.4502C404.103 75.2042 406.829 80.6446 408.42 86.4582C410.011 92.2719 410.435 98.344 409.668 104.325C408.901 110.306 406.959 116.077 403.952 121.307L382.256 159.558L331.304 249.64Z" fill="#1B6C53" fill-opacity="0.3" shape-rendering="crispEdges" />
          <path fill-rule="evenodd" clip-rule="evenodd" d="M160.251 0C172.385 0 184.022 4.81476 192.602 13.3852C201.183 21.9556 206.003 33.5796 206.003 45.7V89.6633V193.037H114.499V89.6633V45.7C114.499 33.5796 119.32 21.9556 127.9 13.3852C136.48 4.81476 148.117 0 160.251 0ZM114.499 279.958C82.2924 288.284 52.9668 305.221 29.6757 328.949C6.2077 354.324 -5.46957 376.702 -16.1218 408.055C-25.031 440.078 -25.031 473.922 -16.1218 505.945C-5.20511 539.081 7.68207 563.886 29.6757 585.051C52.9668 608.779 82.2924 625.716 114.499 634.042C143.121 641.441 173.932 640.751 206.003 634.042C238.669 625.633 267.859 608.404 290.826 585.097C308.516 564.089 327.821 540.459 336.624 505.945C345.542 473.907 345.542 440.047 336.624 408.01C328.748 378.944 310.282 347.582 290.826 328.903C267.859 305.55 238.715 288.367 206.003 279.958C174.473 274.04 143.265 273.818 114.499 279.958ZM-44.9256 632.486L-90.6774 553.334L-180.305 605.021L-218.416 627.002C-223.809 629.901 -228.565 633.852 -232.401 638.621C-236.237 643.39 -239.075 648.879 -240.748 654.764C-242.42 660.649 -242.893 666.81 -242.138 672.88C-241.383 678.951 -239.415 684.809 -236.351 690.106C-233.288 695.403 -229.191 700.031 -224.303 703.717C-219.415 707.403 -213.836 710.072 -207.897 711.564C-201.958 713.057 -195.779 713.343 -189.727 712.406C-183.675 711.469 -177.873 709.327 -172.664 706.109L-134.553 684.173L-44.9256 632.486ZM-135.351 233.755L-45.7232 285.442L-91.4749 364.64L-181.103 312.908L-219.214 290.972C-229.728 284.912 -237.401 274.928 -240.546 263.216C-243.691 251.505 -242.049 239.025 -235.982 228.523C-229.915 218.021 -219.919 210.356 -208.195 207.215C-196.47 204.074 -183.976 205.714 -173.462 211.774L-135.351 233.755ZM411.977 364.595L366.225 285.442L455.853 233.755L493.964 211.774C499.17 208.726 504.927 206.736 510.905 205.92C516.883 205.103 522.964 205.476 528.797 207.016C534.63 208.557 540.101 211.235 544.894 214.896C549.687 218.557 553.708 223.128 556.725 228.348C559.742 233.567 561.695 239.331 562.473 245.308C563.251 251.285 562.837 257.356 561.256 263.172C559.676 268.989 556.958 274.435 553.262 279.198C549.565 283.962 544.961 287.947 539.716 290.926L501.605 312.862L411.977 364.595ZM366.225 628.558L455.899 680.29L493.964 702.226C499.17 705.274 504.927 707.264 510.905 708.08C516.883 708.897 522.964 708.524 528.797 706.983C534.63 705.443 540.101 702.765 544.894 699.104C549.687 695.443 553.708 690.872 556.725 685.652C559.742 680.433 561.695 674.669 562.473 668.692C563.251 662.715 562.837 656.644 561.256 650.828C559.676 645.011 556.958 639.565 553.262 634.802C549.565 630.038 544.961 626.052 539.716 623.074L501.651 601.092L411.977 549.405L366.225 628.558ZM114.499 720.963H206.003V824.337V868.3C206.003 880.42 201.183 892.044 192.602 900.615C184.022 909.185 172.385 914 160.251 914C148.117 914 136.48 909.185 127.9 900.615C119.32 892.044 114.499 880.42 114.499 868.3V824.337V720.963Z" fill="#1B6C53" fill-opacity="0.3" shape-rendering="crispEdges" />
        </g>
        <defs>
          <filter id="filter0_d_468_161" x="-296" y="0" width="923" height="922" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feOffset dx="4" dy="4" />
            <feGaussianBlur stdDeviation="2" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.0666667 0 0 0 0 0.262745 0 0 0 0 0.2 0 0 0 1 0" />
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_468_161" />
            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_468_161" result="shape" />
          </filter>
        </defs>
      </svg>

      {/* Hero image decoration */}
      <div
        style={{
          position: 'absolute',
          width: '1200px',
          height: '808px',
          right: '-255px',
          top: '-60px',
          background: 'url("https://mirzemlyaniki.ru/pics/sportnormative_pics/image.png") no-repeat center/cover',
          mixBlendMode: 'darken',
          transform: 'matrix(0, -1, -1, 0, 0, 0)',
          pointerEvents: 'none',
          opacity: 0.15,
          zIndex: 0,
          scale: 0.85,
        }}
      />

      {/* Промо-текст */}
      <div
        style={{
          width: '1080px',
          height: '230px',
          position: 'absolute',
          fontFamily: "'Inter', sans-serif",
          fontWeight: 900,
          fontSize: '88px',
          lineHeight: '1.18',
          textTransform: 'uppercase',
          letterSpacing: '-0.04em',
          color: '#114333',
          top: '153px',
          marginLeft: '118px',
          opacity: 0.8,
          transform: 'scaleX(0.81)',
          transformOrigin: 'left',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        проверь свой<br />
        спортивный уровень!
      </div>

      {/* Ball decoration */}
      <div
        style={{
          position: 'absolute',
          width: '101px',
          height: '101px',
          top: '69px',
          left: '1013px',
          background: 'url("https://mirzemlyaniki.ru/pics/sportnormative_pics/summer/ball.png") no-repeat center/contain',
          opacity: 1,
          zIndex: 110,
          pointerEvents: 'none',
        }}
      />

      {/* Sportsman decoration */}
      <div
        style={{
          position: 'absolute',
          width: '532.68px',
          height: '628.75px',
          top: '170.32px',
          left: '790px',
          background: 'url("https://mirzemlyaniki.ru/pics/sportnormative_pics/summer/sportsman.png") no-repeat center/contain',
          transform: 'matrix(-0.99, -0.14, -0.14, 0.99, 0, 0)',
          opacity: 1,
          zIndex: 10,
          pointerEvents: 'none',
        }}
      />

      <CatalogHeader ref={headerRef} isScrolled={isHeaderScrolled} />

      <main
        style={{
          flex: 1,
          padding: '10px',
          margin: '0 0',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Error state */}
        {sportsError && (
          <div
            style={{
              background: '#fff0f0',
              border: '1px solid #fca5a5',
              color: '#b91c1c',
              borderRadius: '12px',
              padding: '16px 24px',
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{sportsError}</span>
            <button
              onClick={() => {
                setSportsError(null);
                setSportsLoading(true);
              }}
              style={{
                fontSize: '14px',
                textDecoration: 'underline',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#b91c1c',
              }}
            >
              Попробовать снова
            </button>
          </div>
        )}

        {/* Sport selection title */}
        <h2
          style={{
            position: 'absolute',
            width: '782px',
            height: '40px',
            left: '157px',
            top: '980px',
            fontFamily: "'Nunito', sans-serif",
            fontWeight: 900,
            fontSize: '36px',
            lineHeight: '110%',
            color: '#071A14',
            textAlign: 'left',
            margin: 0,
          }}
        >
          Выбери вид спорта для поиска норматива
        </h2>

        {/* Sport categories */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            padding: '0px',
            gap: '20px',
            position: 'absolute',
            width: '920px',
            height: '38px',
            left: '157px',
            top: '1050px',
          }}
        >
          {/* Кнопки категорий */}
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryClick(category)}
              style={{
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '10px 20px',
                gap: '10px',
                minWidth: '110px',
                width: 'auto',
                height: '38px',
                background: selectedCategory === category ? '#FFD5D0' : '#FFFFFF',
                border: '1px solid #95463D',
                borderRadius: '15px',
                fontFamily: "'Nunito', sans-serif",
                fontWeight: 400,
                fontSize: '16px',
                lineHeight: '110%',
                color: '#95463D',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  selectedCategory === category ? '#ffc9c2' : '#fff5f3';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  selectedCategory === category ? '#FFD5D0' : '#FFFFFF';
              }}
            >
              {categoryMapping[category]?.label || category}
            </button>
          ))}

          {/* Кнопка ГТО (без действия) */}
          <button
            style={{
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '10px 20px',
              gap: '10px',
              minWidth: '110px',
              width: 'auto',
              height: '38px',
              background: '#FFFFFF',
              border: '1px solid #95463D',
              borderRadius: '15px',
              fontFamily: "'Nunito', sans-serif",
              fontWeight: 400,
              fontSize: '16px',
              lineHeight: '110%',
              color: '#95463D',
              whiteSpace: 'nowrap',
              cursor: 'not-allowed',
              opacity: 0.6,
              transition: 'all 0.2s ease',
            }}
            disabled
            title="ГТО пока недоступно"
          >
            ГТО
          </button>
        </div>

        {/* Sort dropdown */}
        <div
          style={{
            position: 'absolute',
            width: '134.97px',
            height: '38px',
            left: '1147px',
            top: '1050px',
          }}
        >
          <button
            onClick={() => setSortMenuOpen(!sortMenuOpen)}
            style={{
              width: '100%',
              height: '100%',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'row',
              borderRadius: '0px',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px',
              gap: '10px',
              background: '#FFFFFF',
              border: '1px solid #95463D',
              cursor: 'pointer',
              fontFamily: "'Nunito', sans-serif",
              fontWeight: 600,
              fontSize: '16px',
              lineHeight: '110%',
              color: '#95463D',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fff5f3';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FFFFFF';
            }}
          >
            <span style={{ width: '92px', height: '18px', display: 'flex', alignItems: 'center' }}>
              Сортировка
            </span>
            <svg
              width="13"
              height="8"
              viewBox="0 0 13 8"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ flexShrink: 0 }}
            >
              <path
                d="M11.91 2.19345e-05L12.97 1.06102L7.193 6.84002C7.10043 6.93318 6.99036 7.0071 6.86911 7.05755C6.74786 7.108 6.61783 7.13397 6.4865 7.13397C6.35517 7.13397 6.22514 7.108 6.10389 7.05755C5.98264 7.0071 5.87257 6.93318 5.78 6.84002L0 1.06102L1.06 0.00102186L6.485 5.42502L11.91 2.19345e-05Z"
                fill="#95463D"
              />
            </svg>
          </button>

          {/* Sort menu */}
          {sortMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                width: '100%',
                background: 'white',
                border: '1px solid #95463D',
                borderRadius: '8px',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                marginTop: '8px',
                zIndex: 50,
              }}
            >
              {[
                { value: 'name', label: 'По названию' },
                { value: 'popularity', label: 'По популярности' },
                { value: 'recent', label: 'Новое' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleSortSelect(value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: currentSort === value ? '#fff5f3' : 'white',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontFamily: "'Nunito', sans-serif",
                    fontSize: '14px',
                    color: '#95463D',
                    transition: 'background 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#fff5f3';
                  }}
                  onMouseLeave={(e) => {
                    if (currentSort !== value) {
                      e.currentTarget.style.background = 'white';
                    }
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sports grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, 192px)',
            gap: '30px',
            justifyContent: 'center',
            margin: '1100px 157px 50px 157px',
          }}
          id="sports-grid"
        >
          {sportsLoading ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
              Загрузка видов спорта...
            </div>
          ) : filteredAndSortedSports.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
              Виды спорта не найдены
            </div>
          ) : (
            filteredAndSortedSports.map((sport) => (
              <div
                key={sport.id}
                onClick={() => handleSportCardClick(sport)}
                style={{
                  width: '192px',
                  height: '192px',
                  background: '#F9FFFC',
                  borderRadius: '10px',
                  padding: '15px 20px',
                  boxShadow: '3px 3px 7px 0px #071A14',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '5px 5px 12px 0px #071A14';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '3px 3px 7px 0px #071A14';
                }}
              >
                <div
                  style={{
                    fontSize: '48px',
                    width: '98px',
                    height: '110px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {sport.image_url ? (
                    <img
                      src={sport.image_url}
                      alt={sport.name}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextSibling.style.display = 'flex';
                      }}
                      style={{ width: '80px', height: '80px', objectFit: 'contain' }}
                    />
                  ) : null}
                  <span
                    style={{
                      display: sport.image_url ? 'none' : 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      height: '100%',
                    }}
                  >
                    {sport.icon}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: "'Nunito', sans-serif",
                    fontWeight: 700,
                    fontSize: '16px',
                    color: '#1B6C53',
                    lineHeight: 1.2,
                  }}
                >
                  {sport.name}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Records title section */}
        <div
          style={{
            position: 'relative',
            width: '1184px',
            height: '427px',
            left: '107px',
            background: 'url("https://mirzemlyaniki.ru/pics/sportnormative_pics/records_title.png") no-repeat center/contain',
            zIndex: 10,
            marginTop: '50px',
            marginBottom: '50px',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'rgba(37, 149, 114, 0.1)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#259572',
              fontSize: '18px',
              fontWeight: 600,
            }}
          >
            Рекорды
          </div>
        </div>

        {/* Sport news section */}
        <div
          style={{
            marginTop: '80px',
            position: 'relative',
            width: '1154px',
            height: '418px',
            left: '157px',
            background: 'url("https://mirzemlyaniki.ru/pics/sportnormative_pics/news_title.png") no-repeat center/cover',
            zIndex: 10,
            marginBottom: '50px',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'rgba(37, 149, 114, 0.1)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#259572',
              fontSize: '18px',
              fontWeight: 600,
            }}
          >
            Новости спорта
          </div>
        </div>
      </main>

      <CatalogFooter />
    </div>
  );
}