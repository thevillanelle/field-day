"""
Commons — SQLite database layer v1.0.0

Tables:
  players      — registered users + vibe quiz results
  events       — matching events (stamp mode or bell mode)
  registrations — who signed up for which event
  matches      — paired players
  postcards    — async messages between matched players
  sessions     — game sessions within a match
"""

from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
# Vercel serverless only allows writes to /tmp — fall back there if data/ isn't writable
_data_dir = BASE_DIR / "data"
try:
    _data_dir.mkdir(parents=True, exist_ok=True)
    DB_PATH = _data_dir / "commons.db"
except OSError:
    DB_PATH = Path("/tmp/commons.db")
DATA_DIR = _data_dir


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    with get_conn() as conn:

        # ── Players ──────────────────────────────────────────────────────────
        conn.execute("""
            CREATE TABLE IF NOT EXISTS players (
                id              TEXT PRIMARY KEY,
                name            TEXT NOT NULL,
                email           TEXT UNIQUE NOT NULL,
                location        TEXT NOT NULL,
                region          TEXT NOT NULL,
                vibe_type       TEXT DEFAULT NULL,
                quiz_answers    TEXT DEFAULT '{}',
                drawing_pref    TEXT DEFAULT 'fine',
                duration_pref   TEXT DEFAULT 'medium',
                is_active       INTEGER DEFAULT 1,
                created_at      TEXT DEFAULT (datetime('now')),
                updated_at      TEXT DEFAULT (datetime('now'))
            )
        """)

        # ── Events ───────────────────────────────────────────────────────────
        conn.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id                  TEXT PRIMARY KEY,
                name                TEXT NOT NULL,
                mode                TEXT NOT NULL DEFAULT 'stamp',
                status              TEXT NOT NULL DEFAULT 'draft',
                registration_opens  TEXT,
                registration_closes TEXT,
                match_drop_at       TEXT,
                play_window_start   TEXT,
                play_window_end     TEXT,
                created_by          TEXT,
                created_at          TEXT DEFAULT (datetime('now'))
            )
        """)

        # ── Registrations ────────────────────────────────────────────────────
        conn.execute("""
            CREATE TABLE IF NOT EXISTS registrations (
                id            TEXT PRIMARY KEY,
                event_id      TEXT NOT NULL REFERENCES events(id),
                player_id     TEXT NOT NULL REFERENCES players(id),
                status        TEXT DEFAULT 'registered',
                registered_at TEXT DEFAULT (datetime('now')),
                UNIQUE(event_id, player_id)
            )
        """)

        # ── Matches ──────────────────────────────────────────────────────────
        conn.execute("""
            CREATE TABLE IF NOT EXISTS matches (
                id           TEXT PRIMARY KEY,
                event_id     TEXT REFERENCES events(id),
                player_1_id  TEXT NOT NULL REFERENCES players(id),
                player_2_id  TEXT NOT NULL REFERENCES players(id),
                mode         TEXT DEFAULT 'stamp',
                suggested_game TEXT DEFAULT NULL,
                match_reason TEXT DEFAULT '{}',
                status       TEXT DEFAULT 'active',
                created_at   TEXT DEFAULT (datetime('now')),
                expires_at   TEXT DEFAULT NULL
            )
        """)

        # ── Postcards ────────────────────────────────────────────────────────
        conn.execute("""
            CREATE TABLE IF NOT EXISTS postcards (
                id             TEXT PRIMARY KEY,
                match_id       TEXT NOT NULL REFERENCES matches(id),
                from_player_id TEXT NOT NULL REFERENCES players(id),
                to_player_id   TEXT NOT NULL REFERENCES players(id),
                type           TEXT DEFAULT 'note',
                content        TEXT DEFAULT '{}',
                is_read        INTEGER DEFAULT 0,
                created_at     TEXT DEFAULT (datetime('now'))
            )
        """)

        # ── Game sessions ────────────────────────────────────────────────────
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id           TEXT PRIMARY KEY,
                match_id     TEXT NOT NULL REFERENCES matches(id),
                game_slug    TEXT NOT NULL,
                status       TEXT DEFAULT 'active',
                result       TEXT DEFAULT '{}',
                started_at   TEXT DEFAULT (datetime('now')),
                completed_at TEXT DEFAULT NULL
            )
        """)

    print("[db] Commons database initialised")


