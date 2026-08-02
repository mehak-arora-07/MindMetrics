export const GAME_SEQUENCE = [
  {
    gameId: "memory_matrix",
    path: "/play/memory-matrix",
  },
  {
    gameId: "pattern_sequence",
    path: "/play/pattern-sequence",
  },
  {
    gameId: "multi_switch",
    path: "/play/multi-switch",
  },
  {
    gameId: "dual_task",
    path: "/play/dual-task",
  },
  {
    gameId: "cpt",
    path: "/play/cpt",
  },
  {
    gameId: "keep_track_task",
    path: "/play/keep-track",
  },
  {
    gameId: "operation_span",
    path: "/play/operation-span",
  },
  {
    gameId: "find_the_box",
    path: "/play/find-the-box",
  },
  {
    gameId: "color_number_reaction",
    path: "/play/color-number",
  },
  {
    gameId: "rule_discovery",
    path: "/play/rule-discovery",
  },
];

export function getNextGamePath(currentGameId) {
  const currentIndex = GAME_SEQUENCE.findIndex(
    (game) => game.gameId === currentGameId
  );

  if (currentIndex === -1) {
    return null;
  }

  const nextGame = GAME_SEQUENCE[currentIndex + 1];

  return nextGame ? nextGame.path : null;
}