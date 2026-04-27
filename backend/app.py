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
    sport_act_id: int
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
    condition_value: Optional[str] = None


class AdditionalRequirement(BaseModel):
    requirement_id: int  # ID из ref_requirements для дочернего условия
    value: str           # значение дочернего условия


class CreateNormativeIn(BaseModel):
    discipline_id: int
    ldp_ids: List[int]
    requirement_id: int
    rank_entries: List[RankEntry]
    additional_requirements: List[AdditionalRequirement] = []


class LinkDeletePayload(BaseModel):
    discipline_id: int
    parameter_id: int


# =============================================================================
# GET — справочники (не зависят от схемы дисциплин)
# =============================================================================

@app.get("/sports")
def get_sports_json():
    """Плоский список всех видов спорта."""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT s.id, s.sport_name, s.image_url, t.type_name
        FROM ref_sports s
        LEFT JOIN ref_sport_types t ON s.sport_type_id = t.id
        ORDER BY s.sport_name
    """)
    rows = [row_to_dict(r) for r in cur.fetchall()]
    conn.close()
    return {"sports": rows}


@app.get("/v_1/sports")
def get_sports_v1_json():
    """
    Виды спорта вместе с дисциплинами из ДЕЙСТВУЮЩИХ актов (end_date IS NULL).
    Используется фронтендом для первоначальной загрузки списка.
    """
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT
            s.id        AS sport_id,
            s.sport_name,
            s.image_url,
            t.type_name,
            d.id        AS discipline_id,
            d.discipline_name
        FROM ref_sports s
        LEFT JOIN ref_sport_types t ON s.sport_type_id = t.id
        LEFT JOIN sport_ministry_act a ON a.sport_id = s.id AND a.end_date IS NULL
        LEFT JOIN ref_disciplines d ON d.sport_act_id = a.id
        ORDER BY s.id, d.discipline_name
    """)
    rows = cur.fetchall()
    conn.close()

    sports_map = {}
    for row in rows:
        sid = row["sport_id"]
        if sid not in sports_map:
            sports_map[sid] = {
                "id": sid,
                "sport_name": row["sport_name"],
                "sport_type": row["type_name"],
                "image_url": row["image_url"],
                "disciplines": []
            }
        if row["discipline_id"] is not None:
            sports_map[sid]["disciplines"].append({
                "discipline_id": row["discipline_id"],
                "discipline_name": row["discipline_name"]
            })

    return {"sports": list(sports_map.values())}