# ── Helpers: region from location ────────────────────────────────────────────
LOCATION_REGION: dict[str, str] = {
    "Austin":    "AMER",
    "Elk Grove": "AMER",
    "Raleigh":   "AMER",
    "Singapore": "APAC",
    # future locations slot in here
}

def region_for(location: str) -> str:
    return LOCATION_REGION.get(location, "AMER")


# ── Players ───────────────────────────────────────────────────────────────────

def row_to_player(row) -> dict:
    return {
        "id":           row["id"],
        "name":         row["name"],
        "email":        row["email"],
        "location":     row["location"],
        "region":       row["region"],
        "vibe_type":    row["vibe_type"],
        "quiz_answers": json.loads(row["quiz_answers"] or "{}"),
        "drawing_pref": row["drawing_pref"],
        "duration_pref":row["duration_pref"],
        "is_active":    bool(row["is_active"]),
        "created_at":   row["created_at"],
    }


def get_all_players() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM players ORDER BY name").fetchall()
    return [row_to_player(r) for r in rows]


def get_player(player_id: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM players WHERE id=?", (player_id,)).fetchone()
    return row_to_player(row) if row else None


def get_player_by_email(email: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM players WHERE LOWER(email)=LOWER(?)", (email,)
        ).fetchone()
    return row_to_player(row) if row else None


def upsert_player(data: dict) -> dict:
    """Create or update a player record."""
    import uuid as _uuid
    existing = get_player_by_email(data["email"])
    player_id = existing["id"] if existing else "p" + _uuid.uuid4().hex[:10]
    now = datetime.now(timezone.utc).isoformat()

    with get_conn() as conn:
        conn.execute("""
            INSERT INTO players
              (id, name, email, location, region, vibe_type,
               quiz_answers, drawing_pref, duration_pref, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(email) DO UPDATE SET
              name         = excluded.name,
              location     = excluded.location,
              region       = excluded.region,
              vibe_type    = excluded.vibe_type,
              quiz_answers = excluded.quiz_answers,
              drawing_pref = excluded.drawing_pref,
              duration_pref= excluded.duration_pref,
              updated_at   = excluded.updated_at
        """, (
            player_id,
            data["name"],
            data["email"],
            data["location"],
            region_for(data["location"]),
            data.get("vibe_type"),
            json.dumps(data.get("quiz_answers", {})),
            data.get("drawing_pref", "fine"),
            data.get("duration_pref", "medium"),
            now, now,
        ))
    return get_player_by_email(data["email"])


# ── Events ────────────────────────────────────────────────────────────────────

def row_to_event(row) -> dict:
    return {
        "id":                   row["id"],
        "name":                 row["name"],
        "mode":                 row["mode"],
        "status":               row["status"],
        "registration_opens":   row["registration_opens"],
        "registration_closes":  row["registration_closes"],
        "match_drop_at":        row["match_drop_at"],
        "play_window_start":    row["play_window_start"],
        "play_window_end":      row["play_window_end"],
        "created_by":           row["created_by"],
        "created_at":           row["created_at"],
    }


def get_all_events() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM events ORDER BY created_at DESC"
        ).fetchall()
    return [row_to_event(r) for r in rows]


def get_event(event_id: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM events WHERE id=?", (event_id,)).fetchone()
    return row_to_event(row) if row else None


def get_active_events() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM events WHERE status IN ('open','active') ORDER BY created_at DESC"
        ).fetchall()
    return [row_to_event(r) for r in rows]


def upsert_event(data: dict) -> dict:
    import uuid as _uuid
    event_id = data.get("id") or "ev" + _uuid.uuid4().hex[:8]
    with get_conn() as conn:
        conn.execute("""
            INSERT INTO events
              (id, name, mode, status, registration_opens,
               registration_closes, match_drop_at,
               play_window_start, play_window_end, created_by)
            VALUES (?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(id) DO UPDATE SET
              name                = excluded.name,
              mode                = excluded.mode,
              status              = excluded.status,
              registration_opens  = excluded.registration_opens,
              registration_closes = excluded.registration_closes,
              match_drop_at       = excluded.match_drop_at,
              play_window_start   = excluded.play_window_start,
              play_window_end     = excluded.play_window_end
        """, (
            event_id,
            data["name"],
            data.get("mode", "stamp"),
            data.get("status", "draft"),
            data.get("registration_opens"),
            data.get("registration_closes"),
            data.get("match_drop_at"),
            data.get("play_window_start"),
            data.get("play_window_end"),
            data.get("created_by"),
        ))
    return get_event(event_id)


