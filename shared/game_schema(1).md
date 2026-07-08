# MindMetrics Database Schema

## Database
`MindMetrics`

## Collections

### 1. users
One document = one registered user.

| Field | Type |
|---|---|
| _id | ObjectId |
| name | String |
| email | String |
| password | String |
| createdAt | Date |
| lastLogin | Date |

Example

```json
{
  "_id":"ObjectId",
  "name":"Mehak",
  "email":"user@email.com",
  "password":"hashed_password",
  "createdAt":"Date",
  "lastLogin":"Date"
}
```

---

### 2. assessments

| Field | Type |
|---|---|
| _id | ObjectId |
| userId | ObjectId |
| startedAt | Date |
| completedAt | Date |
| status | String |
| overallScore | Number |
| overallProfile | String |

---

### 3. game_results

| Field | Type |
|---|---|
| _id | ObjectId |
| assessmentId | ObjectId |
| userId | ObjectId |
| gameId | String |
| score | Number |
| accuracy | Number |
| avgTime | Number |
| playedAt | Date |
| additionalData | Object (JSON) |

Example

```json
{
 "_id":"ObjectId",
 "assessmentId":"ObjectId",
 "userId":"ObjectId",
 "gameId":"memory_matrix",
 "score":82,
 "accuracy":91,
 "avgTime":3.1,
 "additionalData":{
   "highestLevel":6,
   "wrongClicks":2
 }
}
```

---

### 4. question_bank

| Field | Type |
|---|---|
| _id | ObjectId |
| gameId | String |
| difficulty | String |
| data | Object (JSON) |

Examples include Pattern Sequence, Risk Decision, Resource Manager, Find Box and Multi Switch. Store game-specific content inside the `data` object.

---

### 5. predictions

| Field | Type |
|---|---|
| _id | ObjectId |
| assessmentId | ObjectId |
| visualMemory | Number |
| workingMemory | Number |
| logicalReasoning | Number |
| decisionMaking | Number |
| processingSpeed | Number |
| cognitiveFlexibility | Number |
| eyeCoordination | Number |
| impulseControl | Number |
| overallProfile | String |
| generatedAt | Date |

---

### 6. game_config

| Field | Type |
|---|---|
| _id | ObjectId |
| gameId | String |
| gameName | String |
| timeLimit | Number |
| maxScore | Number |
| maxLevel | Number |
| visibleTime | Number |

---

## Database Structure

```text
MindMetrics
│
├── users
├── assessments
├── game_results
├── question_bank
├── predictions
└── game_config
```

## Common Types

| Field | Type |
|---|---|
| _id | ObjectId |
| userId | ObjectId |
| assessmentId | ObjectId |
| gameId | String |
| score | Number |
| accuracy | Number |
| avgTime | Number |
| createdAt | Date |
| playedAt | Date |
| completedAt | Date |
| additionalData | Object (JSON) |
| data | Object (JSON) |
| overallProfile | String |
| status | String |
| difficulty | String |

# MindMetrics Game Schema

## Constants

### Game IDs
```text
memory_matrix
memory_sequence
pattern_sequence
risk_decision
hidden_symbol
color_reaction
resource_manager
whack_circle
find_box
multi_switch
```

### Assessment Status
```text
IN_PROGRESS
COMPLETED
```

### User Roles
```text
USER
ADMIN
```

### Cognitive Skills
```text
visual_memory
working_memory
logical_reasoning
planning
decision_making
processing_speed
cognitive_flexibility
eye_hand_coordination
impulse_control
overall_score
```

### Prediction Profiles
```text
Strategic Thinker
Analytical Planner
Fast Reactor
Balanced Learner
Adaptive Solver
```

---

> Keep these names exactly the same in React, Node.js, Django and MongoDB. Do not change capitalization or use different spellings.