@app.get("/v_2/sports/{sport_id}/disciplines")
def get_disciplines_for_sport_v2(
    sport_id: int,
    include_expired: bool = Query(
        False,
        description="Если true — возвращает дисциплины из всех актов, включая устаревшие"
    )
):
    """
    Основной эндпоинт для получения дисциплин по виду спорта.

    По умолчанию (include_expired=false) возвращает только дисциплины
    из действующего акта Минспорта (end_date IS NULL).

    При include_expired=true возвращает дисциплины из всех актов —
    используется в административном интерфейсе.
    """
    conn = get_conn()
    cur = conn.cursor()
    try:
        query = """
            SELECT
                d.id              AS discipline_id,
                d.discipline_name,
                d.discipline_code,
                a.id              AS act_id,
                a.start_date,
                a.end_date,
                a.act_details
            FROM ref_disciplines d
            JOIN sport_ministry_act a ON a.id = d.sport_act_id
            WHERE a.sport_id = %s
        """
        params = [sport_id]

        if not include_expired:
            query += " AND a.end_date IS NULL"

        query += " ORDER BY d.discipline_name"

        cur.execute(query, params)
        rows = [row_to_dict(r) for r in cur.fetchall()]
        return {
            "sport_id": sport_id,
            "disciplines": rows,
            "total_count": len(rows),
            "include_expired": include_expired
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# --- Устаревшие эндпоинты дисциплин (оставлены для обратной совместимости) ---

@app.get("/disciplines")
def list_disciplines_json(
    sport_id: Optional[int] = Query(None, description="Фильтр по виду спорта")
):
    """
    УСТАРЕЛ. Использовать GET /v_2/sports/{sport_id}/disciplines.
    Оставлен для обратной совместимости. Фильтрует по действующим актам.
    """
    conn = get_conn()
    cur = conn.cursor()
    try:
        if sport_id is not None:
            cur.execute("""
                SELECT d.id, d.discipline_name, d.discipline_code, a.sport_id
                FROM ref_disciplines d
                JOIN sport_ministry_act a ON a.id = d.sport_act_id
                WHERE a.sport_id = %s AND a.end_date IS NULL
                ORDER BY d.discipline_name
            """, (sport_id,))
        else:
            cur.execute("""
                SELECT d.id, d.discipline_name, d.discipline_code, a.sport_id
                FROM ref_disciplines d
                JOIN sport_ministry_act a ON a.id = d.sport_act_id
                WHERE a.end_date IS NULL
                ORDER BY d.discipline_name
            """)
        rows = [row_to_dict(r) for r in cur.fetchall()]
        return {"disciplines": rows, "total_count": len(rows)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.get("/v_1/disciplines/{sport_id}")
def list_disciplines_for_sport_v1_json(sport_id: int):
    """
    УСТАРЕЛ. Использовать GET /v_2/sports/{sport_id}/disciplines.
    Оставлен для обратной совместимости. Возвращает только действующие дисциплины.
    """
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT d.id AS discipline_id, d.discipline_name, d.discipline_code
            FROM ref_disciplines d
            JOIN sport_ministry_act a ON a.id = d.sport_act_id
            WHERE a.sport_id = %s AND a.end_date IS NULL
            ORDER BY d.discipline_name
        """, (sport_id,))
        rows = [row_to_dict(r) for r in cur.fetchall()]
        return {"sport_id": sport_id, "disciplines": rows, "total_count": len(rows)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# =============================================================================
# GET — параметры, требования, разряды (не изменились)
# =============================================================================

@app.get("/parameters")
def list_parameters_json():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT p.id, p.parameter_type_id, t.type_name AS parameter_type_name, p.parameter_value
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
    cur.execute("SELECT id, type_name AS parameter_type_name FROM ref_parameters_types")
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


@app.get("/discipline-parameters/{discipline_id}")
def list_ldp_for_discipline(discipline_id: int):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT
            l.id AS ldp_id,
            p.id,
            pt.type_name AS parameter_type_name,
            p.parameter_type_id,
            p.parameter_value
        FROM lnk_discipline_parameters l
        JOIN ref_parameters p ON l.parameter_id = p.id
        JOIN ref_parameters_types pt ON p.parameter_type_id = pt.id
        WHERE l.discipline_id = %s
        ORDER BY pt.type_name, p.parameter_value
    """, (discipline_id,))
    rows = [row_to_dict(r) for r in cur.fetchall()]
    conn.close()
    return {"lnk_discipline_parameters": rows}


@app.get("/ranks")
def list_ranks_json():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, short_name, full_name, prestige FROM ref_ranks ORDER BY prestige DESC")
    rows = [row_to_dict(r) for r in cur.fetchall()]
    conn.close()
    return {"ranks": rows}


# =============================================================================
# GET — нормативы по виду спорта (HTML, для отладки)
# =============================================================================

@app.get("/sports/{sport_id}", response_class=HTMLResponse)
def get_normatives_for_sport_html(sport_id: int):
    """HTML-представление нормативов для вида спорта. Только действующие акты."""
    conn = get_conn()
    cur = conn.cursor()

    query = """
        SELECT
            rs.sport_name                                                        AS sport_name,
            rd.discipline_name                                                   AS discipline_name,
            rd.discipline_code                                                   AS discipline_code,
            STRING_AGG(
                rpt.type_name || ': ' || rp.parameter_value, ', '
                ORDER BY rpt.type_name, rp.parameter_value
            )                                                                    AS discipline_parameters,
            rr.short_name                                                        AS rank_short,
            rr.full_name                                                         AS rank_full,
            rr.prestige                                                          AS rank_prestige,
            rreq.requirement_value                                               AS requirement_short,
            rreq.description                                                     AS requirement_desc,
            c.condition                                                          AS condition_value,
            rr.id                                                                AS rank_id,
            rd.id                                                                AS discipline_id,
            n.id                                                                 AS normative_id
        FROM conditions c
        JOIN normatives n       ON c.normative_id = n.id
        JOIN ref_ranks rr       ON n.rank_id = rr.id
        JOIN ref_requirements rreq ON c.requirement_id = rreq.id
        JOIN groups g           ON n.id = g.normative_id
        JOIN lnk_discipline_parameters ldp ON g.discipline_parameter_id = ldp.id
        JOIN ref_disciplines rd ON ldp.discipline_id = rd.id
        JOIN ref_parameters rp  ON ldp.parameter_id = rp.id
        JOIN ref_parameters_types rpt ON rp.parameter_type_id = rpt.id
        JOIN sport_ministry_act sma ON sma.id = rd.sport_act_id
        JOIN ref_sports rs      ON rs.id = sma.sport_id
        WHERE rs.id = %s
          AND sma.end_date IS NULL
        GROUP BY
            rs.sport_name, rd.discipline_name, rd.discipline_code,
            rr.short_name, rr.full_name, rr.prestige,
            rreq.requirement_value, rreq.description,
            c.condition, rr.id, rd.id, n.id
        ORDER BY rd.discipline_name, rr.prestige DESC, rr.id
    """
    cur.execute(query, (sport_id,))
    rows = cur.fetchall()
    conn.close()

    if not rows:
        return HTMLResponse(
            content=f"<html><body><h3>Нет нормативов для вида спорта id={sport_id}</h3></body></html>",
            status_code=200
        )

    sport_name = rows[0]["sport_name"]
    header = f"""
    <html><head><meta charset="utf-8"><title>Нормативы</title></head><body>
    <h2>Нормативы для вида спорта: {html.escape(sport_name)}</h2>
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
    body_rows = ""
    for r in rows:
        params = r["discipline_parameters"] or ""
        req = r["requirement_short"] or ""
        req_desc = r["requirement_desc"] or ""
        req_cell = html.escape(req)
        if req_desc:
            req_cell += f" ({html.escape(req_desc)})"
        body_rows += (
            f"<tr>"
            f"<td>{html.escape(r['sport_name'])}</td>"
            f"<td>{html.escape(r['discipline_name'])} ({html.escape(params)})</td>"
            f"<td>{html.escape(r['rank_short'])}</td>"
            f"<td>{req_cell}</td>"
            f"<td>{html.escape(r['condition_value'])}</td>"
            f"</tr>"
        )
    footer = "</tbody></table></body></html>"
    return HTMLResponse(content=header + body_rows + footer, status_code=200)


# =============================================================================
# GET — нормативы по виду спорта (JSON)
# =============================================================================

@app.get("/sports/{sport_id}/normatives")
def get_normatives_for_sport_json(sport_id: int):
    """Нормативы по виду спорта. Только действующие акты (end_date IS NULL)."""
    conn = get_conn()
    cur = conn.cursor()

    query = """
        SELECT
            rs.sport_name,
            rd.id                   AS discipline_id,
            rd.discipline_name,
            rd.discipline_code,
            rr.id                   AS rank_id,
            rr.short_name           AS rank_short,
            rr.full_name            AS rank_full,
            rr.prestige,
            rreq.requirement_value,
            rreq.description        AS requirement_desc,
            c.condition,
            n.id                    AS normative_id,
            rpt.type_name           AS param_type,
            rp.parameter_value      AS param_value
        FROM ref_sports rs
        JOIN sport_ministry_act sma ON sma.sport_id = rs.id AND sma.end_date IS NULL
        JOIN ref_disciplines rd     ON rd.sport_act_id = sma.id
        JOIN lnk_discipline_parameters ldp ON ldp.discipline_id = rd.id
        JOIN ref_parameters rp      ON rp.id = ldp.parameter_id
        JOIN ref_parameters_types rpt ON rpt.id = rp.parameter_type_id
        JOIN groups g               ON g.discipline_parameter_id = ldp.id
        JOIN normatives n           ON n.id = g.normative_id
        JOIN ref_ranks rr           ON rr.id = n.rank_id
        JOIN conditions c           ON c.normative_id = n.id
        JOIN ref_requirements rreq  ON rreq.id = c.requirement_id
        WHERE rs.id = %s
        ORDER BY rd.discipline_name, rr.prestige DESC, rpt.type_name, c.condition
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
        nid = row["normative_id"]
        if nid not in normatives_dict:
            normatives_dict[nid] = {
                "id": nid,
                "discipline_id": row["discipline_id"],
                "discipline_name": row["discipline_name"],
                "discipline_code": row["discipline_code"],
                "discipline_parameters": {},
                "rank_short": row["rank_short"],
                "rank_full": row["rank_full"],
                "rank_prestige": row["prestige"],
                "condition": {},
            }
        if row["param_type"] and row["param_value"]:
            normatives_dict[nid]["discipline_parameters"][row["param_type"]] = row["param_value"]
        if row["requirement_value"] and row["condition"]:
            normatives_dict[nid]["condition"][row["requirement_value"]] = row["condition"]

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
    """
    Нормативы по виду спорта, расширенный формат ответа.
    Только действующие акты (end_date IS NULL).
    """
    conn = get_conn()
    cur = conn.cursor()

    query = """
        SELECT
            rs.id                   AS sport_id,
            rs.sport_name,
            rd.id                   AS discipline_id,
            rd.discipline_name,
            rd.discipline_code,
            rr.id                   AS rank_id,
            rr.short_name           AS rank_short,
            rr.full_name            AS rank_full,
            rr.prestige             AS rank_prestige,
            rreq.requirement_value,
            c.condition,
            n.id                    AS normative_id,
            rpt.type_name           AS param_type,
            rp.parameter_value      AS param_value
        FROM ref_sports rs
        JOIN sport_ministry_act sma ON sma.sport_id = rs.id AND sma.end_date IS NULL
        JOIN ref_disciplines rd     ON rd.sport_act_id = sma.id
        JOIN lnk_discipline_parameters ldp ON ldp.discipline_id = rd.id
        JOIN ref_parameters rp      ON rp.id = ldp.parameter_id
        JOIN ref_parameters_types rpt ON rpt.id = rp.parameter_type_id
        JOIN groups g               ON g.discipline_parameter_id = ldp.id
        JOIN normatives n           ON n.id = g.normative_id
        JOIN ref_ranks rr           ON rr.id = n.rank_id
        JOIN conditions c           ON c.normative_id = n.id
        JOIN ref_requirements rreq  ON rreq.id = c.requirement_id
        WHERE rs.id = %s
        ORDER BY rd.discipline_name, rr.prestige DESC
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
        if row["param_type"] and row["param_value"]:
            normatives[nid]["discipline_parameters"][row["param_type"]] = row["param_value"]
        if row["requirement_value"] and row["condition"]:
            normatives[nid]["conditions"][row["requirement_value"]] = row["condition"]

    normatives_list = list(normatives.values())
    return {
        "sport_id": rows[0]["sport_id"],
        "sport_name": rows[0]["sport_name"],
        "normatives": normatives_list,
        "total_count": len(normatives_list)
    }


# =============================================================================
# GET — нормативы по дисциплине
# =============================================================================

@app.get("/v_1/disciplines/{discipline_id}/normatives")
def get_normatives_by_discipline_v1_json(discipline_id: int):
    """
    Нормативы по конкретной дисциплине с деревом условий (parent_id).
    Тип условия определяется по requirement_type_id:
      1 → "norm" (нормативное), 2 → "comp" (соревновательное), иное → "other"
    """
    conn = get_conn()
    cur = conn.cursor()

    query = """
        SELECT
            rs.id                       AS sport_id,
            rs.sport_name,
            rd.id                       AS discipline_id,
            rd.discipline_name,
            rd.discipline_code,
            n.id                        AS normative_id,
            rr.id                       AS rank_id,
            rr.short_name               AS rank_short,
            rr.full_name                AS rank_full,
            rr.prestige                 AS rank_prestige,
            rpt.type_name               AS param_type,
            rp.parameter_value          AS param_value,
            rreq.requirement_type_id    AS requirement_type_id,
            rreq.requirement_value      AS condition_name,
            c.condition                 AS condition_value,
            c.id                        AS condition_id,
            c.parent_id                 AS condition_parent_id
        FROM normatives n
        JOIN groups g               ON g.normative_id = n.id
        JOIN lnk_discipline_parameters ldp ON ldp.id = g.discipline_parameter_id
        JOIN ref_disciplines rd     ON rd.id = ldp.discipline_id
        JOIN sport_ministry_act sma ON sma.id = rd.sport_act_id
        JOIN ref_sports rs          ON rs.id = sma.sport_id
        JOIN ref_parameters rp      ON rp.id = ldp.parameter_id
        JOIN ref_parameters_types rpt ON rpt.id = rp.parameter_type_id
        JOIN conditions c           ON c.normative_id = n.id
        JOIN ref_requirements rreq  ON rreq.id = c.requirement_id
        JOIN ref_ranks rr           ON rr.id = n.rank_id
        WHERE rd.id = %s
        ORDER BY n.id, c.parent_id NULLS FIRST, c.id
    """
    cur.execute(query, (discipline_id,))
    rows = cur.fetchall()
    conn.close()

    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"Discipline {discipline_id} not found or has no normatives"
        )

    first = rows[0]
    normatives = {}

    for row in rows:
        nid = row["normative_id"]
        if nid not in normatives:
            normatives[nid] = {
                "id": nid,
                "rank": {
                    "id": row["rank_id"],
                    "short": row["rank_short"],
                    "full": row["rank_full"],
                    "prestige": row["rank_prestige"],
                },
                "discipline_parameters": [],
                "_all_conditions": {},
                "conditions": []
            }

        normative = normatives[nid]

        # Параметры дисциплины (дедупликация по типу)
        if row["param_type"]:
            if not any(p["type"] == row["param_type"] for p in normative["discipline_parameters"]):
                normative["discipline_parameters"].append({
                    "type": row["param_type"],
                    "value": row["param_value"]
                })

        # Условия (плоский сбор, затем строим дерево)
        cond_id = row["condition_id"]
        if cond_id not in normative["_all_conditions"]:
            req_type = row["requirement_type_id"]
            if req_type == 1:
                ctype = "norm"
            elif req_type == 2:
                ctype = "comp"
            else:
                ctype = "other"

            normative["_all_conditions"][cond_id] = {
                "id": cond_id,
                "type": ctype,
                "name": row["condition_name"],
                "value": row["condition_value"],
                "parent_id": row["condition_parent_id"],
                "additional": []
            }

    # Второй проход: строим дерево условий через parent_id
    for normative in normatives.values():
        all_conds = normative["_all_conditions"]
        roots = []
        for cond in all_conds.values():
            pid = cond["parent_id"]
            if pid and pid in all_conds:
                all_conds[pid]["additional"].append(cond)
            else:
                roots.append(cond)
        normative["conditions"] = roots
        normative["is_competitive"] = any(c["type"] == "comp" for c in roots)
        del normative["_all_conditions"]

    return {
        "sport_id": first["sport_id"],
        "sport_name": first["sport_name"],
        "discipline_id": first["discipline_id"],
        "discipline_name": first["discipline_name"],
        "discipline_code": first["discipline_code"],
        "normatives": list(normatives.values()),
        "total_count": len(normatives),
    }


# =============================================================================
# GET — норматив по ID
# =============================================================================

@app.get("/normative/{normative_id}")
def get_normative_by_id_json(normative_id: int):
    conn = get_conn()
    cur = conn.cursor()

    query = """
        SELECT
            rs.id               AS sport_id,
            rs.sport_name,
            rd.id               AS discipline_id,
            rd.discipline_name,
            rd.discipline_code,
            rr.id               AS rank_id,
            rr.short_name       AS rank_short,
            rr.full_name        AS rank_full,
            rr.prestige,
            rreq.requirement_value,
            rreq.description    AS requirement_desc,
            c.condition,
            n.id                AS normative_id,
            rpt.type_name       AS param_type,
            rp.parameter_value  AS param_value
        FROM normatives n
        JOIN conditions c           ON c.normative_id = n.id
        JOIN ref_ranks rr           ON rr.id = n.rank_id
        JOIN ref_requirements rreq  ON rreq.id = c.requirement_id
        JOIN groups g               ON g.normative_id = n.id
        JOIN lnk_discipline_parameters ldp ON ldp.id = g.discipline_parameter_id
        JOIN ref_disciplines rd     ON rd.id = ldp.discipline_id
        JOIN ref_parameters rp      ON rp.id = ldp.parameter_id
        JOIN ref_parameters_types rpt ON rpt.id = rp.parameter_type_id
        JOIN sport_ministry_act sma ON sma.id = rd.sport_act_id
        JOIN ref_sports rs          ON rs.id = sma.sport_id
        WHERE n.id = %s
        ORDER BY rpt.type_name, c.condition
    """
    try:
        cur.execute(query, (normative_id,))
        rows = cur.fetchall()

        if not rows:
            return {"error": "Норматив не найден", "normative_id": normative_id, "exists": False}

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
        for row in rows:
            if row["param_type"] and row["param_value"]:
                result["discipline_parameters"][row["param_type"]] = row["param_value"]
            if row["requirement_value"] and row["condition"]:
                result["conditions"][row["requirement_value"]] = row["condition"]
        return result

    except Exception as e:
        return {"error": str(e), "normative_id": normative_id, "success": False}
    finally:
        conn.close()


@app.get("/v_1/normative/{normative_id}")
def get_normative_by_id_v1_json(normative_id: int):
    conn = get_conn()
    cur = conn.cursor()

    query = """
        SELECT
            rs.id               AS sport_id,
            rs.sport_name,
            rd.id               AS discipline_id,
            rd.discipline_name,
            rd.discipline_code,
            rr.id               AS rank_id,
            rr.short_name       AS rank_short,
            rr.full_name        AS rank_full,
            rr.prestige         AS rank_prestige,
            rreq.requirement_value,
            c.condition,
            rpt.type_name       AS param_type,
            rp.parameter_value  AS param_value
        FROM normatives n
        JOIN ref_ranks rr           ON rr.id = n.rank_id
        JOIN conditions c           ON c.normative_id = n.id
        JOIN ref_requirements rreq  ON rreq.id = c.requirement_id
        JOIN groups g               ON g.normative_id = n.id
        JOIN lnk_discipline_parameters ldp ON ldp.id = g.discipline_parameter_id
        JOIN ref_disciplines rd     ON rd.id = ldp.discipline_id
        JOIN ref_parameters rp      ON rp.id = ldp.parameter_id
        JOIN ref_parameters_types rpt ON rpt.id = rp.parameter_type_id
        JOIN sport_ministry_act sma ON sma.id = rd.sport_act_id
        JOIN ref_sports rs          ON rs.id = sma.sport_id
        WHERE n.id = %s
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
        "sport": {"id": first["sport_id"], "name": first["sport_name"]},
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


# =============================================================================
# POST — справочники
# =============================================================================

@app.post("/disciplines")
def add_disciplines(payload: DisciplinesIn):
    """
    Создаёт дисциплины и привязывает их к акту Минспорта через sport_act_id.
    Принимает sport_act_id (не sport_id) — дисциплины привязываются к акту напрямую.
    """
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    inserted = []
    errors = []

    if len(payload.discipline_names) != len(payload.discipline_codes):
        conn.close()
        return {"inserted": [], "errors": ["Количество названий и кодов дисциплин не совпадает."]}

    # Проверяем, что акт существует
    cur.execute("SELECT id FROM sport_ministry_act WHERE id = %s", (payload.sport_act_id,))
    if not cur.fetchone():
        conn.close()
        raise HTTPException(
            status_code=400,
            detail=f"sport_act_id {payload.sport_act_id} не найден в sport_ministry_act"
        )

    for name, code in zip(payload.discipline_names, payload.discipline_codes):
        name = name.strip()
        code = code.strip()
        if not name or not code:
            continue
        try:
            cur.execute(
                """
                INSERT INTO ref_disciplines (sport_act_id, discipline_code, discipline_name)
                VALUES (%s, %s, %s)
                RETURNING id, discipline_name, discipline_code
                """,
                (payload.sport_act_id, code, name)
            )
            row = cur.fetchone()
            inserted.append(dict(row))
            conn.commit()
        except psycopg2.errors.UniqueViolation:
            conn.rollback()
            cur.execute(
                """
                SELECT id, discipline_name, discipline_code
                FROM ref_disciplines
                WHERE (discipline_name = %s OR discipline_code = %s)
                  AND sport_act_id = %s
                """,
                (name, code, payload.sport_act_id)
            )
            row = cur.fetchone()
            if row:
                inserted.append({**dict(row), "note": "already exists"})
            else:
                errors.append({
                    "discipline_name": name,
                    "discipline_code": code,
                    "error": "unique constraint violated but record not found"
                })
        except Exception as e:
            conn.rollback()
            errors.append({"discipline_name": name, "discipline_code": code, "error": str(e)})

    cur.close()
    conn.close()
    return {"inserted": inserted, "errors": errors}


@app.post("/parameter-types")
def add_parameter_type(payload: ParameterTypeIn):
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO ref_parameters_types (type_name) VALUES (%s) RETURNING id",
            (payload.short_name.strip(),)
        )
        row = cur.fetchone()
        nid = row["id"]
        conn.commit()
    except Exception as e:
        if "unique" in str(e).lower():
            conn.rollback()
            cur.execute(
                "SELECT id FROM ref_parameters_types WHERE type_name = %s",
                (payload.short_name.strip(),)
            )
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
        raise HTTPException(
            status_code=400,
            detail=f"parameter_type_id {payload.parameter_type_id} not found"
        )
    try:
        cur.execute(
            "INSERT INTO ref_parameters (parameter_type_id, parameter_value) VALUES (%s, %s) RETURNING id",
            (payload.parameter_type_id, payload.parameter_value.strip())
        )
        row = cur.fetchone()
        pid = row["id"]
        conn.commit()
    except Exception as e:
        if "unique" in str(e).lower():
            conn.rollback()
            cur.execute(
                "SELECT id FROM ref_parameters WHERE parameter_type_id = %s AND parameter_value = %s",
                (payload.parameter_type_id, payload.parameter_value.strip())
            )
            row = cur.fetchone()
            pid = row["id"] if row else None
        else:
            pid = None
    conn.close()
    return {"id": pid, "parameter_value": payload.parameter_value, "parameter_type_id": payload.parameter_type_id}


