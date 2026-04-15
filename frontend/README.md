# NormaSport — Frontend

React-приложение для просмотра и управления спортивными нормативами.

---

## Технологии

| Инструмент | Версия | Назначение |
|---|---|---|
| React | 19 | UI-фреймворк |
| Vite | 7 | Сборщик и dev-сервер |
| React Router DOM | 7 | Клиентская маршрутизация |
| Axios | 1.x | HTTP-запросы к API |
| Tailwind CSS | 3.x | Утилитарные стили |
| @headlessui/react | 2.x | Доступные UI-примитивы |
| @heroicons/react | 2.x | Иконки |

---

## Запуск

```bash
npm install
npm run dev        # dev-сервер на http://localhost:5173
npm run build      # production-сборка в dist/
npm run preview    # предпросмотр production-сборки
```

---

## Структура проекта

```
src/
├── config/
│   └── api.js                    # базовый URL API
├── utils/
│   ├── sportEmojis.js            # маппинг эмодзи по названию/типу спорта
│   └── rankColors.js             # цвета разрядов + порядок сортировки
├── pages/
│   └── CatalogPage.jsx           # публичный каталог нормативов (/catalog)
└── components/
    ├── catalog/                  # компоненты публичного каталога
    │   ├── CategoryFilter.jsx    # кнопки фильтрации по типу спорта
    │   ├── SportsGrid.jsx        # сетка карточек видов спорта
    │   ├── SportCard.jsx         # отдельная карточка вида спорта
    │   ├── DisciplineList.jsx    # список дисциплин выбранного спорта
    │   ├── NormativesTable.jsx   # таблица нормативов по дисциплине
    │   └── ConditionTree.jsx     # рекурсивный рендер иерархических условий
    ├── DisciplinesManager.jsx    # управление дисциплинами (админ)
    ├── ParameterManager.jsx      # управление параметрами (админ)
    ├── ParamTypeManager.jsx      # управление типами параметров (админ)
    ├── RequirementManager.jsx    # управление требованиями (админ)
    ├── LinkManager.jsx           # привязка параметров к дисциплинам (админ)
    ├── NormativeManager.jsx      # добавление нормативов (админ)
    └── NormativePage.jsx         # просмотр нормативов по виду спорта
```

---

## Маршруты

| Путь | Компонент | Описание |
|---|---|---|
| `/` | `MainApp` (в App.jsx) | Административный интерфейс управления справочниками |
| `/catalog` | `CatalogPage` | Публичный каталог: выбор категории → спорта → дисциплины → нормативы |
| `/normatives/:sport_id` | `NormativePage` | Просмотр всех нормативов вида спорта с фильтрами |

---

## Связь с API

Базовый URL задан в `src/config/api.js`:

```js
export const API_CONFIG = { baseURL: "http://localhost:8000" };
```

Все компоненты импортируют его напрямую и используют через Axios:

```js
import API_CONFIG from '../config/api';
import axios from 'axios';

const API = API_CONFIG.baseURL;
axios.get(`${API}/v_1/sports`);
```

### Используемые эндпоинты

#### Виды спорта

| Метод | Путь | Используется в | Описание |
|---|---|---|---|
| GET | `/sports` | `MainApp` | Плоский список всех видов спорта (для выпадающего списка в админке) |
| GET | `/v_1/sports` | `CatalogPage` | Виды спорта с `sport_type` и дисциплинами (только активные акты) |

#### Дисциплины

| Метод | Путь | Используется в | Описание |
|---|---|---|---|
| GET | `/disciplines?sport_id=` | `MainApp` | Дисциплины вида спорта (для управления в админке) |
| GET | `/v_2/sports/{sport_id}/disciplines` | `CatalogPage` | Дисциплины с датами актов (`start_date`, `end_date`) |
| POST | `/disciplines` | `DisciplinesManager` | Создание дисциплин |
| DELETE | `/disciplines/{id}` | `DisciplinesManager` | Удаление дисциплины |

#### Нормативы

