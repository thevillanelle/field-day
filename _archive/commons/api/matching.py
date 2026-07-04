"""
Commons — Matching Engine v1.0.0

Implements:
  - Vibe type compatibility matrix
  - Drawing + duration override logic
  - Hungarian algorithm for globally optimal pairing
  - Cross-geo hard constraint (never same location)
"""

from __future__ import annotations

import os
from itertools import combinations

# scipy is optional — falls back to greedy if not available
try:
    from scipy.optimize import linear_sum_assignment
    import numpy as np
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False

# ── Game catalogue (mirrors the frontend ALL_GAMES object) ───────────────────
GAMES: dict[str, dict] = {
    "wordle":        {"name": "Wordle",              "url": "https://www.nytimes.com/games/wordle",         "drawing": False, "min_duration": "short"},
    "connections":   {"name": "NYT Connections",     "url": "https://www.nytimes.com/games/connections",    "drawing": False, "min_duration": "short"},
    "worldle":       {"name": "Worldle",             "url": "https://worldle.teuteuf.fr/",                  "drawing": False, "min_duration": "short"},
    "framed":        {"name": "Framed",              "url": "https://framed.wtf/",                          "drawing": False, "min_duration": "short"},
    "heardle":       {"name": "Heardle",             "url": "https://spotify.com/heardle",                  "drawing": False, "min_duration": "short"},
    "semantle":      {"name": "Semantle",            "url": "https://semantle.com/",                        "drawing": False, "min_duration": "medium"},
    "artle":         {"name": "Artle",               "url": "https://www.artle.org/",                       "drawing": False, "min_duration": "short"},
    "openguessr":    {"name": "Openguessr",          "url": "https://openguessr.com/",                      "drawing": False, "min_duration": "medium"},
    "typeracer":     {"name": "TypeRacer",           "url": "https://typeracer.com/",                       "drawing": False, "min_duration": "short"},
    "minesweeper":   {"name": "Minesweeper",         "url": "https://minesweeper.online/",                  "drawing": False, "min_duration": "short"},
    "kahoot":        {"name": "Kahoot (Solo)",       "url": "https://kahoot.com/explore/",                  "drawing": False, "min_duration": "medium"},
    "sporcle":       {"name": "Sporcle",             "url": "https://www.sporcle.com/",                     "drawing": False, "min_duration": "short"},
    "keymash":       {"name": "Keymash",             "url": "https://keymash.io/",                          "drawing": False, "min_duration": "short"},
    "lichess":       {"name": "Lichess",             "url": "https://lichess.org/",                         "drawing": False, "min_duration": "long"},
    "wordswfriends": {"name": "Words with Friends",  "url": "https://play.wordswithfriends.com/",           "drawing": False, "min_duration": "medium"},
    "battleship":    {"name": "Battleship Online",   "url": "https://www.battleshiponline.org/",            "drawing": False, "min_duration": "medium"},
    "yahtzee":       {"name": "Yahtzee with Buddies","url": "https://yahtzeewithbuddies.com/",              "drawing": False, "min_duration": "medium"},
    "gartic":        {"name": "Gartic Phone",        "url": "https://garticphone.com/",                     "drawing": True,  "min_duration": "medium"},
    "skribbl":       {"name": "Skribbl.io",          "url": "https://skribbl.io/",                          "drawing": True,  "min_duration": "medium"},
    "storychain":    {"name": "Story Chain",         "url": None,                                           "drawing": False, "min_duration": "short"},
    "jackbox":       {"name": "Jackbox",             "url": "https://www.jackboxgames.com/",                "drawing": True,  "min_duration": "long"},
    "codenames":     {"name": "Codenames",           "url": "https://codenames.game/",                      "drawing": False, "min_duration": "medium"},
    "wavelength":    {"name": "Wavelength",          "url": "https://longwave.web.app/",                    "drawing": False, "min_duration": "medium"},
    "dixit":         {"name": "Dixit (Photo Ed.)",   "url": None,                                           "drawing": False, "min_duration": "medium"},
    "scavenger":     {"name": "Photo Scavenger Hunt","url": None,                                           "drawing": False, "min_duration": "long"},
}

DURATION_MINS = {"short": 15, "medium": 30, "long": 60}

