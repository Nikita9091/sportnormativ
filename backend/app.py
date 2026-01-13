from fastapi import FastAPI, HTTPException, Request, Form, Query
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
from psycopg2.extras import RealDictCursor
import html

app = FastAPI(title="SportNormativ API")

# --- Разрешаем CORS ---
origins = [
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:5173", 
    "http://127.0.0.1:5173",
    "http://185.239.51.243",
    "http://sportnormativ.ru",
    "https://sportnormativ.ru",
    "http://www.sportnormativ.ru",
    "https://www.sportnormativ.ru",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Настройка подключения к PostgreSQL ===
DB_CONFIG = {
    "dbname": "sportnormativ_db",
    "user": "api_user",
    "password": "U_Akl*cOo$j%_9*",
    "host": "185.239.51.243",
    "port": "5432"
}


def get_conn():
    try:
        conn = psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)
        return conn
    except Exception as e:
        raise Exception(f"Database connection error: {e}")

def row_to_dict(row, cursor=None):
    if cursor:
        cols = [desc[0] for desc in cursor.description]
        return dict(zip(cols, row))
    return dict(row)


# ====== Pydantic модели для входящих POST-запросов ======
class DisciplinesIn(BaseModel):
    sport_id: int
    discipline_names: List[str]
    discipline_codes: List[str]


class ParameterTypeIn(BaseModel):
    short_name: str


class ParameterIn(BaseModel):
    parameter_type_id: int
    parameter_value: str
    remark: Optional[str] = ""


class RequirementIn(BaseModel):
    requirement_type_id: int
    requirement_value: str
    description: Optional[str] = ""


class LinkParametersIn(BaseModel):
    discipline_id: int
    parameter_ids: List[int]


class RankEntry(BaseModel):
    rank_id: int
    condition_value: Optional[str] = None # Optional, т.к. пользователь может не ввести значение


class AdditionalRequirement(BaseModel):
    type: str  # addition_type
    value: str # addition


class CreateNormativeIn(BaseModel):
    discipline_id: int
    ldp_ids: List[int] # ID из таблицы lnk_discipline_parameters
    requirement_id: int
    rank_entries: List[RankEntry]
    additional_requirements: List[AdditionalRequirement] = []


class LinkDeletePayload(BaseModel):
    discipline_id: int
    parameter_id: int


# === GET - запросы ===

@app.get("/sports")
def get_sports_json():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, sport_name FROM ref_sports ORDER BY sport_name")
    rows = [row_to_dict(r) for r in cur.fetchall()]
    conn.close()
    return {"sports": rows}


@app.get("/v_1/sports")
def get_sports_v1_json():
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
        SELECT 
            s.id AS sport_id,
            s.sport_name,
            t.type_name,
            d.id AS discipline_id,
            d.discipline_name
        FROM ref_sports s
        LEFT JOIN ref_disciplines d ON s.id = d.sport_id
        LEFT JOIN ref_sport_types t ON s.sport_type_id = t.id
        ORDER BY s.id, d.discipline_name
    """)

    rows = cur.fetchall()
    conn.close()

    sports_map = {}

    for row in rows:
        sport_id = row["sport_id"]

        if sport_id not in sports_map:
            sports_map[sport_id] = {
                "id": sport_id,
                "sport_name": row["sport_name"],
                "sport_type": row["type_name"],
                "disciplines": []
            }

        # discipline может быть NULL из-за LEFT JOIN
        if row["discipline_id"] is not None:
            sports_map[sport_id]["disciplines"].append({
                "discipline_id": row["discipline_id"],
                "discipline_name": row["discipline_name"]
            })

    return {
        "sports": list(sports_map.values())
    }


@app.get("/disciplines")
def list_disciplines_json():
  conn = get_conn()
  cur = conn.cursor()

  try:
    cur.execute(
      "SELECT sport_id, id AS discipline_id, discipline_name, discipline_code FROM ref_disciplines ORDER BY discipline_name",
    )
    rows = [row_to_dict(r) for r in cur.fetchall()]
    conn.close()
    return { "disciplines": rows, "total_count": len(rows) }


  except Exception as e:
    print(f"Error fetching disciplines: {e}")
    return {"error": str(e)}

  finally:
    conn.close()


@app.get("/v_1/disciplines/{sport_id}")
def list_disciplines_for_sport_v1_json(sport_id: int):
  conn = get_conn()
  cur = conn.cursor()

  try:
    cur.execute(
      "SELECT id AS discipline_id, discipline_name, discipline_code FROM ref_disciplines WHERE sport_id = %s ORDER BY discipline_name",
      (sport_id,)
    )

    rows = [row_to_dict(r) for r in cur.fetchall()]
    conn.close()
    return { "sport_id": sport_id, "disciplines": rows, "total_count": len(rows) }


  except Exception as e:
    print(f"Error fetching disciplines: {e}")
    return {"error": str(e)}

  finally:
    conn.close()


@app.get("/parameters")
def list_parameters_json():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
    SELECT p.id, p.parameter_type_id, t.type_name as parameter_type_name, p.parameter_value
    FROM ref_parameters p
    LEFT JOIN ref_parameters_types t ON p.parameter_type_id = t.id
    ORDER BY t.type_name, p.parameter_value
    """)
    rows = [row_to_dict(r) for r in cur.fetchall()]
    conn.close()
    return {"parameters": rows}


