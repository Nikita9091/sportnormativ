# NormaSport — Система спортивных нормативов

Веб-приложение для просмотра и управления спортивными нормативами Российской Федерации на основе данных Единой всероссийской спортивной классификации (ЕВСК) Министерства спорта.

---

## Содержание

1. [Общее описание](#общее-описание)
2. [Архитектура системы](#архитектура-системы)
3. [Технологический стек](#технологический-стек)
4. [Структура репозитория](#структура-репозитория)
5. [База данных](#база-данных)
6. [Backend (FastAPI)](#backend-fastapi)
7. [Frontend (React)](#frontend-react)
8. [Инфраструктура](#инфраструктура)
9. [Локальная разработка](#локальная-разработка)
10. [Деплой на сервер](#деплой-на-сервер)

---

## Общее описание

NormaSport — это информационная система двойного назначения:

- **Публичная часть** — каталог спортивных нормативов с трёхуровневым drill-down: категория спорта → вид спорта → дисциплина → таблица нормативов.
- **Административная часть** — интерфейс для ручного управления справочниками: видами спорта, дисциплинами, параметрами, разрядами, требованиями и нормативами.

Нормативы охватывают разряды от III юношеского до Заслуженного мастера спорта России и включают как квалификационные (результат), так и соревновательные (место на соревнованиях) требования. Данные загружаются в базу отдельными скриптами, которые парсят Excel-файлы приказов Минспорта.

---

## Архитектура системы

```
                           Интернет
                              │
                         ┌────▼─────┐
                         │ Traefik  │  :80 → :443 редирект
                         │  v2.10   │  Let's Encrypt TLS
                         └────┬─────┘
                              │ HTTPS
                    ┌─────────▼──────────┐
                    │   Nginx + React     │  :80 (внутри Docker)
                    │   (frontend SPA)    │
                    │                     │
                    │  /          → React │
                    │  /api/*     → proxy │
                    └─────────┬───────────┘
                              │ http://backend:8000
                    ┌─────────▼───────────┐
                    │  FastAPI + Uvicorn   │  :8000 (внутри Docker)
                    │     (backend)        │
                    └─────────┬───────────┘
                              │ psycopg2
                    ┌─────────▼───────────┐
                    │    PostgreSQL        │  удалённый сервер
                    │   (внешний хост)     │
                    └─────────────────────┘
```

Все три Docker-сервиса (`traefik`, `frontend`, `backend`) работают в одной bridge-сети `sportnormativ-net`. PostgreSQL — внешний, не контейнеризован.

---

## Технологический стек

### Backend

| Компонент | Версия | Роль |
|-----------|--------|------|
| Python | 3.10 | Язык |
| FastAPI | latest | REST API фреймворк |
| Uvicorn | latest | ASGI-сервер |
| psycopg2-binary | latest | Драйвер PostgreSQL |

### Frontend

| Компонент | Версия | Роль |
|-----------|--------|------|
| React | 19 | UI-фреймворк |
| Vite | 7 | Сборщик и dev-сервер |
| React Router DOM | 7 | Клиентский роутинг |
| Axios | 1.x | HTTP-клиент |
| Tailwind CSS | 3.x | Утилитарные стили |

### Инфраструктура

| Компонент | Версия | Роль |
|-----------|--------|------|
| Docker Compose | 3.8 | Оркестрация контейнеров |
| Traefik | 2.10 | Reverse proxy, TLS (Let's Encrypt) |
| Nginx | 1.23 | Раздача статики + проксирование API |
| PostgreSQL | 14+ | База данных (внешний хост) |

---

## Структура репозитория

```
sportnormativ/
├── docker-compose.yml          # Оркестрация: Traefik + Backend + Frontend
├── traefik.yml                 # Конфиг Traefik: entrypoints, ACME TLS
├── acme.json                   # Let's Encrypt сертификаты (генерируется автоматически)
├── .htpasswd                   # Пароль для дашборда Traefik
│
├── backend/
│   ├── app.py                  # Весь бэкенд (~1600 строк): маршруты, логика, БД
│   ├── requirements.txt        # Python-зависимости
│   └── Dockerfile              # python:3.10-slim + pip + uvicorn
│
└── frontend/
    ├── Dockerfile              # node:18 build → nginx:1.23 runtime
    ├── nginx.conf              # Nginx: статика React + proxy /api/ → backend
    ├── vite.config.js
    ├── tailwind.config.js      # darkMode: 'class' (отключён)
    ├── package.json
    └── src/
        ├── App.jsx             # Корневой роутер
        ├── index.css           # Глобальные стили (light-only)
        ├── config/
        │   └── api.js          # Базовый URL API
        ├── utils/
        │   ├── rankColors.js   # Цвета и порядок разрядов
        │   └── sportEmojis.js  # Эмодзи для видов спорта
        ├── pages/
        │   ├── CatalogPage.jsx # Публичный каталог
        │   ├── CatalogPage.css # Стили каталога (темы по категориям)
        │   ├── InfoPage.jsx    # Страница /info
        │   └── InfoPage.css
        └── components/
            ├── NormativePage.jsx       # Просмотр нормативов вида спорта
            ├── DisciplinesManager.jsx  # Админ: дисциплины
            ├── NormativeManager.jsx    # Админ: добавление нормативов
            ├── ParameterManager.jsx    # Админ: параметры
            ├── ParamTypeManager.jsx    # Админ: типы параметров
            ├── RequirementManager.jsx  # Админ: требования
            ├── LinkManager.jsx         # Админ: связи дисциплина × параметр
            └── catalog/
                ├── DisciplineList.jsx  # Список дисциплин
                ├── NormativesTable.jsx # Матрица нормативов
                └── ConditionTree.jsx   # Рекурсивный рендер условий
```

---

## База данных

PostgreSQL. Схема хранится в `sportnormativ_bd_schema.sql`.

### Диаграмма связей (упрощённо)

```
ref_sport_types ←── ref_sports ←── sport_ministry_act ←── ref_disciplines
                                                                │
                                              lnk_discipline_parameters ──→ ref_parameters
                                                        │                         │
                                                        │                    ref_parameters_types
                                                        ↓
                                                     groups ──→ normatives ──→ ref_ranks
                                                                    │
                                                                conditions ──→ ref_requirements
                                                                  (parent_id)       │
                                                                             ref_requirements_types
```

### Таблицы

#### Справочники видов спорта

| Таблица | Описание |
|---------|----------|
| `ref_sport_types` | Типы спорта: «Летний олимпийский», «Зимний олимпийский», «Национальный» и др. |
| `ref_sports` | Виды спорта (`sport_name`, `sport_code`, `image_url`, FK → `ref_sport_types`) |
| `sport_ministry_act` | Приказы Минспорта (`start_date`, `end_date`, `act_details`, FK → `ref_sports`). `end_date IS NULL` означает действующий акт. |
| `ref_disciplines` | Дисциплины вида спорта (`discipline_name`, `discipline_code`, FK → `sport_ministry_act`) |

#### Параметры дисциплин

| Таблица | Описание |
|---------|----------|
| `ref_parameters_types` | Типы параметров: «Пол», «Возраст», «Программа» и др. |
| `ref_parameters` | Значения параметров: «Мужчины», «Женщины», «до 18 лет» и др. (FK → `ref_parameters_types`) |
| `lnk_discipline_parameters` | Связь многие-ко-многим: дисциплина × параметр |

#### Требования и разряды

| Таблица | Описание |
|---------|----------|
| `ref_requirements_types` | Типы требований: `1` — нормативное (`norm`), `2` — соревновательное (`comp`) |
| `ref_requirements` | Требования: «Результат», «Место на соревнованиях» и др. (`requirement_value`, `description`, FK → `ref_requirements_types`) |
| `ref_ranks` | Разряды (`short_name`, `full_name`, `prestige`). Поле `prestige` определяет порядок сортировки: МСМК(9) → МС(8) → КМС(7) → I(6) → ... → III юн.(1) |

#### Нормативы

| Таблица | Описание |
|---------|----------|
| `normatives` | Единица норматива: привязан к одному разряду (`rank_id`) |
| `groups` | Связывает норматив с конкретным набором параметров дисциплины (FK → `normatives`, FK → `lnk_discipline_parameters`). UNIQUE по паре `(normative_id, discipline_parameter_id)` |
| `conditions` | Значение норматива для конкретного требования (`condition` — строка, FK → `normatives`, FK → `ref_requirements`). `parent_id` — самоссылка для иерархических условий (например, разбивка по городам внутри соревнования) |

### Логика нормативной записи

Один норматив (строка в `normatives`) описывает требования для **одного разряда** при **конкретных параметрах** (пол, возраст и т.д.):

```
normative (rank=МС)
  └── groups → lnk_discipline_parameters (дисциплина=«100 м», параметр=«Мужчины»)
  └── conditions:
        ├── {requirement=«Результат», condition=«10.28», parent_id=NULL}
        └── {requirement=«Соревнование», condition=«ЧР, Кубок России», parent_id=NULL}
              └── {requirement=«Минимум участников», condition=«8», parent_id=<id выше>}
```

---

## Backend (FastAPI)

Весь бэкенд — один файл `backend/app.py`. CORS разрешён для `localhost:5173`, `localhost:4173` и доменов `sportnormativ.ru`.

### Конфигурация БД

Параметры подключения к PostgreSQL заданы в константе `DB_CONFIG` в `app.py`. Каждый запрос открывает соединение через `psycopg2` и закрывает в `finally`. Используется `RealDictCursor` (результаты как словари).

### API — эндпоинты

#### Виды спорта

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/sports` | Плоский список всех видов спорта (поле `type_name`) |
| GET | `/v_1/sports` | Виды спорта из действующих актов + вложенный список дисциплин (поле `sport_type`) |
| GET | `/v_2/sports` | Виды спорта из действующих актов, **без дисциплин**. Поддерживает ETag-кеширование (TTL 5 мин на сервере + `Cache-Control: no-cache` для браузера) |

#### Дисциплины

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/v_2/sports/{sport_id}/disciplines` | Дисциплины вида спорта. По умолчанию — только из действующего акта (`end_date IS NULL`). Параметр `?include_expired=true` — все акты |
| GET | `/disciplines?sport_id=` | *Устарел.* Только действующие дисциплины, без дат актов |
| GET | `/v_1/disciplines/{sport_id}` | *Устарел.* Действующие дисциплины вида спорта |
| POST | `/disciplines` | Создать дисциплины (привязка к `sport_act_id`) |
| DELETE | `/disciplines/{id}` | Удалить дисциплину |

#### Параметры

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/parameters` | Все параметры с типами |
| GET | `/parameter_types` | Все типы параметров |
| GET | `/discipline-parameters/{discipline_id}` | Параметры конкретной дисциплины |
| POST | `/parameter-types` | Создать тип параметра |
| POST | `/parameters` | Создать параметр |
| POST | `/link-parameters` | Привязать параметры к дисциплине |
| DELETE | `/parameter-types/{id}` | Удалить тип параметра |
| DELETE | `/parameters/{id}` | Удалить параметр |
| DELETE | `/link-parameters` | Удалить связь дисциплина × параметр |
| GET | `/ldp` | Все связи `lnk_discipline_parameters` |

#### Требования

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/requirements` | Все требования с типами |
| GET | `/requirement_types` | Все типы требований |
| POST | `/requirements` | Создать требование |
| DELETE | `/requirements/{id}` | Удалить требование |

#### Разряды

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/ranks` | Все разряды, отсортированные по убыванию `prestige` |

#### Нормативы

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/sports/{sport_id}/normatives` | Нормативы вида спорта. Условия как список `{id, name, value, parent_id}`, флаг `is_competition` |
| GET | `/sports/{sport_id}` | То же, HTML-представление (для отладки) |
| GET | `/v_1/sports/{sport_id}/normatives` | Расширенный формат: вложенный объект `rank`, структура `conditions` |
| GET | `/v_1/disciplines/{discipline_id}/normatives` | Нормативы дисциплины. Условия в виде дерева (через `parent_id`), флаг `is_competitive`. **Используется публичным каталогом.** |
| GET | `/normative/{normative_id}` | Один норматив по ID |
| GET | `/v_1/normative/{normative_id}` | Один норматив, расширенный формат |
| POST | `/normatives` | Пакетное создание нормативов по разрядам. Поддерживает дополнительные условия (`additional_requirements`) с привязкой через `parent_id` |
| DELETE | `/normative/{id}` | Удалить норматив (каскадно: conditions → groups → normative) |

#### Логика дедупликации при создании нормативов (`POST /normatives`)

При пакетной загрузке система ищет существующий норматив с тем же `rank_id` и **точно тем же набором** `ldp_ids`. Возможные результаты:
- **created** — норматив создан заново
- **updated_existing** — к существующему нормативу добавлено новое условие
- **skipped_conflicts** — норматив и условие уже существуют, пропущен

---

## Frontend (React)

### Маршруты

| Путь | Компонент | Описание |
|------|-----------|----------|
| `/` | `MainApp` (в `App.jsx`) | Административный интерфейс. Выбор вида спорта → управление дисциплинами, параметрами, требованиями, нормативами. Без авторизации. |
| `/catalog` | `CatalogPage` | Публичный каталог с drill-down навигацией |
| `/info` | `InfoPage` | Информационная страница: описание системы нормативов, разряды и звания, полезные ссылки |
| `/normatives/:sport_id` | `NormativePage` | Просмотр дисциплин и нормативов выбранного вида спорта |

### Публичный каталог (`/catalog`)

Трёхуровневый drill-down без изменения URL:

```
1. Выбор категории (Летние / Зимние / Неолимпийские / ...)
   └── 2. Сетка видов спорта (с картинкой или эмодзи)
         └── 3. Список дисциплин → Таблица нормативов
```

Данные загружаются цепочкой:

1. Монтирование → `GET /v_2/sports` (ETag-кеш) → список видов спорта
2. Клик по виду спорта → `GET /v_2/sports/{id}/disciplines`
3. Клик по дисциплине → `GET /v_1/disciplines/{id}/normatives`

Дизайн: тематическая цветовая схема по категории спорта (зелёный для летних, синий для зимних, фиолетовый для неолимпийских и т.д.), хранится в `CatalogPage.css` через `data-theme` атрибут.

### Таблица нормативов (`NormativesTable`)

Строится матрица: **строки** — требования (Результат, Место, ...), **колонки** — разряды по убыванию престижа. Нормативы одной дисциплины группируются по уникальным комбинациям параметров (пол, возраст и т.д.) — каждая группа отображается отдельным блоком.

Иерархические условия (дочерние через `parent_id`) рендерятся рекурсивным компонентом `ConditionTree` с отступами и цветными бейджами:
- `norm` (тип 1) — зелёный
- `comp` (тип 2) — синий
- `other` — серый

### Утилиты

**`src/utils/rankColors.js`** — маппинг разряда → CSS-классы Tailwind + массив `RANK_ORDER` для сортировки:
```
МСМК → МС → КМС → I → II → III → I юн. → II юн. → III юн.
```

**`src/utils/sportEmojis.js`** — эмодзи для карточек спорта. Поиск: точное совпадение по названию → частичное вхождение → fallback по типу спорта → `🏆`.

### Настройка URL API

Базовый URL задан в `frontend/src/config/api.js`:

```js
export const API_CONFIG = {
  baseURL: "http://localhost:8000"  // для локальной разработки
};
```

> **Важно для деплоя:** в production-сборке это значение нужно заменить на `/api` (или полный URL с доменом), чтобы запросы проходили через Nginx-прокси. Текущая конфигурация рассчитана на локальную разработку.

---

## Инфраструктура

### Docker Compose

Три сервиса в одной сети `sportnormativ-net` (bridge):

| Сервис | Образ | Порты наружу | Описание |
|--------|-------|-------------|----------|
| `traefik` | `traefik:v2.10` | 80, 443 | Reverse proxy, TLS-терминация |
| `backend` | сборка из `./backend` | — | FastAPI на :8000 (только внутри сети) |
| `frontend` | сборка из `./frontend` | — | Nginx на :80 (только внутри сети) |

### Traefik (`traefik.yml`)

- Entrypoint `web` (80) → редирект на `websecure` (443)
- Entrypoint `websecure` (443) → TLS через Let's Encrypt (ACME, HTTP challenge)
- Дашборд доступен по `https://traefik.sportnormativ.ru` с Basic Auth (`.htpasswd`)
- Маршрутизация к frontend: `Host(sportnormativ.ru)` и `Host(www.sportnormativ.ru)`

### Nginx (`frontend/nginx.conf`)

```
/           → /usr/share/nginx/html (React SPA, fallback to index.html)
/api/*      → http://backend:8000 (strip /api prefix)
```

### Dockerfiles

**Backend** (`backend/Dockerfile`):
```
FROM python:3.10-slim
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY app.py .
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Frontend** (`frontend/Dockerfile`): двухэтапная сборка:
1. `node:18` — `npm install && npm run build` → артефакты в `dist/`
2. `nginx:1.23` — копирует `dist/` в `/usr/share/nginx/html` + кастомный `nginx.conf`

---

## Локальная разработка

### Требования

- Node.js 18+
- Python 3.10+
- Доступ к PostgreSQL (или VPN до удалённого сервера)

### Запуск бэкенда

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

API будет доступен на `http://localhost:8000`.  
Документация Swagger: `http://localhost:8000/docs`.

### Запуск фронтенда

```bash
cd frontend
npm install
npm run dev
```

Приложение откроется на `http://localhost:5173`. Убедись, что `src/config/api.js` указывает на `http://localhost:8000`.

### Сборка фронтенда

```bash
cd frontend
npm run build   # результат в frontend/dist/
npm run preview # предпросмотр production-сборки на :4173
```

---

## Деплой на сервер

### Первоначальная настройка

1. На сервере установи Docker и Docker Compose.
2. Создай файл `acme.json` и выдай права:
   ```bash
   touch acme.json && chmod 600 acme.json
   ```
3. Создай файл `.htpasswd` с паролем для дашборда Traefik:
   ```bash
   htpasswd -c .htpasswd admin
   ```
4. Убедись, что DNS-записи `sportnormativ.ru`, `www.sportnormativ.ru` и `traefik.sportnormativ.ru` указывают на IP сервера.

5. **Обнови `frontend/src/config/api.js`** перед сборкой:
   ```js
   export const API_CONFIG = {
     baseURL: "/api"  // Nginx срежет префикс /api и проксирует на backend:8000
   };
   ```

### Запуск

```bash
docker compose up -d --build
```

### Обновление

```bash
git pull
docker compose up -d --build frontend   # пересобрать только фронтенд
# или
docker compose up -d --build backend    # пересобрать только бэкенд
```

### Перезапуск сервисов

```bash
docker compose restart backend
docker compose logs -f backend    # логи в реальном времени
```

---

## Известные ограничения

- **Нет авторизации** — административный интерфейс (`/`) открыт публично.
- **Нет миграций** — схема БД управляется вручную через `sportnormativ_bd_schema.sql`.
- **Нет тестов** — ни юнит, ни интеграционных.
- **URL API захардкожен** — `frontend/src/config/api.js` нужно менять вручную перед production-сборкой.
- **Одна точка отказа** — бэкенд монолитный (`app.py`), новое соединение к БД на каждый запрос (нет пула).
