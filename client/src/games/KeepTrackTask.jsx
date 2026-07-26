import { useState, useRef, useEffect } from "react";

// Drop into client/src/games/KeepTrackTask.jsx
// Same visual family as DualTask/MemoryMatrix/HiddenSymbol — dark arena, mint/gold/red accents.
// POSTs the completed session to POST /api/sessions on game end, same pattern as DualTask.
//
// Matches the Sessions mongoose schema:
//   { sessionId, userId, assessmentId, gameId, accuracy, avgTimeMs, metrics, completed }
// additionalData shape requested: { recallAccuracy, maxLevel, incorrectRecalls }
// — all three live inside metrics, same as every other game here.

const SESSION_TIME_LIMIT_MS = 45000;

const ROUNDS = [
  { label: "Round 1", categoryCount: 3, itemCount: 6, displayMs: 1200, types: ["latest"] },
  { label: "Round 2", categoryCount: 4, itemCount: 7, displayMs: 1200, types: ["latest", "mostRecentCategory"] },
  {
    label: "Round 3",
    categoryCount: 4,
    itemCount: 8,
    displayMs: 1400,
    types: ["latest", "secondLatest", "mostRecentCategory", "itemBefore"],
  },
];

const RECALL_POINTS = 15;
const MAX_POSSIBLE_SCORE = ROUNDS.length * RECALL_POINTS;

// Clearly-separate categories only — avoid picking overlapping sets like
// Animals/Birds/SeaAnimals in the same round (a penguin causes problems).
const SAFE_CATEGORIES = [
  "Animals",
  "Countries",
  "Colors",
  "Vehicles",
  "Sports",
  "Professions",
  "Drinks",
  "Flowers",
  "Shapes",
  "MusicalInstruments",
  "Places",
  "Nature",
  "Stationery",
  "Foods",
];