# ── Registrations ─────────────────────────────────────────────────────────────

def register_player(event_id: str, player_id: str) -> dict:
    import uuid as _uuid
    reg_id = "r" + _uuid.uuid4().hex[:10]
    with get_conn() as conn:
        conn.execute("""
            INSERT OR IGNORE INTO registrations (id, event_id, player_id)
            VALUES (?,?,?)
        """, (reg_id, event_id, player_id))
    return {"event_id": event_id, "player_id": player_id, "status": "registered"}


def get_registrations(event_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT r.*, p.name, p.email, p.location, p.region,
                   p.vibe_type, p.drawing_pref, p.duration_pref
            FROM registrations r
            JOIN players p ON p.id = r.player_id
            WHERE r.event_id = ?
        """, (event_id,)).fetchall()
    return [dict(r) for r in rows]


# ── Matches ───────────────────────────────────────────────────────────────────

def row_to_match(row) -> dict:
    return {
        "id":             row["id"],
        "event_id":       row["event_id"],
        "player_1_id":    row["player_1_id"],
        "player_2_id":    row["player_2_id"],
        "mode":           row["mode"],
        "suggested_game": row["suggested_game"],
        "match_reason":   json.loads(row["match_reason"] or "{}"),
        "status":         row["status"],
        "created_at":     row["created_at"],
        "expires_at":     row["expires_at"],
    }


def create_match(data: dict) -> dict:
    import uuid as _uuid
    match_id = "m" + _uuid.uuid4().hex[:10]
    with get_conn() as conn:
        conn.execute("""
            INSERT INTO matches
              (id, event_id, player_1_id, player_2_id, mode,
               suggested_game, match_reason, status, expires_at)
            VALUES (?,?,?,?,?,?,?,?,?)
        """, (
            match_id,
            data.get("event_id"),
            data["player_1_id"],
            data["player_2_id"],
            data.get("mode", "stamp"),
            data.get("suggested_game"),
            json.dumps(data.get("match_reason", {})),
            data.get("status", "active"),
            data.get("expires_at"),
        ))
    return row_to_match(
        get_conn().__enter__().execute(
            "SELECT * FROM matches WHERE id=?", (match_id,)
        ).fetchone()
    )


def get_matches_for_player(player_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT * FROM matches
            WHERE player_1_id=? OR player_2_id=?
            ORDER BY created_at DESC
        """, (player_id, player_id)).fetchall()
    return [row_to_match(r) for r in rows]


def get_match(match_id: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM matches WHERE id=?", (match_id,)).fetchone()
    return row_to_match(row) if row else None


def get_matches_for_event(event_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM matches WHERE event_id=? ORDER BY created_at DESC",
            (event_id,)
        ).fetchall()
    return [row_to_match(r) for r in rows]


# ── Postcards ─────────────────────────────────────────────────────────────────

def create_postcard(data: dict) -> dict:
    import uuid as _uuid
    pc_id = "pc" + _uuid.uuid4().hex[:10]
    with get_conn() as conn:
        conn.execute("""
            INSERT INTO postcards
              (id, match_id, from_player_id, to_player_id, type, content)
            VALUES (?,?,?,?,?,?)
        """, (
            pc_id,
            data["match_id"],
            data["from_player_id"],
            data["to_player_id"],
            data.get("type", "note"),
            json.dumps(data.get("content", {})),
        ))
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM postcards WHERE id=?", (pc_id,)).fetchone()
    return dict(row)


def get_postcards(match_id: str) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM postcards WHERE match_id=? ORDER BY created_at ASC",
            (match_id,)
        ).fetchall()
    return [dict(r) for r in rows]
