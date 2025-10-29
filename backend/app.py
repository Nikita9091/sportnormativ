from fastapi import FastAPI, HTTPException, Request, Form
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
    discipline_names: List[str] = Field(..., min_items=1)
    discipline_codes: List[str] = Field(..., min_items=1)


class ParameterTypeIn(BaseModel):
    short_name: str


class ParameterIn(BaseModel):
    parameter_type_id: int
    parameter_value: str
    remark: Optional[str] = ""


class LinkParametersIn(BaseModel):
    discipline_id: int
    parameter_ids: List[int] = Field(..., min_items=1)


class NormativeRankEntry(BaseModel):
    rank_id: int
    requirement_id: int
    condition_value: str
    sorting: Optional[int] = None
    remark: Optional[str] = ""


class CreateNormativeIn(BaseModel):
    discipline_id: int
    ldp_ids: List[int]
    rank_entries: List[NormativeRankEntry]


# ====== GET /sports - список всех видов спорта ======
@app.get("/sports", response_class=HTMLResponse)
def get_sports_html():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, sport_name FROM ref_sports ORDER BY sport_name")
    rows = cur.fetchall()
    conn.close()

    html_rows = "".join(f'<li><a href="/sports/{r["id"]}">{html.escape(r["sport_name"])}</a></li>' for r in rows)
    html_page = f"""
    <html>
      <head><meta charset="utf-8"><title>Виды спорта</title></head>
      <body>
        <h2>Виды спорта</h2>
        <ul>
          {html_rows}
        </ul>
        <p>API JSON: <a href="/sports/json">/sports/json</a></p>
      </body>
    </html>
    """
    return HTMLResponse(content=html_page, status_code=200)


@app.get("/sports/json")
def get_sports_json():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, sport_name FROM ref_sports ORDER BY sport_name")
    rows = [row_to_dict(r) for r in cur.fetchall()]
    conn.close()
    return {"sports": rows}


