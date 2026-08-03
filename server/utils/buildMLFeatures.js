function getSession(sessions, gameId) {
  return sessions.find((session) => session.gameId === gameId);
}

function buildMLFeatures(sessions) {
  const memory = getSession(sessions, "memory_matrix");
  const pattern = getSession(sessions, "pattern_sequence");
  const multiSwitch = getSession(sessions, "multi_switch");
  const dualTask = getSession(sessions, "dual_task");
  const cpt = getSession(sessions, "cpt");
  const keepTrack = getSession(sessions, "keep_track_task");
  const operationSpan = getSession(sessions, "operation_span");
  const findBox = getSession(sessions, "find_the_box");
  const colorNumber = getSession(
    sessions,
    "color_number_reaction"
  );
  const ruleDiscovery = getSession(
    sessions,
    "rule_discovery"
  );

  const requiredSessions = [
    memory,
    pattern,
    multiSwitch,
    dualTask,
    cpt,
    keepTrack,
    operationSpan,
    findBox,
    colorNumber,
    ruleDiscovery,
  ];

  if (requiredSessions.some((session) => !session)) {
    throw new Error(
      "One or more required game sessions are missing"
    );
  }

  return {
    memory_matrix_accuracy:
      memory.accuracy ?? 0,

    memory_matrix_avg_time:
      memory.avgTimeMs ?? 0,

    pattern_sequence_accuracy:
      pattern.accuracy ?? 0,

    pattern_sequence_avg_time:
      pattern.avgTimeMs ?? 0,

    multi_switch_accuracy:
      multiSwitch.accuracy ?? 0,

    switch_cost_ms:
      multiSwitch.metrics?.switchCostMs ?? 0,

    dual_task_memory_accuracy:
      dualTask.metrics?.memoryAccuracy ?? 0,

    dual_task_math_accuracy:
      dualTask.metrics?.mathAccuracy ?? 0,

    cpt_accuracy:
      cpt.accuracy ?? 0,

    cpt_false_positives:
      cpt.metrics?.falsePositives ?? 0,

    keep_track_accuracy:
      keepTrack.accuracy ?? 0,

    operation_span_processing_accuracy:
      operationSpan.metrics?.processingAccuracy ?? 0,

    operation_span_storage_accuracy:
      operationSpan.metrics?.storageAccuracy ?? 0,

    find_the_box_accuracy:
      findBox.accuracy ?? 0,

    color_number_accuracy:
      colorNumber.accuracy ?? 0,

    color_number_false_clicks:
      colorNumber.metrics?.falseClicks ?? 0,

    rule_discovery_accuracy:
      ruleDiscovery.accuracy ?? 0,

    average_rule_guesses:
      ruleDiscovery.metrics?.averageRuleGuesses ?? 0,

    average_discovery_time_ms:
      ruleDiscovery.metrics?.averageDiscoveryTimeMs ?? 0,
  };
}

module.exports = buildMLFeatures;