| Метод | Путь | Используется в | Описание |
|---|---|---|---|
| GET | `/sports/{sport_id}/normatives` | `NormativePage` | Все нормативы вида спорта (плоская структура с фильтрами) |
| GET | `/v_1/disciplines/{discipline_id}/normatives` | `CatalogPage` | Нормативы дисциплины с иерархическими условиями |
| POST | `/normatives` | `NormativeManager` | Создание нормативов (пакетное, по разрядам) |
| DELETE | `/normative/{id}` | `NormativePage` | Удаление норматива |

#### Справочники (только в админке)

| Метод | Путь | Компонент |
|---|---|---|
| GET/POST | `/parameter_types`, `/parameter-types` | `ParamTypeManager` |
| GET/POST | `/parameters` | `ParameterManager` |
| GET/POST/DELETE | `/requirements` | `RequirementManager` |
| GET | `/requirement_types` | `RequirementManager` |
| GET | `/ranks` | `NormativeManager` |
| GET | `/discipline-parameters/{id}` | `LinkManager` |
| POST/DELETE | `/link-parameters` | `LinkManager` |

---

## Публичный каталог (`/catalog`)

Реализует трёхуровневый drill-down без изменения URL:

```
Виды спорта (с фильтром по категории)
  └── Дисциплины выбранного спорта
        └── Таблица нормативов дисциплины
```

Всё состояние хранится в `CatalogPage.jsx`:

```
sports              []          — загружается один раз при монтировании
selectedCategory    string|null — null = "Все"
selectedSport       object|null — содержит id, sport_name, sport_type
disciplines         []          — загружаются при выборе вида спорта
selectedDiscipline  object|null — содержит discipline_id, discipline_name
normativesData      object|null — загружаются при выборе дисциплины
```

**Цепочка загрузки данных:**

1. Монтирование → `GET /v_1/sports` → заполняются `sports`, из `sport_type` выводятся уникальные категории
2. Выбор вида спорта → `GET /v_2/sports/{id}/disciplines` → заполняются `disciplines`
3. Выбор дисциплины → `GET /v_1/disciplines/{id}/normatives` → заполняется `normativesData`
4. Смена категории → фильтрация `sports` на клиенте, сброс выбора спорта/дисциплины

### Таблица нормативов (`NormativesTable`)

Нормативы одной дисциплины могут иметь разные комбинации параметров (например, «Пол: Мужчины» и «Пол: Женщины»). Каждая комбинация отображается отдельным блоком.

Внутри блока строится матрица:
- **Колонки** — разряды, отсортированные по престижу: МСМК → МС → КМС → I → II → III → I юн. → II юн. → III юн.
- **Строки** — названия условий (например, «Результат», «Соревнование»)
- **Ячейки** — значение норматива для данного разряда и условия

Иерархические условия (поле `additional[]` в ответе API) отображаются через рекурсивный компонент `ConditionTree` с визуальными отступами и цветными бейджами по типу (`norm` — зелёный, `comp` — синий, `other` — серый).

---

## Утилиты

### `src/utils/rankColors.js`

```js
import { getRankColor, RANK_ORDER } from '../utils/rankColors';

getRankColor('МС')   // → 'bg-red-100 text-red-800 border-red-200'
RANK_ORDER           // → ['МСМК', 'МС', 'КМС', 'I', ...]
```

Используется в `NormativesTable` и `NormativePage`.

### `src/utils/sportEmojis.js`

```js
import { getSportEmoji } from '../utils/sportEmojis';

getSportEmoji('Бадминтон', 'Летние')  // → '🏸'
getSportEmoji('Неизвестный', 'Зимние') // → '❄️'  (fallback по типу)
getSportEmoji('Совсем новый', null)    // → '🏆'  (дефолт)
```

Поиск: точное совпадение по названию → частичное вхождение → тип → `🏆`.

---

## Стилизация

Используется Tailwind CSS с произвольными значениями (без изменений в конфиге):

```
Основной зелёный:  #3A9B6F
Тёмный зелёный:   #2D7F5F
Фон каталога:     #F5F9F4
```

Страница `/catalog` переопределяет тёмный фон из `index.css` через `bg-[#F5F9F4] text-gray-900` на корневом элементе.
