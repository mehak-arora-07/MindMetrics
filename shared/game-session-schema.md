# MindMetrics — Game Session Data Contract

This document defines the exact JSON shape every mini-game must send when a session ends.
Both frontend (React) and backend (Node + Django) must follow this contract exactly.
If a game's metrics need to change, update this file first, then tell your teammate.

---

## 1. Envelope (identical for every game)

Every game session, regardless of which game, is wrapped like this:

```json
{
  "sessionId": "uuid-v4-string",
  "userId": "uuid-v4-string",
  "gameId": "whack_a_circle",
  "startedAt": "2026-07-06T14:32:00Z",
  "endedAt": "2026-07-06T14:33:10Z",
  "completed": true,
  "metrics": { }
}
```

| Field | Type | Notes |
|---|---|---|
| sessionId | string (uuid) | Unique per play-through. Generate on the frontend when the game starts. |
| userId | string (uuid) | From the logged-in user's JWT/auth context. |
| gameId | string (enum) | Must be one of the fixed IDs in section 2. |
| startedAt | ISO 8601 string | Timestamp when the game began. |
| endedAt | ISO 8601 string | Timestamp when the game ended (completed or quit). |
| completed | boolean | `false` if the user quit early. ML pipeline should exclude incomplete sessions by default. |
| metrics | object | Game-specific. See section 3. |

---

## 2. Fixed `gameId` values

Use these exact strings — do not rename, alias, or change casing:

```
memory_matrix
memory_colour
pattern_sequence
risk_decision
hidden_symbol
color_number_reaction
resource_manager
whack_a_circle
find_the_box
multi_switch
```

---

## 3. Per-game `metrics` object

Naming convention: use `avg*Ms` for average timing fields, and `*Total` / `correct` pairs for accuracy counts, so Pandas feature extraction can use generic helper functions across games.

### memory_matrix
```json
{
  "maxGridSizeReached": 5,
  "totalRounds": 8,
  "roundsCorrect": 6,
  "avgRecallTimeMs": 3200
}
```

### memory_colour
```json
{
  "maxSequenceLength": 7,
  "attemptsFailed": 2,
  "avgResponseTimeMs": 2100
}
```

### pattern_sequence
```json
{
  "questionsTotal": 10,
  "correct": 8,
  "avgTimePerQuestionMs": 5400
}
```

### risk_decision
```json
{
  "scenariosTotal": 8,
  "riskyChoices": 5,
  "safeChoices": 3,
  "consistencyScore": 0.72
}
```

### hidden_symbol
```json
{
  "roundsTotal": 8,
  "correct": 7,
  "avgFindTimeMs": 2800,
  "gridDensityAtSuccess": 16
}
```

### color_number_reaction
```json
{
  "trials": 30,
  "correct": 26,
  "falsePositives": 2,
  "avgReactionMs": 530
}
```

### resource_manager
```json
{
  "roundsTotal": 6,
  "resourceEfficiency": 0.81,
  "eventsHandledWell": 4,
  "eventsTotal": 5
}
```

### whack_a_circle
```json
{
  "totalTargets": 20,
  "hits": 17,
  "misses": 3,
  "avgReactionMs": 412,
  "reactionTimesMs": [380, 420, 405, 440]
}
```

### find_the_box
```json
{
  "questionsTotal": 6,
  "correct": 5,
  "avgResponseTimeMs": 6100,
  "clueRereadCount": 3
}
```

### multi_switch
```json
{
  "ruleSwitches": 10,
  "correctAfterSwitch": 8,
  "avgAdaptationTimeMs": 1900
}
```

---

## 4. Full example payload (whack_a_circle)

```json
{
  "sessionId": "a1b2c3d4-1111-2222-3333-444455556666",
  "userId": "u9z8y7x6-aaaa-bbbb-cccc-ddddeeeeffff",
  "gameId": "whack_a_circle",
  "startedAt": "2026-07-08T10:15:00Z",
  "endedAt": "2026-07-08T10:16:12Z",
  "completed": true,
  "metrics": {
    "totalTargets": 20,
    "hits": 17,
    "misses": 3,
    "avgReactionMs": 412,
    "reactionTimesMs": [380, 420, 405, 440]
  }
}
```

---

## 5. Rules for both teammates

1. Every game's frontend component calls one shared function (e.g. `submitGameSession(payload)`) to send this payload — don't hand-roll fetch calls per game.
2. The Node API exposes exactly one endpoint for this: `POST /api/sessions`.
3. If a game's metrics shape needs to change during development, update this file in the same commit as the code change.
4. Django's feature extraction should route on `gameId` to know which extraction function to run against `metrics`.