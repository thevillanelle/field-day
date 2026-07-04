"""
Commons — FastAPI Backend v1.0.0

Endpoints:
  /api/health              — liveness + readiness
  /api/players             — register / update player profile
  /api/players/{id}        — get a player
  /api/events              — list / create events
  /api/events/{id}         — get event detail
  /api/events/{id}/register       — register for an event
  /api/events/{id}/run-matching   — trigger match algorithm (admin)
  /api/matches/me          — my current matches (by email header)
  /api/matches/{id}        — match detail
  /api/matches/{id}/postcards     — send / get postcards
  /api/admin/players       — all players (admin)
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr

from api.db import (
    init_db,
    get_all_players, get_player, get_player_by_email, upsert_player,
    get_all_events, get_event, get_active_events, upsert_event,
    register_player, get_registrations,
    create_match, get_match, get_matches_for_player, get_matches_for_event,
    create_postcard, get_postcards,
    get_profile, get_all_profiles, upsert_profile,
    get_connections, get_connection_count, create_connection,
)
from api.matching import run_matching, GAMES

BASE_DIR = Path(__file__).resolve().parent.parent

# ── Admin — configure via environment variables in production ─────────────────
# Set ADMIN_EMAIL and ADMIN_DSID in your deployment environment
ADMIN_EMAILS: set[str] = {os.environ.get("ADMIN_EMAIL", "admin@example.com")}
ADMIN_DSIDS:  set[str] = {os.environ.get("ADMIN_DSID", "")}

_EMAIL_HEADERS = ["x-user-email", "x-apple-sso-email", "x-forwarded-email"]


def _get_user_email(request: Request) -> str | None:
    for h in _EMAIL_HEADERS:
        val = request.headers.get(h)
        if val:
            return val.lower().strip()
    return os.environ.get("DEV_USER_EMAIL", "").lower() or None


def _get_user_dsid(request: Request) -> str | None:
    dsid = request.headers.get("x-user-id", "").strip()
    return dsid or os.environ.get("DEV_USER_DSID") or None


def _is_admin(request: Request) -> bool:
    email = _get_user_email(request)
    if email and email in {e.lower() for e in ADMIN_EMAILS}:
        return True
    dsid = _get_user_dsid(request)
    return bool(dsid and dsid in ADMIN_DSIDS)


# ── Slack notification (non-blocking) ───────────────────────────────────────
import urllib.request, urllib.error, json as _json

SLACK_WEBHOOK = os.environ.get("SLACK_WEBHOOK_URL", "")

def _slack(msg: str) -> None:
    if not SLACK_WEBHOOK:
        return
    try:
        data = _json.dumps({"text": msg}).encode()
        req  = urllib.request.Request(
            SLACK_WEBHOOK, data=data,
            headers={"Content-Type": "application/json"}
        )
        urllib.request.urlopen(req, timeout=5)
    except Exception:
        pass


# ── App lifecycle ─────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="Commons API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tightened to GitHub Pages domain post-MVP
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic models ───────────────────────────────────────────────────────────

class PlayerRegister(BaseModel):
    name:          str
    email:         str
    location:      str
    vibe_type:     str | None = None
    quiz_answers:  dict       = {}
    drawing_pref:  str        = "fine"
    duration_pref: str        = "medium"

class EventCreate(BaseModel):
    name:                str
    mode:                str = "stamp"
    status:              str = "draft"
    registration_opens:  str | None = None
    registration_closes: str | None = None
    match_drop_at:       str | None = None
    play_window_start:   str | None = None
    play_window_end:     str | None = None

class EventStatusUpdate(BaseModel):
    status: str  # draft | open | matching | active | closed

class PostcardCreate(BaseModel):
    from_player_id: str
    to_player_id:   str
    type:           str  = "note"
    content:        dict = {}


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "commons", "version": "1.0.0"}


# ── Players ───────────────────────────────────────────────────────────────────

@app.post("/api/players", status_code=201)
def api_register_player(body: PlayerRegister) -> dict:
    """Register or update a player. Used when quiz is submitted."""
    player = upsert_player(body.model_dump())
    return player


@app.get("/api/players/{player_id}")
def api_get_player(player_id: str) -> dict:
    player = get_player(player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player


@app.get("/api/players/by-email/{email}")
def api_get_player_by_email(email: str) -> dict:
    player = get_player_by_email(email)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player


@app.get("/api/admin/players")
def api_all_players(request: Request) -> list[dict]:
    if not _is_admin(request):
        raise HTTPException(status_code=403, detail="Admin only")
    return get_all_players()


# ── Events ────────────────────────────────────────────────────────────────────

@app.get("/api/events")
def api_get_events() -> list[dict]:
    return get_active_events()


@app.get("/api/events/all")
def api_get_all_events(request: Request) -> list[dict]:
    if not _is_admin(request):
        raise HTTPException(status_code=403, detail="Admin only")
    return get_all_events()


@app.post("/api/events", status_code=201)
def api_create_event(body: EventCreate, request: Request) -> dict:
    if not _is_admin(request):
        raise HTTPException(status_code=403, detail="Admin only")
    email = _get_user_email(request)
    data  = body.model_dump()
    data["created_by"] = email
    return upsert_event(data)


@app.get("/api/events/{event_id}")
def api_get_event(event_id: str) -> dict:
    event = get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@app.patch("/api/events/{event_id}/status")
def api_update_event_status(event_id: str, body: EventStatusUpdate, request: Request) -> dict:
    if not _is_admin(request):
        raise HTTPException(status_code=403, detail="Admin only")
    event = get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    event["status"] = body.status
    return upsert_event(event)


@app.post("/api/events/{event_id}/register")
def api_register_for_event(event_id: str, body: PlayerRegister) -> dict:
    """Register a player for an event. Creates/updates their profile first."""
    event = get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event["status"] not in ("open", "active"):
        raise HTTPException(status_code=400, detail="Event is not currently open for registration")

    # Upsert the player record
    player = upsert_player(body.model_dump())
    reg    = register_player(event_id, player["id"])
    return {"player": player, "registration": reg}


@app.post("/api/admin/events/{event_id}/run-matching")
def api_run_matching(event_id: str, request: Request) -> dict:
    """Trigger the matching algorithm for a Stamp event. Admin only."""
    if not _is_admin(request):
        raise HTTPException(status_code=403, detail="Admin only")

    event = get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Get all registered players for this event
    regs    = get_registrations(event_id)
    players = [get_player(r["player_id"]) for r in regs]
    players = [p for p in players if p]  # filter None

    # Run the engine
    match_data = run_matching(players, event_id)

    # Persist matches + send Slack DMs
    created = []
    for m in match_data:
        match = create_match(m)
        created.append(match)

        # Slack notification to both players
        p1 = get_player(m["player_1_id"])
        p2 = get_player(m["player_2_id"])
        reason = m.get("match_reason", {})
        game_name = reason.get("game_name", "a game")
        game_url  = reason.get("game_url", "")
        why       = reason.get("why", "")

        for player, partner in [(p1, p2), (p2, p1)]:
            if not player or not partner:
                continue
            _slack(
                f"✈️ *Commons: Passport — your match has dropped!*\n\n"
                f"You've been matched with *{partner['name']}* from *{partner['location']}*\n\n"
                f"🎮 *Your game: {game_name}*\n"
                f"{game_url}\n\n"
                f"_Why this game for you two:_\n{why}\n\n"
                f"Play on your own time. Screenshot your result and send it as a postcard. That's your stamp. 🌍"
            )

    # Update event status
    event["status"] = "active"
    upsert_event(event)

    return {
        "matches_created": len(created),
        "matches": created,
    }


# ── Matches ───────────────────────────────────────────────────────────────────

@app.get("/api/matches/me")
def api_my_matches(request: Request) -> list[dict]:
    email = _get_user_email(request)
    if not email:
        raise HTTPException(status_code=401, detail="Not authenticated")
    player = get_player_by_email(email)
    if not player:
        return []
    matches = get_matches_for_player(player["id"])

    # Enrich with partner info
    enriched = []
    for m in matches:
        partner_id = m["player_2_id"] if m["player_1_id"] == player["id"] else m["player_1_id"]
        partner    = get_player(partner_id)
        game_info  = GAMES.get(m.get("suggested_game", ""), {})
        enriched.append({
            **m,
            "partner":   partner,
            "game_name": game_info.get("name"),
            "game_url":  game_info.get("url"),
        })
    return enriched


@app.get("/api/matches/{match_id}")
def api_get_match(match_id: str) -> dict:
    match = get_match(match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    p1   = get_player(match["player_1_id"])
    p2   = get_player(match["player_2_id"])
    game = GAMES.get(match.get("suggested_game", ""), {})
    return {
        **match,
        "player_1":  p1,
        "player_2":  p2,
        "game_name": game.get("name"),
        "game_url":  game.get("url"),
    }


# ── Postcards ─────────────────────────────────────────────────────────────────

@app.post("/api/matches/{match_id}/postcards", status_code=201)
def api_send_postcard(match_id: str, body: PostcardCreate) -> dict:
    match = get_match(match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    data = {
        "match_id":       match_id,
        "from_player_id": body.from_player_id,
        "to_player_id":   body.to_player_id,
        "type":           body.type,
        "content":        body.content,
    }
    return create_postcard(data)


@app.get("/api/matches/{match_id}/postcards")
def api_get_postcards(match_id: str) -> list[dict]:
    return get_postcards(match_id)


# ── Games catalogue ───────────────────────────────────────────────────────────

@app.get("/api/games")
def api_get_games() -> dict:
    return GAMES


# ── Profiles (People layer) ───────────────────────────────────────────────────

class ProfileUpdate(BaseModel):
    bio:          str        = ""
    skills:       list[str]  = []
    interests:    list[str]  = []
    hobbies:      list[str]  = []
    avatar_color: str | None = None
    is_public:    bool       = True


@app.get("/api/profiles")
def api_get_profiles() -> list[dict]:
    """All public profiles — powers the People page."""
    profiles = get_all_profiles()
    # Enrich each with connection count
    for p in profiles:
        p["connection_count"] = get_connection_count(p["id"])
    return profiles


@app.get("/api/profiles/{player_id}")
def api_get_profile(player_id: str) -> dict:
    profile = get_profile(player_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    profile["connection_count"] = get_connection_count(player_id)
    return profile


@app.patch("/api/profiles/{player_id}")
def api_update_profile(player_id: str, body: ProfileUpdate, request: Request) -> dict:
    """Players update their own profile. Admins can update any."""
    email = _get_user_email(request)
    player = get_player(player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    # Allow if it's their own profile or admin
    if not _is_admin(request) and player.get("email", "").lower() != (email or ""):
        raise HTTPException(status_code=403, detail="Can only update your own profile")
    updated = upsert_profile(player_id, body.model_dump())
    return updated


# ── Connections (social graph) ────────────────────────────────────────────────

@app.get("/api/connections/{player_id}")
def api_get_connections(player_id: str) -> list[dict]:
    return get_connections(player_id)


@app.post("/api/connections", status_code=201)
def api_create_connection(
    player_1_id: str,
    player_2_id: str,
    vertical:    str = "play",
    match_id:    str | None = None,
    request:     Request = None,
) -> dict:
    """Create a connection between two players. Called automatically when a match completes."""
    return create_connection(player_1_id, player_2_id, vertical, match_id)


# ── Static files — mounted LAST ───────────────────────────────────────────────
app.mount("/", StaticFiles(directory=str(BASE_DIR), html=True), name="static")