@app.post("/requirements")
def add_requirement(payload: RequirementIn):
    """
    ИСПРАВЛЕН БАГ: в оригинале fallback при UniqueViolation использовал
    payload.parameter_type_id / payload.parameter_value (поля от ParameterIn).
    Теперь корректно использует payload.requirement_type_id / payload.requirement_value.
    """
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id FROM ref_requirements_types WHERE id = %s", (payload.requirement_type_id,))
    if not cur.fetchone():
        conn.close()
        raise HTTPException(
            status_code=400,
            detail=f"requirement_type_id {payload.requirement_type_id} not found"
        )
    try:
        cur.execute(
            """
            INSERT INTO ref_requirements (requirement_type_id, requirement_value, description)
            VALUES (%s, %s, %s)
            RETURNING id
            """,
            (
                payload.requirement_type_id,
                payload.requirement_value.strip(),
                payload.description.strip() if payload.description else None
            )
        )
        row = cur.fetchone()
        pid = row["id"]
        conn.commit()
    except Exception as e:
        if "unique" in str(e).lower():
            conn.rollback()
            # ИСПРАВЛЕНО: используем правильные поля модели RequirementIn
            cur.execute(
                "SELECT id FROM ref_requirements WHERE requirement_type_id = %s AND requirement_value = %s",
                (payload.requirement_type_id, payload.requirement_value.strip())
            )
            row = cur.fetchone()
            pid = row["id"] if row else None
        else:
            pid = None
    conn.close()
    return {
        "id": pid,
        "requirement_value": payload.requirement_value,
        "requirement_type_id": payload.requirement_type_id
    }


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
            cur.execute(
                "INSERT INTO lnk_discipline_parameters (discipline_id, parameter_id) VALUES (%s, %s) RETURNING id",
                (payload.discipline_id, pid)
            )
            row = cur.fetchone()
            inserted.append({"id": row["id"], "discipline_id": payload.discipline_id, "parameter_id": pid})
        except Exception as e:
            if "unique" in str(e).lower():
                conn.rollback()
                cur.execute(
                    "SELECT id FROM lnk_discipline_parameters WHERE discipline_id = %s AND parameter_id = %s",
                    (payload.discipline_id, pid)
                )
                row = cur.fetchone()
                if row:
                    inserted.append({
                        "id": row["id"],
                        "discipline_id": payload.discipline_id,
                        "parameter_id": pid,
                        "note": "already exists"
                    })
                else:
                    errors.append({"parameter_id": pid, "error": str(e)})
            else:
                errors.append({"parameter_id": pid, "error": str(e)})
    conn.commit()
    conn.close()
    return {"inserted": inserted, "errors": errors}