@app.get("/parameter_types")
def list_parameter_types_json():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, type_name as parameter_type_name FROM ref_parameters_types")
    rows = [row_to_dict(r) for r in cur.fetchall()]
    conn.close()
    return {"parameter_types": rows}


@app.get("/requirement_types")
def list_requirement_types_json():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, type_name AS requirement_type_name FROM ref_requirements_types")
    rows = [row_to_dict(r) for r in cur.fetchall()]
    conn.close()
    return {"requirements_types": rows}


@app.get("/requirements")
def list_requirements_json():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
    SELECT p.id, p.requirement_type_id, t.type_name AS requirement_type_name, p.requirement_value
    FROM ref_requirements p
    LEFT JOIN ref_requirements_types t ON p.requirement_type_id = t.id
    ORDER BY t.type_name, p.requirement_value
    """)
    rows = [row_to_dict(r) for r in cur.fetchall()]
    conn.close()
    return {"requirements": rows}


@app.get("/ldp")
def list_ldp_json():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
    SELECT l.id, l.discipline_id, d.discipline_name, l.parameter_id, p.parameter_value
    FROM lnk_discipline_parameters l
    LEFT JOIN ref_disciplines d ON l.discipline_id = d.id
    LEFT JOIN ref_parameters p ON l.parameter_id = p.id
    ORDER BY d.discipline_name, p.parameter_value
    """)
    rows = [row_to_dict(r) for r in cur.fetchall()]
    conn.close()
    return {"lnk_discipline_parameters": rows}