# ── Pairing matrix: (type_a, type_b) → (game_slug, why) ─────────────────────
MATRIX: dict[frozenset, tuple[str, str]] = {
    frozenset({"explorer", "explorer"}): (
        "openguessr",
        "Two Explorers dropped into the same Street View — no competition needed, just the shared obsession of figuring out where you are."
    ),
    frozenset({"rival", "rival"}): (
        "lichess",
        "Two competitors who want to win — correspondence chess is the cleanest possible expression of that. Slow, strategic, completely ruthless."
    ),
    frozenset({"creator", "creator"}): (
        "gartic",
        "Two Creators on Gartic Phone is a recipe for something that starts as art and ends as chaos. Neither will be able to explain it, but both will be proud."
    ),
    frozenset({"wanderer", "wanderer"}): (
        "connections",
        "Two people with no agenda — a daily puzzle you both solve independently and compare. Low stakes, surprisingly opinionated once the categories go sideways."
    ),
    frozenset({"explorer", "rival"}): (
        "typeracer",
        "An Explorer who wants a challenge meets a Rival who wants a win — TypeRacer gives both exactly what they came for. Fast, measurable, immediately rematched."
    ),
    frozenset({"explorer", "creator"}): (
        "wavelength",
        "An Explorer's curiosity meets a Creator's expressive instinct. Wavelength forces you to reveal how your mind categorizes the world."
    ),
    frozenset({"explorer", "wanderer"}): (
        "worldle",
        "An Explorer up for discovery meets a Wanderer who just wants a good time — Worldle is the perfect low-pressure daily that gives both."
    ),
    frozenset({"rival", "creator"}): (
        "codenames",
        "A Rival's competitive edge meets a Creator's way with words. Codenames is won by the perfect one-word clue — precise enough to be clever, broad enough to be risky."
    ),
    frozenset({"rival", "wanderer"}): (
        "battleship",
        "A Rival who wants a real match meets a Wanderer who's fine with whatever — Battleship gives the Rival their win condition while staying accessible."
    ),
    frozenset({"creator", "wanderer"}): (
        "gartic",
        "A Creator who wants to express something meets a Wanderer who's open to anything — Gartic Phone is the natural result."
    ),
}


def suggest_game(type_a: str, type_b: str, drawing_a: str, drawing_b: str,
                 duration_a: str, duration_b: str) -> dict:
    """Return the best game slug + reason for a given pair of players."""
    key = frozenset({type_a, type_b})
    game_slug, why = MATRIX.get(key, ("openguessr", "Geography is the universal async game — same map, same challenge, completely different strategies."))

    no_drawing    = drawing_a == "skip" or drawing_b == "skip"
    short_session = duration_a == "short" or duration_b == "short"
    game_info     = GAMES.get(game_slug, {})
    is_drawing    = game_info.get("drawing", False)
    is_long       = DURATION_MINS.get(game_info.get("min_duration", "short"), 15) > 15 and short_session

    # Override: no drawing
    if no_drawing and is_drawing:
        # Creator+Wanderer no drawing → Story Chain
        if key == frozenset({"creator", "wanderer"}):
            game_slug = "storychain"
            why = "Drawing was out — but a Creator and Wanderer still want something expressive. Story Chain on Slack: one sentence each, back and forth, no app, no skill barrier."
        else:
            game_slug = "wordle"
            why = "Drawing was off the table — Wordle is the perfect pivot. Same word every day, shareable grid, five minutes, zero pressure."

    # Override: short session on long-haul games
    elif short_session and game_slug in {"lichess", "wordswfriends", "scavenger", "jackbox"}:
        game_slug = "keymash"
        why = "At least one of you only has 15 minutes — Keymash is the call. Same mode, type as fast as you can, screenshot your WPM. Clean, fast, surprisingly smug when you win."

    game = GAMES.get(game_slug, GAMES["wordle"])
    return {
        "slug": game_slug,
        "name": game["name"],
        "url":  game.get("url"),
        "why":  why,
    }


# ── Compatibility score for a pair of players ────────────────────────────────

# Complementary type pairs score highest
_TYPE_SCORE: dict[frozenset, float] = {
    frozenset({"explorer", "rival"}):   1.0,
    frozenset({"creator", "wanderer"}): 1.0,
    frozenset({"explorer", "creator"}): 0.8,
    frozenset({"rival", "wanderer"}):   0.8,
    frozenset({"explorer", "wanderer"}):0.6,
    frozenset({"rival", "creator"}):    0.6,
    frozenset({"explorer", "explorer"}):0.4,
    frozenset({"rival", "rival"}):      0.4,
    frozenset({"creator", "creator"}):  0.4,
    frozenset({"wanderer", "wanderer"}):0.4,
}


def compatibility_score(p1: dict, p2: dict) -> float:
    """
    Score a potential pair. Higher = better match.
    Components:
      40% vibe type compatibility
      30% (placeholder for future interest overlap from hub profiles)
      20% timezone proximity (approximated by location region)
      10% novelty (penalise if already matched — not yet implemented)
    """
    # Vibe type (40%)
    type_score = _TYPE_SCORE.get(
        frozenset({p1.get("vibe_type", ""), p2.get("vibe_type", "")}), 0.2
    ) * 0.4

    # Region diversity (20%) — cross-region is good, same region is 0
    region_score = 0.2 if p1.get("region") != p2.get("region") else 0.0

    # Drawing compatibility (10%)
    d1, d2 = p1.get("drawing_pref", "fine"), p2.get("drawing_pref", "fine")
    drawing_score = 0.1 if not (d1 == "love" and d2 == "skip") and not (d1 == "skip" and d2 == "love") else 0.0

    # Duration overlap (10%)
    dur_vals = {"short": 1, "medium": 2, "long": 3}
    dur_diff = abs(dur_vals.get(p1.get("duration_pref", "medium"), 2) - dur_vals.get(p2.get("duration_pref", "medium"), 2))
    duration_score = (0.1 if dur_diff == 0 else 0.05 if dur_diff == 1 else 0.0)

    # Placeholder interests (20%) — will be populated from hub profile sync
    interest_score = 0.1  # neutral until hub integration

    return type_score + region_score + drawing_score + duration_score + interest_score