# =============================================================================
# POST — создание норматива
# =============================================================================

@app.post("/normatives")
def add_normatives(payload: CreateNormativeIn):
    """
    Создаёт нормативы для нескольких разрядов за один вызов.

    Логика дедупликации для каждого rank_entry:
      - Ищем норматив с тем же rank_id И точно тем же набором ldp_ids.
      - Не найден → создаём normative + groups + condition → попадает в created[].
      - Найден, условие новое → добавляем только condition → попадает в updated_existing[].
      - Найден, условие уже есть → тихий пропуск → попадает в skipped_conflicts[].

    Дополнительные условия (additional_requirements) записываются в таблицу conditions
    с parent_id = id основного условия этого rank_entry.
    """
    conn = get_conn()
    cur = conn.cursor()

    # Валидация discipline_id
    cur.execute("SELECT id FROM ref_disciplines WHERE id = %s", (payload.discipline_id,))
    if not cur.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail=f"discipline_id {payload.discipline_id} not found")

    # Валидация ldp_ids — все должны принадлежать указанной дисциплине
    for ldp_id in payload.ldp_ids:
        cur.execute("SELECT discipline_id FROM lnk_discipline_parameters WHERE id = %s", (ldp_id,))
        row = cur.fetchone()
        if not row:
            conn.close()
            raise HTTPException(status_code=400, detail=f"ldp_id {ldp_id} not found")
        if row["discipline_id"] != payload.discipline_id:
            conn.close()
            raise HTTPException(
                status_code=400,
                detail=f"ldp_id {ldp_id} does not belong to discipline_id {payload.discipline_id}"
            )

    # Валидация requirement_id
    cur.execute("SELECT id FROM ref_requirements WHERE id = %s", (payload.requirement_id,))
    if not cur.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail=f"requirement_id {payload.requirement_id} not found")

    # Валидация requirement_id для дополнительных условий
    for add_req in payload.additional_requirements:
        cur.execute("SELECT id FROM ref_requirements WHERE id = %s", (add_req.requirement_id,))
        if not cur.fetchone():
            conn.close()
            raise HTTPException(
                status_code=400,
                detail=f"additional requirement_id {add_req.requirement_id} not found"
            )

    sorted_ldp_ids = sorted(payload.ldp_ids)
    ldp_count = len(sorted_ldp_ids)

    created = []
    used_existing = []
    skipped = []

    try:
        for entry in payload.rank_entries:
            # Пропускаем пустые значения
            if not entry.condition_value:
                continue

            # Ищем норматив с тем же rank_id и точно тем же набором ldp_ids
            cur.execute("""
                SELECT n.id
                FROM normatives n
                JOIN groups g ON g.normative_id = n.id
                WHERE n.rank_id = %s
                GROUP BY n.id
                HAVING COUNT(DISTINCT g.discipline_parameter_id) = %s
                   AND array_agg(DISTINCT g.discipline_parameter_id ORDER BY g.discipline_parameter_id) = %s
                LIMIT 1
            """, (entry.rank_id, ldp_count, sorted_ldp_ids))

            existing = cur.fetchone()

            if existing:
                normative_id = existing["id"]

                # Проверяем дубль условия
                cur.execute("""
                    SELECT id FROM conditions
                    WHERE normative_id = %s
                      AND requirement_id = %s
                      AND condition = %s
                    LIMIT 1
                """, (normative_id, payload.requirement_id, entry.condition_value))

                if cur.fetchone():
                    skipped.append({
                        "rank_id": entry.rank_id,
                        "normative_id": normative_id,
                        "reason": "condition already exists"
                    })
                    continue

                # Добавляем новое условие к существующему нормативу
                cur.execute("""
                    INSERT INTO conditions (normative_id, requirement_id, condition, parent_id)
                    VALUES (%s, %s, %s, NULL)
                    RETURNING id
                """, (normative_id, payload.requirement_id, entry.condition_value))
                condition_id = cur.fetchone()["id"]

                # Дополнительные условия (дочерние через parent_id)
                for add_req in payload.additional_requirements:
                    cur.execute("""
                        INSERT INTO conditions (normative_id, requirement_id, condition, parent_id)
                        VALUES (%s, %s, %s, %s)
                    """, (normative_id, add_req.requirement_id, add_req.value, condition_id))

                used_existing.append({
                    "rank_id": entry.rank_id,
                    "normative_id": normative_id,
                    "condition_id": condition_id
                })

            else:
                # Создаём новый норматив
                cur.execute(
                    "INSERT INTO normatives (rank_id) VALUES (%s) RETURNING id",
                    (entry.rank_id,)
                )
                normative_id = cur.fetchone()["id"]

                # Привязываем параметры через groups
                for ldp_id in sorted_ldp_ids:
                    cur.execute(
                        "INSERT INTO groups (discipline_parameter_id, normative_id) VALUES (%s, %s)",
                        (ldp_id, normative_id)
                    )

                # Основное условие
                cur.execute("""
                    INSERT INTO conditions (normative_id, requirement_id, condition, parent_id)
                    VALUES (%s, %s, %s, NULL)
                    RETURNING id
                """, (normative_id, payload.requirement_id, entry.condition_value))
                condition_id = cur.fetchone()["id"]

                # Дополнительные условия (дочерние через parent_id)
                for add_req in payload.additional_requirements:
                    cur.execute("""
                        INSERT INTO conditions (normative_id, requirement_id, condition, parent_id)
                        VALUES (%s, %s, %s, %s)
                    """, (normative_id, add_req.requirement_id, add_req.value, condition_id))

                created.append({
                    "rank_id": entry.rank_id,
                    "normative_id": normative_id,
                    "condition_id": condition_id
                })

        conn.commit()

    except Exception as e:
        conn.rollback()
        conn.close()
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    conn.close()
    return {
        "created": created,
        "updated_existing": used_existing,
        "skipped_conflicts": skipped
    }