# ====== GET /sports/{id} - нормативы для вида спорта ======
@app.get("/sports/{sport_id}", response_class=HTMLResponse)
def get_normatives_for_sport_html(sport_id: int):
    conn = get_conn()
    cur = conn.cursor()

    query = """
    SELECT 
        rs.sport_name AS sport_name,
        rd.discipline_name AS discipline_name,
        STRING_AGG(rpt.short_name || ': ' || rp.parameter_value, ', ') AS discipline_parameters,
        rr.short_name AS rank_short,
        rr.full_name AS rank_full,
        rr.prestige AS rank_prestige,
        rreq.requirement_value AS requirement_short,
        rreq.description AS requirement_desc,
        c.condition AS condition_value
    FROM conditions c
    JOIN normatives n ON c.normative_id = n.id
    JOIN ref_ranks rr ON n.rank_id = rr.id
    JOIN ref_requirements rreq ON c.requirement_id = rreq.id
    JOIN groups g ON n.id = g.normative_id
    JOIN lnk_discipline_parameters ldp ON g.discipline_parameter_id = ldp.id
    JOIN ref_disciplines rd ON ldp.discipline_id = rd.id
    JOIN ref_parameters rp ON ldp.parameter_id = rp.id
    JOIN ref_parameter_types rpt ON rp.parameter_type_id = rpt.id
    JOIN ref_sports rs ON rd.sport_id = rs.id
    WHERE rs.id = %s
    GROUP BY rs.sport_name, rd.discipline_name, rr.short_name, rr.full_name, rr.prestige, 
             rreq.requirement_value, rreq.description, c.condition
    ORDER BY rd.discipline_name, rr.prestige
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


@app.get("/sports/{sport_id}/json")
def get_normatives_for_sport_json(sport_id: int):
    conn = get_conn()
    cur = conn.cursor()
    query = """
    SELECT 
        rs.sport_name AS sport_name,
        rd.discipline_name AS discipline_name,
        STRING_AGG(rpt.short_name || ': ' || rp.parameter_value, ', ') AS discipline_parameters,
        rr.id AS rank_id,
        rr.short_name AS rank_short,
        rr.full_name AS rank_full,
        rr.prestige AS rank_prestige,
        rreq.id AS requirement_id,
        rreq.requirement_value AS requirement_short,
        rreq.description AS requirement_desc,
        c.condition AS condition_value
    FROM conditions c
    JOIN normatives n ON c.normative_id = n.id
    JOIN ref_ranks rr ON n.rank_id = rr.id
    JOIN ref_requirements rreq ON c.requirement_id = rreq.id
    JOIN groups g ON n.id = g.normative_id
    JOIN lnk_discipline_parameters ldp ON g.discipline_parameter_id = ldp.id
    JOIN ref_disciplines rd ON ldp.discipline_id = rd.id
    JOIN ref_parameters rp ON ldp.parameter_id = rp.id
    JOIN ref_parameter_types rpt ON rp.parameter_type_id = rpt.id
    JOIN ref_sports rs ON rd.sport_id = rs.id
    WHERE rs.id = %s
    GROUP BY rs.sport_name, rd.discipline_name, rr.id, rr.short_name, rr.full_name, rr.prestige,
             rreq.id, rreq.requirement_value, rreq.description, c.condition
    ORDER BY rd.discipline_name, rr.prestige
    """
    cur.execute(query, (sport_id,))
    rows = [row_to_dict(r) for r in cur.fetchall()]
    conn.close()
    return {"normatives": rows}


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


# ====== POST /parameter-types - добавить тип параметра ======
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


# ====== POST /parameters - добавить значение параметра ======
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


# ====== POST /link-parameters - привязать параметры к дисциплине ======
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


# ====== POST /normatives - добавление нормативов ======
@app.post("/normatives")
def add_normatives(payload: CreateNormativeIn):
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("SELECT id FROM ref_disciplines WHERE id = %s", (payload.discipline_id,))
    if not cur.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail=f"discipline_id {payload.discipline_id} not found")

    for ldp_id in payload.ldp_ids:
        cur.execute("SELECT discipline_id FROM lnk_discipline_parameters WHERE id = %s", (ldp_id,))
        row = cur.fetchone()
        if not row:
            conn.close()
            raise HTTPException(status_code=400, detail=f"lnk_discipline_parameters id {ldp_id} not found")
        if row["discipline_id"] != payload.discipline_id:
            conn.close()
            raise HTTPException(status_code=400,
                                detail=f"lnk_discipline_parameters id {ldp_id} does not belong to discipline_id {payload.discipline_id}")

    created = []
    errors = []

    try:
        for entry in payload.rank_entries:
            cur.execute("SELECT id FROM ref_ranks WHERE id = %s", (entry.rank_id,))
            if not cur.fetchone():
                errors.append({"rank_id": entry.rank_id, "error": "rank not found"})
                continue

            cur.execute("SELECT id FROM ref_requirements WHERE id = %s", (entry.requirement_id,))
            if not cur.fetchone():
                errors.append({"requirement_id": entry.requirement_id, "error": "requirement not found"})
                continue

            cur.execute("""INSERT INTO normatives (rank_id, sorting, remark) 
                          VALUES (%s, %s, %s) RETURNING id""",
                        (entry.rank_id, entry.sorting, entry.remark or ""))
            normative_row = cur.fetchone()
            normative_id = normative_row["id"]

            for ldp_id in payload.ldp_ids:
                cur.execute("INSERT INTO groups (discipline_parameter_id, normative_id) VALUES (%s, %s)",
                            (ldp_id, normative_id))

            cur.execute("""INSERT INTO conditions (normative_id, requirement_id, condition) 
                          VALUES (%s, %s, %s)""",
                        (normative_id, entry.requirement_id, entry.condition_value))

            created.append({
                "normative_id": normative_id,
                "rank_id": entry.rank_id,
                "requirement_id": entry.requirement_id,
                "condition_value": entry.condition_value,
                "linked_ldp_ids": payload.ldp_ids
            })
        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        raise HTTPException(status_code=500, detail=f"DB error: {e}")
    conn.close()
    return {"created": created, "errors": errors}


# ====== Дополнительные вспомогательные эндпоинты ======
@app.get("/disciplines/json")
def list_disciplines_json():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, sport_id, discipline_name FROM ref_disciplines ORDER BY discipline_name")
    rows = [row_to_dict(r) for r in cur.fetchall()]
    conn.close()
    return {"disciplines": rows}


@app.get("/parameters/json")
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


@app.get("/parameter_types/json")
def list_parameter_types_json():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, type_name as parameter_type_name FROM ref_parameters_types")
    rows = [row_to_dict(r) for r in cur.fetchall()]
    conn.close()
    return {"parameter_types": rows}


@app.get("/ldp/json")
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


@app.get("/ranks/json")
def list_ranks_json():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, short_name, full_name, prestige FROM ref_ranks ORDER BY prestige")
    rows = [row_to_dict(r) for r in cur.fetchall()]
    conn.close()
    return {"ranks": rows}


@app.get("/requirements/json")
def list_requirements_json():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, requirement_type_id, requirement_value, description FROM ref_requirements ORDER BY requirement_type_id")
    rows = [row_to_dict(r) for r in cur.fetchall()]
    conn.close()
    return {"requirements": rows}


# ====== DELETE endpoints ======
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


# ====== Домашняя страница ======
@app.get("/", response_class=HTMLResponse)
def index():
    return HTMLResponse("""
    <html><head><meta charset="utf-8"><title>SportNormativ API</title></head><body>
      <h2>SportNormativ API</h2>
      <ul>
        <li><a href="/sports">Виды спорта (HTML)</a></li>
        <li><a href="/sports/json">Виды спорта (JSON)</a></li>
        <li><a href="/disciplines/json">Справочник дисциплин</a></li>
        <li><a href="/parameters/json">Справочник параметров</a></li>
        <li><a href="/ldp/json">Связки дисциплина-параметр (lnk_discipline_parameters)</a></li>
        <li><a href="/ranks/json">Разряды (ref_ranks)</a></li>
        <li><a href="/requirements/json">Требования (ref_requirements)</a></li>
      </ul>
      <p>POST endpoints (JSON): /disciplines, /parameter-types, /parameters, /link-parameters, /normatives</p>
    </body></html>
    """, status_code=200)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