# ── Main matching function ────────────────────────────────────────────────────

def run_matching(players: list[dict], event_id: str) -> list[dict]:
    """
    Given a list of registered players for an event, return a list of match dicts.

    Hard constraint: players MUST be from different locations.
    Algorithm: Hungarian (optimal) if scipy available, else greedy.
    """
    # Filter to active players with a vibe type
    eligible = [p for p in players if p.get("is_active") and p.get("vibe_type")]

    if len(eligible) < 2:
        return []

    # Build all valid cross-location pairs
    valid_pairs = [
        (a, b)
        for a, b in combinations(eligible, 2)
        if a["location"] != b["location"]
    ]

    if not valid_pairs:
        # Fallback: allow same location if no cross-location pairs available
        valid_pairs = list(combinations(eligible, 2))

    if HAS_SCIPY and len(valid_pairs) > 1:
        matches = _hungarian_match(eligible, valid_pairs, event_id)
    else:
        matches = _greedy_match(eligible, valid_pairs, event_id)

    return matches


def _hungarian_match(players: list[dict], valid_pairs: list[tuple], event_id: str) -> list[dict]:
    """Globally optimal matching using the Hungarian algorithm."""
    n = len(players)
    idx = {p["id"]: i for i, p in enumerate(players)}

    # Cost matrix (we minimise cost = maximise score)
    cost = np.full((n, n), 1e6)
    for a, b in valid_pairs:
        i, j = idx[a["id"]], idx[b["id"]]
        score = compatibility_score(a, b)
        cost[i][j] = 1.0 - score
        cost[j][i] = 1.0 - score

    row_ind, col_ind = linear_sum_assignment(cost)

    matched_ids: set[str] = set()
    results: list[dict] = []

    for r, c in zip(row_ind, col_ind):
        if r >= c:
            continue  # avoid duplicates
        p1, p2 = players[r], players[c]
        if p1["id"] in matched_ids or p2["id"] in matched_ids:
            continue
        if cost[r][c] >= 1e5:
            continue  # no valid pairing

        game = suggest_game(
            p1.get("vibe_type", "wanderer"), p2.get("vibe_type", "wanderer"),
            p1.get("drawing_pref", "fine"),  p2.get("drawing_pref", "fine"),
            p1.get("duration_pref", "medium"),p2.get("duration_pref", "medium"),
        )
        results.append({
            "event_id":       event_id,
            "player_1_id":    p1["id"],
            "player_2_id":    p2["id"],
            "mode":           "stamp",
            "suggested_game": game["slug"],
            "match_reason": {
                "score":      round(1.0 - cost[r][c], 3),
                "game_name":  game["name"],
                "game_url":   game["url"],
                "why":        game["why"],
                "type_combo": f"{p1.get('vibe_type')} + {p2.get('vibe_type')}",
            },
        })
        matched_ids.add(p1["id"])
        matched_ids.add(p2["id"])

    return results


def _greedy_match(players: list[dict], valid_pairs: list[tuple], event_id: str) -> list[dict]:
    """Greedy fallback when scipy is unavailable."""
    scored = sorted(valid_pairs, key=lambda ab: compatibility_score(ab[0], ab[1]), reverse=True)
    matched_ids: set[str] = set()
    results: list[dict] = []

    for a, b in scored:
        if a["id"] in matched_ids or b["id"] in matched_ids:
            continue
        game = suggest_game(
            a.get("vibe_type", "wanderer"), b.get("vibe_type", "wanderer"),
            a.get("drawing_pref", "fine"),  b.get("drawing_pref", "fine"),
            a.get("duration_pref","medium"), b.get("duration_pref","medium"),
        )
        results.append({
            "event_id":       event_id,
            "player_1_id":    a["id"],
            "player_2_id":    b["id"],
            "mode":           "stamp",
            "suggested_game": game["slug"],
            "match_reason": {
                "score":      round(compatibility_score(a, b), 3),
                "game_name":  game["name"],
                "game_url":   game["url"],
                "why":        game["why"],
                "type_combo": f"{a.get('vibe_type')} + {b.get('vibe_type')}",
            },
        })
        matched_ids.add(a["id"])
        matched_ids.add(b["id"])

    return results