# =============================================================================
# DELETE
# =============================================================================

@app.delete("/normative/{normative_id}")
def delete_normative(normative_id: int):
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM normatives WHERE id = %s", (normative_id,))
        if not cur.fetchone():
            return {"success": False, "error": f"Норматив с ID {normative_id} не найден", "normative_id": normative_id}

        # Получаем информацию для ответа
        cur.execute("""
            SELECT rd.discipline_name, rr.short_name AS rank_short
            FROM normatives n
            JOIN groups g ON g.normative_id = n.id
            JOIN lnk_discipline_parameters ldp ON ldp.id = g.discipline_parameter_id
            JOIN ref_disciplines rd ON rd.id = ldp.discipline_id
            JOIN ref_ranks rr ON rr.id = n.rank_id
            WHERE n.id = %s
            LIMIT 1
        """, (normative_id,))
        info = cur.fetchone()
        discipline_name = info["discipline_name"] if info else "Неизвестно"
        rank_short = info["rank_short"] if info else "Неизвестно"

        # Порядок удаления: сначала дочерние conditions (по parent_id), затем корневые, затем groups, затем normative
        cur.execute(
            "DELETE FROM conditions WHERE normative_id = %s AND parent_id IS NOT NULL",
            (normative_id,)
        )
        cur.execute(
            "DELETE FROM conditions WHERE normative_id = %s",
            (normative_id,)
        )
        conditions_deleted = cur.rowcount

        cur.execute("DELETE FROM groups WHERE normative_id = %s", (normative_id,))
        groups_deleted = cur.rowcount

        cur.execute("DELETE FROM normatives WHERE id = %s", (normative_id,))
        conn.commit()

        return {
            "success": True,
            "message": "Норматив успешно удалён",
            "normative_id": normative_id,
            "details": {
                "discipline": discipline_name,
                "rank": rank_short,
                "conditions_deleted": conditions_deleted,
                "groups_deleted": groups_deleted,
            }
        }
    except Exception as e:
        conn.rollback()
        error_msg = str(e)
        if "foreign key constraint" in error_msg.lower():
            return {
                "success": False,
                "error": "Невозможно удалить норматив: существуют зависимые записи.",
                "normative_id": normative_id
            }
        return {"success": False, "error": error_msg, "normative_id": normative_id}
    finally:
        conn.close()