const categoryData = {
  Animals: [
    "Dog", "Cat", "Lion", "Tiger", "Elephant", "Giraffe", "Zebra", "Monkey", "Horse", "Rabbit",
    "Fox", "Wolf", "Bear", "Deer", "Panda", "Kangaroo", "Leopard", "Cheetah", "Camel", "Goat",
    "Sheep", "Cow", "Buffalo", "Donkey", "Squirrel", "Otter", "Koala", "Rhino", "Hippo", "Mouse",
  ],
  Countries: [
    "India", "Japan", "Canada", "Brazil", "France", "Germany", "Italy", "Spain", "China", "Mexico",
    "Australia", "Egypt", "Nepal", "Bhutan", "Russia", "Thailand", "Vietnam", "Kenya", "Norway", "Sweden",
    "Finland", "Denmark", "Portugal", "Greece", "Turkey", "Argentina", "Chile", "Peru", "Morocco", "Indonesia",
  ],
  Colors: [
    "Red", "Blue", "Green", "Yellow", "Orange", "Purple", "Pink", "Brown", "Black", "White",
    "Grey", "Cyan", "Magenta", "Maroon", "Navy", "Teal", "Olive", "Beige", "Coral", "Violet",
    "Indigo", "Gold", "Silver", "Lavender", "Turquoise",
  ],
  Vehicles: [
    "Car", "Bus", "Train", "Bicycle", "Motorcycle", "Truck", "Scooter", "Taxi", "Boat", "Ship",
    "Airplane", "Helicopter", "Tractor", "Van", "Metro", "Ambulance", "Fire Truck", "Rickshaw", "Submarine", "Yacht",
    "Jeep", "Bulldozer", "Crane", "Skateboard", "Rocket",
  ],
  Sports: [
    "Cricket", "Football", "Basketball", "Tennis", "Badminton", "Hockey", "Volleyball", "Baseball", "Golf", "Swimming",
    "Boxing", "Wrestling", "Cycling", "Running", "Archery", "Gymnastics", "Skating", "Skiing", "Rugby", "Table Tennis",
    "Kabaddi", "Chess", "Surfing", "Judo", "Karate",
  ],
  Professions: [
    "Doctor", "Teacher", "Engineer", "Lawyer", "Chef", "Nurse", "Pilot", "Farmer", "Artist", "Writer",
    "Police Officer", "Firefighter", "Architect", "Scientist", "Dentist", "Designer", "Mechanic", "Photographer", "Journalist", "Accountant",
    "Electrician", "Carpenter", "Manager", "Programmer", "Musician",
  ],
  Drinks: [
    "Water", "Tea", "Coffee", "Milk", "Juice", "Lemonade", "Smoothie", "Soda", "Milkshake", "Coconut Water",
    "Hot Chocolate", "Green Tea", "Black Coffee", "Orange Juice", "Apple Juice", "Mango Shake", "Buttermilk", "Iced Tea", "Espresso", "Latte",
  ],
  Flowers: [
    "Rose", "Lotus", "Sunflower", "Lily", "Tulip", "Jasmine", "Daisy", "Orchid", "Lavender", "Marigold",
    "Hibiscus", "Daffodil", "Poppy", "Peony", "Magnolia", "Carnation", "Iris", "Dahlia", "Camellia", "Bluebell",
  ],
  Shapes: [
    "Circle", "Square", "Triangle", "Rectangle", "Oval", "Star", "Diamond", "Pentagon", "Hexagon", "Octagon",
    "Cube", "Sphere", "Cone", "Cylinder", "Heart", "Crescent", "Arrow", "Cross", "Semicircle", "Trapezoid",
  ],
  MusicalInstruments: [
    "Guitar", "Piano", "Drums", "Violin", "Flute", "Trumpet", "Saxophone", "Harmonica", "Tabla", "Sitar",
    "Cello", "Harp", "Clarinet", "Tambourine", "Ukulele", "Keyboard", "Bongo", "Veena", "Dhol", "Xylophone",
  ],
  Places: [
    "School", "Hospital", "Market", "Park", "Library", "Airport", "Station", "Beach", "Museum", "Restaurant",
    "Bank", "Temple", "Office", "Cinema", "Hotel", "Mall", "Zoo", "Farm", "Stadium", "Garden",
  ],
  Nature: [
    "Mountain", "River", "Ocean", "Forest", "Desert", "Lake", "Valley", "Waterfall", "Island", "Hill",
    "Cave", "Volcano", "Glacier", "Beach", "Jungle", "Cliff", "Meadow", "Pond", "Stream", "Field",
  ],
  Stationery: [
    "Pen", "Pencil", "Marker", "Eraser", "Ruler", "Notebook", "Stapler", "Tape", "Glue", "Paper",
    "Folder", "Clip", "Envelope", "Highlighter", "Diary", "Sketchbook", "Compass", "Sharpener", "Scissors", "Calculator",
  ],
  Foods: [
    "Pizza", "Burger", "Pasta", "Rice", "Sandwich", "Noodles", "Soup", "Salad", "Bread", "Pancake",
    "Dosa", "Idli", "Biryani", "Samosa", "Kebab", "Taco", "Sushi", "Curry", "Fries", "Cake",
    "Chocolate", "Ice Cream", "Cookie", "Muffin", "Popcorn",
  ],
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandomCategories(count) {
  return [...SAFE_CATEGORIES].sort(() => Math.random() - 0.5).slice(0, count);
}

function pickItem(category, exclude = []) {
  const pool = categoryData[category].filter((i) => !exclude.includes(i));
  return pool[randInt(0, pool.length - 1)];
}

function buildStream(categories, itemCount) {
  const stream = [];
  for (let i = 0; i < itemCount; i++) {
    const category = categories[randInt(0, categories.length - 1)];
    const item = pickItem(category);
    stream.push({ category, item });
  }
  return stream;
}

function categoryHistoryOf(stream, category) {
  return stream.filter((s) => s.category === category).map((s) => s.item);
}

function buildQuestion(stream, categories, allowedTypes) {
  const eligibleTypes = [...allowedTypes];
  let type = eligibleTypes[randInt(0, eligibleTypes.length - 1)];

  if (type === "secondLatest") {
    const candidates = categories.filter((c) => categoryHistoryOf(stream, c).length >= 2);
    if (candidates.length === 0) type = "latest";
  }
  if (type === "latest" || type === "secondLatest") {
    const candidates = categories.filter((c) => categoryHistoryOf(stream, c).length >= (type === "secondLatest" ? 2 : 1));
    const category = candidates[randInt(0, candidates.length - 1)];
    const history = categoryHistoryOf(stream, category);
    const correctAnswer = type === "latest" ? history[history.length - 1] : history[history.length - 2];
    const wrongPool = categoryData[category].filter((i) => i !== correctAnswer);
    const wrong = [...wrongPool].sort(() => Math.random() - 0.5).slice(0, 3);
    const options = [...wrong, correctAnswer].sort(() => Math.random() - 0.5);
    const questionText =
      type === "latest"
        ? `What was the latest item in ${category}?`
        : `What was the second latest item in ${category}?`;
    return { type, questionText, correctAnswer, options };
  }

  if (type === "mostRecentCategory") {
    const correctAnswer = stream[stream.length - 1].category;
    const options = [...categories].sort(() => Math.random() - 0.5);
    return { type, questionText: "Which category was updated most recently?", correctAnswer, options };
  }

  // itemBefore
  const idx = randInt(1, stream.length - 1);
  const correctAnswer = stream[idx - 1].item;
  const targetItem = stream[idx].item;
  const wrongPool = stream.filter((s) => s.item !== correctAnswer && s.item !== targetItem).map((s) => s.item);
  const uniqueWrong = [...new Set(wrongPool)].sort(() => Math.random() - 0.5).slice(0, 3);
  const options = [...uniqueWrong, correctAnswer].sort(() => Math.random() - 0.5);
  return {
    type,
    questionText: `Which item came immediately before "${targetItem}" in the sequence?`,
    correctAnswer,
    options,
  };
}

const styles = `
* {
  box-sizing: border-box;
}

html, body, #root {
  margin: 0;
  padding: 0;
  background: #0B0F19;
  width: 100%;
  min-height: 100vh;
}

.kt-intro-screen {
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  background:
    radial-gradient(circle at 20% 20%, rgba(167, 139, 250, 0.1), transparent 40%),
    radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.1), transparent 40%),
    #0B0F19;
  font-family: 'Inter', -apple-system, sans-serif;
  padding: 24px;
  box-sizing: border-box;
  text-align: center;
}

.kt-intro-screen h1 {
  color: #E5E7EB;
  font-size: 32px;
  font-weight: 700;
  margin: 0;
}

.kt-intro-screen .sub {
  color: #8B93A7;
  font-size: 15px;
  max-width: 460px;
  margin: 0;
  line-height: 1.6;
}

.kt-intro-cards {
  display: flex;
  gap: 16px;
  margin: 8px 0 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.kt-intro-card {
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 12px;
  padding: 18px 20px;
  width: 170px;
  text-align: left;
}

.kt-intro-card .dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  margin-bottom: 10px;
  background: linear-gradient(90deg, #34D399, #3B82F6);
}

.kt-intro-card .title {
  color: #E5E7EB;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.kt-intro-card .desc {
  color: #8B93A7;
  font-size: 12px;
  line-height: 1.5;
}

.kt-wrap {
  display: grid;
  grid-template-columns: 1fr 220px;
  gap: 20px;
  background: #0B0F19;
  height: 100vh;
  padding: 32px;
  font-family: 'Inter', -apple-system, sans-serif;
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
}

.kt-arena {
  position: relative;
  background:
    radial-gradient(circle at 15% 20%, rgba(167, 139, 250, 0.08), transparent 40%),
    radial-gradient(circle at 85% 80%, rgba(59, 130, 246, 0.08), transparent 40%),
    #141A2E;
  border: 1px solid #232A3D;
  border-radius: 16px;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: transform 0.05s ease;
}

.kt-arena.shake {
  animation: kt-shake 0.28s ease;
}

@keyframes kt-shake {
  10%, 90% { transform: translateX(-2px); }
  20%, 80% { transform: translateX(4px); }
  30%, 50%, 70% { transform: translateX(-8px); }
  40%, 60% { transform: translateX(8px); }
}

.kt-flash {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
  opacity: 0;
}

.kt-flash.on {
  animation: kt-flash 0.35s ease;
}

@keyframes kt-flash {
  0% { opacity: 0.45; }
  100% { opacity: 0; }
}

.kt-arena-header {
  padding: 20px 24px 8px;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.kt-arena-header h2 {
  color: #E5E7EB;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 4px;
}

.kt-arena-header p {
  color: #8B93A7;
  font-size: 13px;
  margin: 0;
  max-width: 340px;
}

.kt-badge {
  background: rgba(52, 211, 153, 0.12);
  border: 1px solid rgba(52, 211, 153, 0.35);
  color: #34D399;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 20px;
  white-space: nowrap;
}

.kt-badge.warn {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.35);
  color: #F59E0B;
}

.kt-board-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 20px;
  text-align: center;
}

.kt-phase-label {
  color: #8B93A7;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.kt-item-box {
  min-width: 220px;
  padding: 30px 26px;
  border-radius: 20px;
  background: #0B0F19;
  border: 1px solid #232A3D;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.3);
}

.kt-item-box .cat {
  color: #60A5FA;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 8px;
}

.kt-item-box .item {
  color: #E5E7EB;
  font-size: 30px;
  font-weight: 700;
}

.kt-question {
  color: #E5E7EB;
  font-size: 22px;
  font-weight: 700;
  max-width: 480px;
}

.kt-options {
  display: grid;
  grid-template-columns: repeat(2, 180px);
  gap: 12px;
}

.kt-option {
  background: #0B0F19;
  border: 1px solid #232A3D;
  border-radius: 10px;
  color: #E5E7EB;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  padding: 14px;
  cursor: pointer;
  transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
}

.kt-option:active {
  transform: scale(0.96);
}

.kt-option.kt-correct {
  background: radial-gradient(circle at 35% 30%, #6EE7B7, #34D399);
  box-shadow: 0 0 14px rgba(52, 211, 153, 0.45);
  color: #05221A;
  cursor: default;
}

.kt-option.kt-wrong {
  background: radial-gradient(circle at 35% 30%, #FCA5A5, #F87171);
  box-shadow: 0 0 14px rgba(248, 113, 113, 0.45);
  color: #3D0B0B;
  cursor: default;
}

.kt-option.kt-disabled {
  cursor: default;
  opacity: 0.7;
}

.kt-sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.kt-stat {
  background: #141A2E;
  border: 1px solid #232A3D;
  border-radius: 12px;
  padding: 16px;
}

.kt-stat .label {
  color: #8B93A7;
  font-size: 12px;
  margin-bottom: 6px;
}

.kt-stat .value {
  color: #E5E7EB;
  font-size: 22px;
  font-weight: 600;
}

.kt-stat .value.score { color: #F59E0B; }
.kt-stat .value.wrong { color: #F87171; }
.kt-stat .value.level { color: #34D399; }

.kt-progress-bar {
  height: 6px;
  background: #232A3D;
  border-radius: 6px;
  overflow: hidden;
  margin-top: 8px;
}

.kt-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #34D399, #3B82F6);
  transition: width 0.2s ease;
}

.kt-progress-fill.timer {
  background: linear-gradient(90deg, #F59E0B, #F87171);
  transition: width 1s linear;
}

.kt-center-msg {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;
  padding: 24px;
}

.kt-center-msg h2 {
  color: #E5E7EB;
  font-size: 24px;
  margin: 0;
}

.kt-btn {
  background: linear-gradient(90deg, #34D399, #3B82F6);
  color: #05221A;
  border: none;
  border-radius: 8px;
  padding: 12px 28px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}

.kt-results-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  width: 100%;
  max-width: 320px;
}

.kt-results-grid div {
  background: #0B0F19;
  border: 1px solid #232A3D;
  border-radius: 8px;
  padding: 10px;
}

.kt-results-grid .label { color: #8B93A7; font-size: 11px; }
.kt-results-grid .value { color: #E5E7EB; font-size: 16px; font-weight: 600; }
`;

function getResultCopy(score) {
  const pct = score / MAX_POSSIBLE_SCORE;
  if (pct < 0.35) {
    return { title: "Room to grow" };
  }
  if (pct < 0.7) {
    return { title: "Good tracking" };
  }
  return { title: "Sharp memomry" };
}

export default function KeepTrackTask({ onComplete, userId, assessmentId }) {
  const [phase, setPhase] = useState("instructions"); // instructions | streaming | question | roundBreak | done
  const [roundIndex, setRoundIndex] = useState(0);
  const [categories, setCategories] = useState([]);
  const [stream, setStream] = useState([]);
  const [streamStepIndex, setStreamStepIndex] = useState(0);
  const [question, setQuestion] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [maxLevel, setMaxLevel] = useState(0);
  const [roundTimes, setRoundTimes] = useState([]);
  const [score, setScore] = useState(0);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState(SESSION_TIME_LIMIT_MS);

  const startedAtRef = useRef(null);
  const roundStartRef = useRef(null);
  const endedRef = useRef(false);
  const sessionTickRef = useRef(null);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 300);
  };
  const triggerFlash = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 350);
  };

  function scheduleStreamStep(currentStream, idx, displayMs, cats, types) {
    if (endedRef.current) return;
    if (idx >= currentStream.length) {
      const q = buildQuestion(currentStream, cats, types);
      setQuestion(q);
      setSelectedOption(null);
      setPhase("question");
      return;
    }
    setStreamStepIndex(idx);
    setTimeout(() => scheduleStreamStep(currentStream, idx + 1, displayMs, cats, types), displayMs);
  }

  function beginRound(idx) {
    const round = ROUNDS[idx];
    const cats = pickRandomCategories(round.categoryCount);
    const newStream = buildStream(cats, round.itemCount);
    setCategories(cats);
    setStream(newStream);
    setStreamStepIndex(0);
    setQuestion(null);
    setSelectedOption(null);
    roundStartRef.current = performance.now();
    setPhase("streaming");
    scheduleStreamStep(newStream, 0, round.displayMs, cats, round.types);
  }

  function startGame() {
    endedRef.current = false;
    setRoundIndex(0);
    setScore(0);
    setCorrectCount(0);
    setIncorrectCount(0);
    setMaxLevel(0);
    setRoundTimes([]);
    setTimeLeftMs(SESSION_TIME_LIMIT_MS);
    startedAtRef.current = new Date().toISOString();
    beginRound(0);
  }

  // overall session countdown
  useEffect(() => {
    if (phase === "instructions" || phase === "done") return;
    sessionTickRef.current = setInterval(() => {
      setTimeLeftMs((t) => {
        const next = t - 200;
        if (next <= 0) {
          clearInterval(sessionTickRef.current);
          if (!endedRef.current) {
            endedRef.current = true;
            endGame();
          }
          return 0;
        }
        return next;
      });
    }, 200);
    return () => clearInterval(sessionTickRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function handleSelectOption(opt) {
    if (phase !== "question" || selectedOption) return;
    const isCorrect = opt === question.correctAnswer;
    setSelectedOption(opt);
    if (isCorrect) {
      setCorrectCount((c) => c + 1);
      setScore((s) => s + RECALL_POINTS);
    } else {
      setIncorrectCount((c) => c + 1);
      triggerShake();
      triggerFlash();
    }
    const elapsed = Math.round(performance.now() - roundStartRef.current);
    setRoundTimes((prev) => [...prev, elapsed]);
    setMaxLevel((prev) => Math.max(prev, roundIndex + 1));
    setPhase("roundBreak");

    setTimeout(() => {
      if (endedRef.current) return;
      const nextIdx = roundIndex + 1;
      if (nextIdx >= ROUNDS.length) {
        endedRef.current = true;
        endGame();
        return;
      }
      setRoundIndex(nextIdx);
      beginRound(nextIdx);
    }, 900);
  }

  async function endGame() {
    clearInterval(sessionTickRef.current);

    const roundsPlayed = roundTimes.length;

    const recallAccuracy =
      roundsPlayed > 0 ? Math.round((correctCount / roundsPlayed) * 100) : 0;

    const accuracy = recallAccuracy;

    const avgTimeMs = roundTimes.length
      ? Math.round(roundTimes.reduce((a, b) => a + b, 0) / roundTimes.length)
      : 0;

    const payload = {
      assessmentId: localStorage.getItem("assessmentId"),
      gameId: "keep_track_task",
      accuracy,
      avgTimeMs,
      metrics: {
        score,
        maxPossibleScore: MAX_POSSIBLE_SCORE,
        roundsPlayed,
        recallAccuracy,
        maxLevel,
        incorrectRecalls: incorrectCount,
        roundTimesMs: roundTimes,
      },
      completed: true,
    };

    console.log("Assessment ID:", localStorage.getItem("assessmentId"));
    console.log("Payload being sent:", payload);

    try {
      const res = await fetch("http://localhost:5000/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Failed to save session:", res.status, data);
      } else {
        console.log("Session saved successfully:", data);
      }
    } catch (err) {
      console.error("Failed to save session:", err);
    }

    if (onComplete) onComplete(payload);

    setPhase("done");
  }

  const round = ROUNDS[Math.min(roundIndex, ROUNDS.length - 1)];
  const roundsPlayed = roundTimes.length;
  const recallAccuracy = roundsPlayed > 0 ? Math.round((correctCount / roundsPlayed) * 100) : 0;
  const avgTime = roundTimes.length
    ? Math.round(roundTimes.reduce((a, b) => a + b, 0) / roundTimes.length)
    : 0;
  const currentStreamEntry = stream[streamStepIndex];

  if (phase === "instructions") {
    return (
      <div className="kt-intro-screen">
        <style>{styles}</style>
        <h1>Keep Track Task</h1>
        <p className="sub">
          Items from a few categories will flash by one at a time — an
          animal, a country, a color, and so on. Keep a mental note of the
          latest item in each category, because you'll be quizzed right
          after. 3 rounds, harder each time. You've got {Math.round(SESSION_TIME_LIMIT_MS / 1000)} seconds total.
        </p>
        <div className="kt-intro-cards">
          <div className="kt-intro-card">
            <div className="dot" />
            <div className="title">Watch</div>
            <div className="desc">Items appear one at a time, tagged by category.</div>
          </div>
          <div className="kt-intro-card">
            <div className="dot" />
            <div className="title">Track</div>
            <div className="desc">Keep the latest item per category in mind.</div>
          </div>
          <div className="kt-intro-card">
            <div className="dot" style={{ background: "#F87171" }} />
            <div className="title">Recall</div>
            <div className="desc">Answer what was most recently shown.</div>
          </div>
        </div>
        <button className="kt-btn" onClick={startGame}>
          Start the Game
        </button>
      </div>
    );
  }

  return (
    <div className="kt-wrap">
      <style>{styles}</style>

      <div className={`kt-arena ${shake ? "shake" : ""}`}>
        <div className={`kt-flash ${flash ? "on" : ""}`} style={{ background: "#F87171" }} />

        <div className="kt-arena-header">
          <div>
            <h2>Keep Track Task</h2>
            <p>Watch the stream, keep track, then recall.</p>
          </div>
          {phase !== "done" && (
            <div className={`kt-badge ${phase === "streaming" ? "" : "warn"}`}>
              Round {roundIndex + 1}/{ROUNDS.length} • {round.label}
            </div>
          )}
        </div>

        {phase === "streaming" && currentStreamEntry && (
          <div className="kt-board-area">
            <div className="kt-phase-label">Watch</div>
            <div className="kt-item-box">
              <div className="cat">{currentStreamEntry.category}</div>
              <div className="item">{currentStreamEntry.item}</div>
            </div>
          </div>
        )}

        {(phase === "question" || phase === "roundBreak") && question && (
          <div className="kt-board-area">
            <div className="kt-phase-label">Recall</div>
            <div className="kt-question">{question.questionText}</div>
            <div className="kt-options">
              {question.options.map((opt) => {
                let cls = "kt-option";
                if (selectedOption) {
                  if (opt === question.correctAnswer) cls += " kt-correct";
                  else if (opt === selectedOption) cls += " kt-wrong";
                  else cls += " kt-disabled";
                }
                return (
                  <button key={opt} className={cls} onClick={() => handleSelectOption(opt)}>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="kt-center-msg">
            <h2>{getResultCopy(score).title}</h2>
            <div className="kt-results-grid">
              <div>
                <div className="label">Score</div>
                <div className="value">{score}</div>
              </div>
              <div>
                <div className="label">Recall Accuracy</div>
                <div className="value">{recallAccuracy}%</div>
              </div>
              <div>
                <div className="label">Max Level</div>
                <div className="value">{maxLevel}/{ROUNDS.length}</div>
              </div>
              <div>
                <div className="label">Incorrect Recalls</div>
                <div className="value">{incorrectCount}</div>
              </div>
              <div>
                <div className="label">Rounds Played</div>
                <div className="value">{roundsPlayed}</div>
              </div>
              <div>
                <div className="label">Avg Time / Round</div>
                <div className="value">{avgTime}ms</div>
              </div>
            </div>
            <button className="kt-btn" onClick={() => setPhase("instructions")}>
              Play Again
            </button>
          </div>
        )}
      </div>

      <div className="kt-sidebar">
        <div className="kt-stat">
          <div className="label">Time Left</div>
          <div className="value">{Math.ceil(timeLeftMs / 1000)}s</div>
          <div className="kt-progress-bar">
            <div
              className="kt-progress-fill timer"
              style={{ width: `${(timeLeftMs / SESSION_TIME_LIMIT_MS) * 100}%` }}
            />
          </div>
        </div>
        <div className="kt-stat">
          <div className="label">Round</div>
          <div className="value level">{Math.min(roundIndex + 1, ROUNDS.length)}/{ROUNDS.length}</div>
        </div>
        <div className="kt-stat">
          <div className="label">Score</div>
          <div className="value score">{score}</div>
        </div>
        <div className="kt-stat">
          <div className="label">Recall Accuracy</div>
          <div className="value">{recallAccuracy || 0}%</div>
        </div>
        <div className="kt-stat">
          <div className="label">Incorrect Recalls</div>
          <div className="value wrong">{incorrectCount}</div>
        </div>
      </div>
    </div>
  );
}