@app.get("/discipline-parameters/{id}")
def list_ldp_(id: int):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
    SELECT 
        l.id AS ldp_id, p.id, p.parameter_type_id, p.parameter_value
    FROM 
        lnk_discipline_parameters l
    LEFT JOIN 
        ref_disciplines d ON l.discipline_id = d.id
    LEFT JOIN 
        ref_parameters p ON l.parameter_id = p.id
    WHERE 
        l.discipline_id = %s
    """, (id,))
    rows = [row_to_dict(r) for r in cur.fetchall()]
    conn.close()
    return {"lnk_discipline_parameters": rows}


@app.get("/ranks")
def list_ranks_json():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, short_name, full_name, prestige FROM ref_ranks ORDER BY prestige")
    rows = [row_to_dict(r) for r in cur.fetchall()]
    conn.close()
    return {"ranks": rows}


@app.get("/sports/{sport_id}", response_class=HTMLResponse)
def get_normatives_for_sport_html(sport_id: int):
    conn = get_conn()
    cur = conn.cursor()

    query = """
    SELECT 
        rs.sport_name AS sport_name,
        rd.discipline_name AS discipline_name,
        rd.discipline_code AS discipline_code,
        -- Убрал DISTINCT, но оставил ORDER BY
        STRING_AGG(rpt.type_name || ': ' || rp.parameter_value, ', ' ORDER BY rpt.type_name, rp.parameter_value) AS discipline_parameters,
        rr.short_name AS rank_short,
        rr.full_name AS rank_full,
        rr.prestige AS rank_prestige,
        rreq.requirement_value AS requirement_short,
        rreq.description AS requirement_desc,
        c.condition AS condition_value,
        rr.id as rank_id,
        rd.id as discipline_id,
        n.id as normative_id
    FROM conditions c
    JOIN normatives n ON c.normative_id = n.id
    JOIN ref_ranks rr ON n.rank_id = rr.id
    JOIN ref_requirements rreq ON c.requirement_id = rreq.id
    JOIN groups g ON n.id = g.normative_id
    JOIN lnk_discipline_parameters ldp ON g.discipline_parameter_id = ldp.id
    JOIN ref_disciplines rd ON ldp.discipline_id = rd.id
    JOIN ref_parameters rp ON ldp.parameter_id = rp.id
    JOIN ref_parameters_types rpt ON rp.parameter_type_id = rpt.id
    JOIN ref_sports rs ON rd.sport_id = rs.id
    WHERE rs.id = %s
    GROUP BY rs.sport_name, rd.discipline_name, rd.discipline_code, rr.short_name, 
             rr.full_name, rr.prestige, rreq.requirement_value, rreq.description, 
             c.condition, rr.id, rd.id, n.id
    ORDER BY rd.discipline_name, rr.prestige DESC, rr.id
    """
    cur.execute(query, (sport_id,))
    rows = cur.fetchall()
    conn.close()

    if not rows:
        return HTMLResponse(content=f"<html><body><h3>Нет нормативов для вида спорта id={sport_id}</h3></body></html>",
                            status_code=200)

    header = """
    <html><head><meta charset="utf-8"><title>Нормативы</title></head><body>
    <h2>Нормативы для вида спорта: {sport}</h2>
    <table border="1" cellpadding="6" cellspacing="0">
      <thead>
        <tr>
          <th>Вид спорта</th>
          <th>Дисциплина (параметры)</th>
          <th>Разряд</th>
          <th>Требование (ед.)</th>
          <th>Значение</th>
        </tr>
      </thead>
      <tbody>
    """
    sport_name = rows[0]["sport_name"]
    body_rows = ""
    for r in rows:
        body_rows += "<tr>"
        body_rows += f"<td>{html.escape(r['sport_name'])}</td>"
        params = r["discipline_parameters"] or ""
        body_rows += f"<td>{html.escape(r['discipline_name'])} ({html.escape(params)})</td>"
        body_rows += f"<td>{html.escape(r['rank_short'])}</td>"
        req = r["requirement_short"] or ""
        req_desc = r["requirement_desc"] or ""
        body_rows += f"<td>{html.escape(req)} {'(' + html.escape(req_desc) + ')' if req_desc else ''}</td>"
        body_rows += f"<td>{html.escape(r['condition_value'])}</td>"
        body_rows += "</tr>"
    footer = "</tbody></table></body></html>"
    html_page = header.format(sport=html.escape(sport_name)) + body_rows + footer
    return HTMLResponse(content=html_page, status_code=200)


@app.get("/normative/{normative_id}")
def get_normative_by_id_json(normative_id: int):
  conn = get_conn()
  cur = conn.cursor()

  query = """
    SELECT 
        rs.id as sport_id,
        rs.sport_name,
        rd.id as discipline_id,
        rd.discipline_name,
        rd.discipline_code,
        rr.id as rank_id,
        rr.short_name as rank_short,
        rr.full_name as rank_full,
        rr.prestige,
        rreq.requirement_value,
        rreq.description as requirement_desc,
        c.condition,
        n.id as normative_id,
        rpt.type_name as param_type,
        rp.parameter_value as param_value
    FROM normatives n
    JOIN conditions c ON c.normative_id = n.id
    JOIN ref_ranks rr ON rr.id = n.rank_id
    JOIN ref_requirements rreq ON rreq.id = c.requirement_id
    JOIN groups g ON g.normative_id = n.id
    JOIN lnk_discipline_parameters ldp ON ldp.id = g.discipline_parameter_id
    JOIN ref_disciplines rd ON rd.id = ldp.discipline_id
    JOIN ref_parameters rp ON rp.id = ldp.parameter_id
    JOIN ref_parameters_types rpt ON rpt.id = rp.parameter_type_id
    JOIN ref_sports rs ON rs.id = rd.sport_id
    WHERE n.id = %s
    ORDER BY rpt.type_name, c.condition;
    """

  try:
    cur.execute(query, (normative_id,))
    rows = cur.fetchall()

    if not rows:
      return {
        "error": "Норматив не найден",
        "normative_id": normative_id,
        "exists": False
      }

    # Группируем данные
    result = {
      "id": normative_id,
      "sport_id": rows[0]["sport_id"],
      "sport_name": rows[0]["sport_name"],
      "discipline_id": rows[0]["discipline_id"],
      "discipline_name": rows[0]["discipline_name"],
      "discipline_code": rows[0]["discipline_code"],
      "rank_short": rows[0]["rank_short"],
      "rank_prestige": rows[0]["prestige"],
      "discipline_parameters": {},
      "conditions": {}
    }

    # Собираем параметры и условия
    for row in rows:
      # Добавляем параметры
      if row["param_type"] and row["param_value"]:
        result["discipline_parameters"][row["param_type"]] = row["param_value"]

      # Добавляем условия
      if row["requirement_value"] and row["condition"]:
        result["conditions"][row["requirement_value"]] = row["condition"]

    return result

  except Exception as e:
    print(f"Error fetching normative {normative_id}: {e}")
    return {
      "error": str(e),
      "normative_id": normative_id,
      "success": False
    }

  finally:
    conn.close()


@app.get("/v_1/normative/{normative_id}")
def get_normative_by_id_v1_json(normative_id: int):
    conn = get_conn()
    cur = conn.cursor()

    query = """
    SELECT 
        rs.id AS sport_id,
        rs.sport_name,
        rd.id AS discipline_id,
        rd.discipline_name,
        rd.discipline_code,
        rr.id AS rank_id,
        rr.short_name AS rank_short,
        rr.full_name AS rank_full,
        rr.prestige AS rank_prestige,
        rreq.requirement_value,
        c.condition,
        rpt.type_name AS param_type,
        rp.parameter_value AS param_value
    FROM normatives n
    JOIN ref_ranks rr ON rr.id = n.rank_id
    JOIN conditions c ON c.normative_id = n.id
    JOIN ref_requirements rreq ON rreq.id = c.requirement_id
    JOIN groups g ON g.normative_id = n.id
    JOIN lnk_discipline_parameters ldp ON ldp.id = g.discipline_parameter_id
    JOIN ref_disciplines rd ON rd.id = ldp.discipline_id
    JOIN ref_parameters rp ON rp.id = ldp.parameter_id
    JOIN ref_parameters_types rpt ON rpt.id = rp.parameter_type_id
    JOIN ref_sports rs ON rs.id = rd.sport_id
    WHERE n.id = %s;
    """

    cur.execute(query, (normative_id,))
    rows = cur.fetchall()
    conn.close()

    if not rows:
        raise HTTPException(status_code=404, detail="Normative not found")

    parameters = {}
    conditions = {}

    for row in rows:
        if row["param_type"] and row["param_value"]:
            parameters[row["param_type"]] = row["param_value"]

        if row["requirement_value"] and row["condition"]:
            conditions[row["requirement_value"]] = row["condition"]

    first = rows[0]

    return {
        "id": normative_id,
        "sport": {
            "id": first["sport_id"],
            "name": first["sport_name"]
        },
        "discipline": {
            "id": first["discipline_id"],
            "name": first["discipline_name"],
            "code": first["discipline_code"]
        },
        "rank": {
            "id": first["rank_id"],
            "short": first["rank_short"],
            "full": first["rank_full"],
            "prestige": first["rank_prestige"]
        },
        "parameters": parameters,
        "conditions": conditions
    }


@app.get("/sports/{sport_id}/normatives")
def get_normatives_for_sport_json(sport_id: int):
  conn = get_conn()
  cur = conn.cursor()

  query = """
    SELECT 
        rs.sport_name,
        rd.id as discipline_id,
        rd.discipline_name,
        rd.discipline_code,
        rr.id as rank_id,
        rr.short_name as rank_short,
        rr.full_name as rank_full,
        rr.prestige,
        rreq.requirement_value,
        rreq.description as requirement_desc,
        c.condition,
        n.id as normative_id,
        rpt.type_name as param_type,
        rp.parameter_value as param_value
    FROM conditions c
    /* Оптимизация: начинаем с фильтрации по sport_id */
    JOIN ref_disciplines rd ON rd.sport_id = %s
    JOIN lnk_discipline_parameters ldp ON ldp.discipline_id = rd.id
    JOIN ref_parameters rp ON rp.id = ldp.parameter_id
    JOIN ref_parameters_types rpt ON rpt.id = rp.parameter_type_id
    JOIN groups g ON g.discipline_parameter_id = ldp.id
    JOIN normatives n ON n.id = g.normative_id
    JOIN ref_ranks rr ON rr.id = n.rank_id
    JOIN ref_requirements rreq ON rreq.id = c.requirement_id
    JOIN ref_sports rs ON rs.id = rd.sport_id
    WHERE c.normative_id = n.id
    ORDER BY 
        rd.discipline_name, 
        rr.prestige DESC, 
        rpt.type_name,  -- Сначала сортируем по типу параметра
        c.condition;    -- Затем по условию
    """

  cur.execute(query, (sport_id,))
  rows = cur.fetchall()
  conn.close()

  if not rows:
    return {
      "sport_id": sport_id,
      "sport_name": "Неизвестный вид спорта",
      "normatives": [],
      "total_count": 0
    }

  normatives_dict = {}

  for row in rows:
    normative_id = row["normative_id"]

    if normative_id not in normatives_dict:
      normatives_dict[normative_id] = {
        "id": normative_id,
        "discipline_id": row["discipline_id"],
        "discipline_name": row["discipline_name"],
        "discipline_code": row["discipline_code"],
        "discipline_parameters": {},
        "rank_short": row["rank_short"],
        "rank_full": row["rank_full"],
        "rank_prestige": row["prestige"],
        "condition": {},
      }

    normative = normatives_dict[normative_id]

    # Добавляем параметры
    if row["param_type"] and row["param_value"]:
      normatives_dict[normative_id]["discipline_parameters"][row["param_type"]] = row["param_value"]

    # Добавляем условия
    if row["requirement_value"] and row["condition"]:
      normatives_dict[normative_id]["condition"][row["requirement_value"]] = row["condition"]

  # 5. Оптимизация: преобразуем сразу в список
  normatives_data = [
    {
      "id": n["id"],
      "discipline_id": n["discipline_id"],
      "discipline_name": n["discipline_name"],
      "discipline_code": n["discipline_code"],
      "discipline_parameters": n["discipline_parameters"],
      "rank_short": n["rank_short"],
      "rank_prestige": n["rank_prestige"],
      "condition": n["condition"],
    }
    for n in normatives_dict.values()
  ]

  return {
    "sport_id": sport_id,
    "sport_name": rows[0]["sport_name"],
    "normatives": normatives_data,
    "total_count": len(normatives_data)
  }


@app.get("/v_1/sports/{sport_id}/normatives")
def get_normatives_for_sport_v1_json(sport_id: int):
    conn = get_conn()
    cur = conn.cursor()

    query = """
    SELECT 
        rs.id AS sport_id,
        rs.sport_name,
        rd.id AS discipline_id,
        rd.discipline_name,
        rd.discipline_code,
        rr.id AS rank_id,
        rr.short_name AS rank_short,
        rr.full_name AS rank_full,
        rr.prestige AS rank_prestige,
        rreq.requirement_value,
        c.condition,
        n.id AS normative_id,
        rpt.type_name AS param_type,
        rp.parameter_value AS param_value
    FROM normatives n
    JOIN groups g ON g.normative_id = n.id
    JOIN lnk_discipline_parameters ldp ON ldp.id = g.discipline_parameter_id
    JOIN ref_disciplines rd ON rd.id = ldp.discipline_id
    JOIN ref_parameters rp ON rp.id = ldp.parameter_id
    JOIN ref_parameters_types rpt ON rpt.id = rp.parameter_type_id
    JOIN conditions c ON c.normative_id = n.id
    JOIN ref_requirements rreq ON rreq.id = c.requirement_id
    JOIN ref_ranks rr ON rr.id = n.rank_id
    JOIN ref_sports rs ON rs.id = rd.sport_id
    WHERE rs.id = %s
    ORDER BY 
        rd.discipline_name,
        rr.prestige DESC;
    """

    cur.execute(query, (sport_id,))
    rows = cur.fetchall()
    conn.close()

    if not rows:
        raise HTTPException(status_code=404, detail="Sport or normatives not found")

    normatives = {}

    for row in rows:
        nid = row["normative_id"]

        if nid not in normatives:
            normatives[nid] = {
                "id": nid,
                "discipline_id": row["discipline_id"],
                "discipline_name": row["discipline_name"],
                "discipline_code": row["discipline_code"],
                "rank": {
                    "id": row["rank_id"],
                    "short": row["rank_short"],
                    "full": row["rank_full"],
                    "prestige": row["rank_prestige"]
                },
                "discipline_parameters": {},
                "conditions": {}
            }

        # Параметры дисциплины
        if row["param_type"] and row["param_value"]:
            normatives[nid]["discipline_parameters"][row["param_type"]] = row["param_value"]

        # Условия норматива
        if row["requirement_value"] and row["condition"]:
            normatives[nid]["conditions"][row["requirement_value"]] = row["condition"]

    normatives_list = list(normatives.values())

    return {
        "sport_id": rows[0]["sport_id"],
        "sport_name": rows[0]["sport_name"],
        "normatives": normatives_list,
        "total_count": len(normatives_list)
    }


# === POST - запросы ===

@app.post("/disciplines")
def add_disciplines(payload: DisciplinesIn):
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    inserted = []
    errors = []

    # Проверяем соответствие списков
    if len(payload.discipline_names) != len(payload.discipline_codes):
        conn.close()
        return {
            "inserted": [],
            "errors": ["Количество названий и кодов дисциплин не совпадает."]
        }

    for name, code in zip(payload.discipline_names, payload.discipline_codes):
        name = name.strip()
        code = code.strip()
        if not name or not code:
            continue

        try:
            cur.execute(
                """
                INSERT INTO ref_disciplines (sport_id, discipline_code, discipline_name)
                VALUES (%s, %s, %s)
                RETURNING id, discipline_name, discipline_code
                """,
                (payload.sport_id, code, name)
            )
            row = cur.fetchone()
            inserted.append(dict(row))

        except psycopg2.errors.UniqueViolation:
            # Если уже существует — достанем id
            conn.rollback()
            cur.execute(
                """
                SELECT id, discipline_name, discipline_code
                FROM ref_disciplines
                WHERE (discipline_name = %s OR discipline_code = %s)
                AND sport_id = %s
                """,
                (name, code, payload.sport_id)
            )
            row = cur.fetchone()
            if row:
                inserted.append({**row, "note": "already exists"})
            else:
                errors.append({
                    "discipline_name": name,
                    "discipline_code": code,
                    "error": "unique constraint violated but not found"
                })
        except Exception as e:
            conn.rollback()
            errors.append({
                "discipline_name": name,
                "discipline_code": code,
                "error": str(e)
            })
        else:
            conn.commit()

    cur.close()
    conn.close()

    return {"inserted": inserted, "errors": errors}


@app.post("/parameter-types")
def add_parameter_type(payload: ParameterTypeIn):
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute("INSERT INTO ref_parameters_types (type_name) VALUES (%s) RETURNING id",
                    (payload.short_name.strip(),))
        row = cur.fetchone()
        nid = row["id"]
        conn.commit()
    except Exception as e:
        if "unique" in str(e).lower():
            cur.execute("SELECT id FROM ref_parameters_types WHERE type_name = %s", (payload.short_name.strip(),))
            row = cur.fetchone()
            nid = row["id"] if row else None
        else:
            nid = None
    conn.close()
    return {"id": nid, "type_name": payload.short_name}


@app.post("/parameters")
def add_parameter(payload: ParameterIn):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id FROM ref_parameters_types WHERE id = %s", (payload.parameter_type_id,))
    if not cur.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail=f"parameter_type_id {payload.parameter_type_id} not found")

    try:
        cur.execute("""INSERT INTO ref_parameters (parameter_type_id, parameter_value) 
                      VALUES (%s, %s) RETURNING id""",
                    (payload.parameter_type_id, payload.parameter_value.strip()))
        row = cur.fetchone()
        pid = row["id"]
        conn.commit()
    except Exception as e:
        if "unique" in str(e).lower():
            cur.execute("SELECT id FROM ref_parameters WHERE parameter_type_id = %s AND parameter_value = %s",
                        (payload.parameter_type_id, payload.parameter_value.strip()))
            row = cur.fetchone()
            pid = row["id"] if row else None
        else:
            pid = None
    conn.close()
    return {"id": pid, "parameter_value": payload.parameter_value, "parameter_type_id": payload.parameter_type_id}


@app.post("/requirements")
def add_requirement(payload: RequirementIn):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id FROM ref_requirements_types WHERE id = %s", (payload.requirement_type_id,))
    if not cur.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail=f"requirement_type_id {payload.requirement_type_id} not found")

    try:
        cur.execute("""INSERT INTO ref_requirements (requirement_type_id, requirement_value) 
                      VALUES (%s, %s) RETURNING id""",
                    (payload.requirement_type_id, payload.requirement_value.strip()))
        row = cur.fetchone()
        pid = row["id"]
        conn.commit()
    except Exception as e:
        if "unique" in str(e).lower():
            cur.execute("SELECT id FROM ref_requirements WHERE requirement_type_id = %s AND requirement_value = %s",
                        (payload.parameter_type_id, payload.parameter_value.strip()))
            row = cur.fetchone()
            pid = row["id"] if row else None
        else:
            pid = None
    conn.close()
    return {"id": pid, "parameter_value": payload.requirement_value, "parameter_type_id": payload.requirement_type_id}


@app.post("/link-parameters")
def link_parameters(payload: LinkParametersIn):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id FROM ref_disciplines WHERE id = %s", (payload.discipline_id,))
    if not cur.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail=f"discipline_id {payload.discipline_id} not found")

    inserted = []
    errors = []
    for pid in payload.parameter_ids:
        cur.execute("SELECT id FROM ref_parameters WHERE id = %s", (pid,))
        if not cur.fetchone():
            errors.append({"parameter_id": pid, "error": "not found"})
            continue
        try:
            cur.execute("""INSERT INTO lnk_discipline_parameters (discipline_id, parameter_id) 
                          VALUES (%s, %s) RETURNING id""",
                        (payload.discipline_id, pid))
            row = cur.fetchone()
            inserted.append({"id": row["id"], "discipline_id": payload.discipline_id, "parameter_id": pid})
        except Exception as e:
            if "unique" in str(e).lower():
                cur.execute("""SELECT id FROM lnk_discipline_parameters 
                             WHERE discipline_id = %s AND parameter_id = %s""",
                            (payload.discipline_id, pid))
                row = cur.fetchone()
                if row:
                    inserted.append({"id": row["id"], "discipline_id": payload.discipline_id, "parameter_id": pid,
                                     "note": "already exists"})
                else:
                    errors.append({"parameter_id": pid, "error": str(e)})
            else:
                errors.append({"parameter_id": pid, "error": str(e)})
    conn.commit()
    conn.close()
    return {"inserted": inserted, "errors": errors}


@app.post("/normatives")
def add_normatives(payload: CreateNormativeIn):
    conn = get_conn()
    cur = conn.cursor()

    # --- Существующие проверки ---
    cur.execute("SELECT id FROM ref_disciplines WHERE id = %s", (payload.discipline_id,))
    if not cur.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail=f"discipline_id {payload.discipline_id} not found")

    # --- Проверка lnk_discipline_parameters ---
    for ldp_id in payload.ldp_ids:
        cur.execute("SELECT discipline_id FROM lnk_discipline_parameters WHERE id = %s", (ldp_id,))
        row = cur.fetchone()
        if not row:
            conn.close()
            raise HTTPException(status_code=400, detail=f"lnk_discipline_parameters id {ldp_id} not found")
        if row["discipline_id"] != payload.discipline_id:
            conn.close()
            raise HTTPException(
                status_code=400,
                detail=f"ldp_id {ldp_id} does not belong to discipline_id {payload.discipline_id}"
            )

    # --- Проверка requirement ---
    cur.execute("SELECT id FROM ref_requirements WHERE id = %s", (payload.requirement_id,))
    if not cur.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail=f"requirement_id {payload.requirement_id} not found")

    # Нормализуем ldp_ids для сравнения (сортируем)
    sorted_ldp_ids = sorted(payload.ldp_ids)
    ldp_count = len(sorted_ldp_ids)

    created = []
    used_existing = []   # если нашли существующий норматив и добавили требование в него
    skipped = []         # если обнаружили, что требование (requirement+value) уже есть -> ошибка для этой записи

    try:
        # Начинаем транзакцию (если ваш get_conn возвращает автокоммит off — ок)
        for entry in payload.rank_entries:
            # Пропускаем пустые значения условия (как в оригинале)
            if not entry.condition_value:
                continue

            # 1) Проверяем, есть ли норматив с такой же комбинацией rank_id + набором discipline_parameter_id
            # Ищем нормативы, у которых собран exactly тот же набор discipline_parameter_id (включая порядок по id)
            cur.execute("""
                SELECT n.id
                FROM normatives n
                JOIN groups g ON g.normative_id = n.id
                WHERE n.rank_id = %s
                GROUP BY n.id
                HAVING COUNT(DISTINCT g.discipline_parameter_id) = %s
                   AND array_agg(DISTINCT g.discipline_parameter_id ORDER BY g.discipline_parameter_id) = %s
                LIMIT 1
            """, (
                entry.rank_id,
                ldp_count,
                sorted_ldp_ids
            ))

            existing = cur.fetchone()
            if existing:
                # нашли норматив с нужной комбинацией (переходим к пункту 2)
                normative_id = existing["id"]

                # 2) Проверяем — есть ли уже условие с таким requirement_id + condition для этого нормативa
                cur.execute("""
                    SELECT id FROM conditions
                    WHERE normative_id = %s
                      AND requirement_id = %s
                      AND condition = %s
                    LIMIT 1
                """, (normative_id, payload.requirement_id, entry.condition_value))

                cond_exists = cur.fetchone()
                if cond_exists:
                    # Если такое требование уже есть — считаем это ошибкой (сообщаем и не создаём новый)
                    # Сбрасывать транзакцию не будем — просто добавим в skipped список и продолжим обработку следующих entry
                    skipped.append({
                        "rank_id": entry.rank_id,
                        "normative_id": normative_id,
                        "reason": "condition already exists"
                    })
                    continue
                else:
                    # Условие новое для найденного норматива — добавляем его (пункт 3)
                    cur.execute("""
                        INSERT INTO conditions (normative_id, requirement_id, condition)
                        VALUES (%s, %s, %s)
                        RETURNING id
                    """, (normative_id, payload.requirement_id, entry.condition_value))
                    condition_id = cur.fetchone()["id"]

                    # Добавляем дополнительные требования, если есть
                    if payload.additional_requirements:
                        for req in payload.additional_requirements:
                            cur.execute("""
                                INSERT INTO add_requirements (condition_id, addition_type, addition)
                                VALUES (%s, %s, %s)
                            """, (condition_id, req.type, req.value))

                    used_existing.append({
                        "rank_id": entry.rank_id,
                        "normative_id": normative_id,
                        "condition_id": condition_id
                    })
                    # не создаём новый норматив, идём к следующему entry
                    continue

            # Если норматив не найден — создаём новый норматив и привязываем группы/условие/доп.требования
            cur.execute("INSERT INTO normatives (rank_id) VALUES (%s) RETURNING id", (entry.rank_id,))
            normative_id = cur.fetchone()["id"]

            # Связываем с параметрами (groups)
            for ldp_id in sorted_ldp_ids:
                cur.execute(
                    "INSERT INTO groups (discipline_parameter_id, normative_id) VALUES (%s, %s)",
                    (ldp_id, normative_id)
                )

            # Добавляем условие (requirement + condition_value)
            cur.execute("""
                INSERT INTO conditions (normative_id, requirement_id, condition)
                VALUES (%s, %s, %s)
                RETURNING id
            """, (normative_id, payload.requirement_id, entry.condition_value))
            condition_id = cur.fetchone()["id"]

            # Добавляем дополнительные требования
            if payload.additional_requirements:
                for req in payload.additional_requirements:
                    cur.execute("""
                        INSERT INTO add_requirements (condition_id, addition_type, addition)
                        VALUES (%s, %s, %s)
                    """, (condition_id, req.type, req.value))

            created.append({
                "rank_id": entry.rank_id,
                "normative_id": normative_id,
                "condition_id": condition_id
            })

        # Фиксируем транзакцию
        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        # логируем серверно; возвращаем 500
        print(f"Error while adding normative(s): {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    conn.close()

    # Если есть пропущенные записи с конфликтом, можно вернуть их в ответе клиенту
    result = {
        "created": created,
        "updated_existing": used_existing,
        "skipped_conflicts": skipped
    }

    # Если вы хотите, чтобы конфликт (skipped) был явной ошибкой — можно вместо возврата результата выбросить HTTPException.
    # Сейчас мы возвращаем подробный отчет о том, что произошло.
    return result


# ====== DELETE endpoints ======


@app.delete("/normative/{normative_id}")
def delete_normative(normative_id: int):
  conn = get_conn()
  cur = conn.cursor()

  try:
    # 1. Проверяем существование норматива
    cur.execute("SELECT id FROM normatives WHERE id = %s", (normative_id,))
    if not cur.fetchone():
      return {
        "success": False,
        "error": f"Норматив с ID {normative_id} не найден",
        "normative_id": normative_id
      }

    # 2. Получаем информацию для лога/ответа
    cur.execute("""
            SELECT 
                n.id,
                rd.discipline_name,
                rr.short_name as rank_short
            FROM normatives n
            JOIN groups g ON g.normative_id = n.id
            JOIN lnk_discipline_parameters ldp ON ldp.id = g.discipline_parameter_id
            JOIN ref_disciplines rd ON rd.id = ldp.discipline_id
            JOIN ref_ranks rr ON rr.id = n.rank_id
            WHERE n.id = %s
            LIMIT 1
        """, (normative_id,))

    normative_info = cur.fetchone()
    discipline_name = normative_info["discipline_name"] if normative_info else "Неизвестно"
    rank_short = normative_info["rank_short"] if normative_info else "Неизвестно"

    # 3. Удаляем в правильном порядке (избегаем нарушений внешних ключей)
    # Порядок удаления: conditions → groups → normatives

    # Удаляем условия
    cur.execute("DELETE FROM conditions WHERE normative_id = %s", (normative_id,))
    conditions_deleted = cur.rowcount

    # Удаляем связи групп
    cur.execute("DELETE FROM groups WHERE normative_id = %s", (normative_id,))
    groups_deleted = cur.rowcount

    # Удаляем сам норматив
    cur.execute("DELETE FROM normatives WHERE id = %s", (normative_id,))
    normative_deleted = cur.rowcount

    # Коммитим изменения
    conn.commit()

    return {
      "success": True,
      "message": f"Норматив успешно удален",
      "normative_id": normative_id,
      "details": {
        "discipline": discipline_name,
        "rank": rank_short,
        "conditions_deleted": conditions_deleted,
        "groups_deleted": groups_deleted,
        "normative_deleted": normative_deleted
      }
    }

  except Exception as e:
    # Откатываем транзакцию при ошибке
    conn.rollback()
    print(f"Error deleting normative {normative_id}: {e}")

    # Проверяем, является ли ошибка нарушением внешнего ключа
    error_msg = str(e)
    if "foreign key constraint" in error_msg.lower():
      return {
        "success": False,
        "error": f"Невозможно удалить норматив. Существуют зависимые записи.",
        "normative_id": normative_id,
        "details": "Проверьте связанные данные в других таблицах"
      }

    return {
      "success": False,
      "error": f"Ошибка при удалении: {error_msg}",
      "normative_id": normative_id
    }

  finally:
    conn.close()


@app.delete("/disciplines/{id}")
def delete_discipline(id: int):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM ref_disciplines WHERE id = %s", (id,))
    conn.commit()
    conn.close()
    return {"deleted": id}


@app.delete("/parameter-types/{id}")
def delete_param_type(id: int):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM ref_parameters_types WHERE id = %s", (id,))
    conn.commit()
    conn.close()
    return {"deleted": id}


@app.delete("/parameters/{id}")
def delete_parameter(id: int):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM ref_parameters WHERE id = %s", (id,))
    conn.commit()
    conn.close()
    return {"deleted": id}


@app.delete("/requirements/{id}")
def delete_requirement(id: int):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM ref_requirements WHERE id = %s", (id,))
    conn.commit()
    conn.close()
    return {"deleted": id}


@app.delete("/link-parameters")
def delete_link(payload: LinkDeletePayload):
    """
    Удаляет одну конкретную связь между дисциплиной и параметром.
    Ожидает JSON-тело вида: {"discipline_id": 1, "parameter_id": 2}
    """
    conn = None
    try:
        conn = get_conn()
        cur = conn.cursor()

        cur.execute("""
            DELETE FROM lnk_discipline_parameters
            WHERE discipline_id = %s AND parameter_id = %s
        """, (payload.discipline_id, payload.parameter_id))

        # Получаем количество удаленных строк
        deleted_rows = cur.rowcount

        conn.commit()  # <-- Самое важное! Применяем изменения (DELETE/INSERT/UPDATE)

        if deleted_rows == 0:
            # Это не ошибка. Это значит, что такой связи уже не было.
            # Для React-компонента это все равно "успех".
            return {
                "status": "not_found",
                "message": "Связь не найдена или уже удалена."
            }

        return {
            "status": "deleted",
            "discipline_id": payload.discipline_id,
            "parameter_id": payload.parameter_id
        }

    except (Exception, psycopg2.Error) as error:
        print("Ошибка при удалении связи:", error)
        if conn:
            conn.rollback()  # Откатываем изменения в случае ошибки

        raise HTTPException(
            status_code=500,
            detail="Внутренняя ошибка сервера при удалении связи."
        )

    finally:
        if conn:
            cur.close()
            conn.close()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="localhost", port=8000)