@app.delete("/disciplines/{discipline_id}")
def delete_discipline(discipline_id: int):
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM ref_disciplines WHERE id = %s", (discipline_id,))
        conn.commit()
        return {"deleted": discipline_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.delete("/parameter-types/{id}")
def delete_param_type(id: int):
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM ref_parameters_types WHERE id = %s", (id,))
        conn.commit()
        return {"deleted": id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.delete("/parameters/{id}")
def delete_parameter(id: int):
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM ref_parameters WHERE id = %s", (id,))
        conn.commit()
        return {"deleted": id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.delete("/requirements/{id}")
def delete_requirement(id: int):
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM ref_requirements WHERE id = %s", (id,))
        conn.commit()
        return {"deleted": id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@app.delete("/link-parameters")
def delete_link(payload: LinkDeletePayload):
    """Удаляет конкретную связь дисциплина × параметр."""
    conn = None
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM lnk_discipline_parameters WHERE discipline_id = %s AND parameter_id = %s",
            (payload.discipline_id, payload.parameter_id)
        )
        deleted_rows = cur.rowcount
        conn.commit()

        if deleted_rows == 0:
            return {"status": "not_found", "message": "Связь не найдена или уже удалена."}

        return {
            "status": "deleted",
            "discipline_id": payload.discipline_id,
            "parameter_id": payload.parameter_id
        }
    except (Exception, psycopg2.Error) as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail="Внутренняя ошибка сервера при удалении связи.")
    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=8000)
