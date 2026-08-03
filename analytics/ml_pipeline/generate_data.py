from pathlib import Path

import numpy as np
import pandas as pd


RANDOM_SEED = 42
ROW_COUNT = 3000

rng = np.random.default_rng(RANDOM_SEED)

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_FILE = BASE_DIR / "synthetic_data.csv"


def clamp(value: float, minimum: float, maximum: float) -> float:
    return float(np.clip(value, minimum, maximum))


def generate_accuracy(
    ability: float,
    impulsivity: float,
    consistency: float,
    noise: float = 6.0,
) -> float:
    value = (
        ability * 100
        - impulsivity * 12
        + consistency * 8
        + rng.normal(0, noise)
    )

    return round(clamp(value, 20, 100), 2)


def generate_reaction_time(speed: float) -> float:
    value = 2800 - speed * 1900 + rng.normal(0, 180)

    return round(clamp(value, 300, 3500), 2)


def generate_row(profile: str) -> dict:
    if profile == "Efficient":
        ability = rng.normal(0.85, 0.06)
        speed = rng.normal(0.82, 0.08)
        impulsivity = rng.normal(0.15, 0.06)
        consistency = rng.normal(0.85, 0.07)

    elif profile == "Careful":
        ability = rng.normal(0.82, 0.07)
        speed = rng.normal(0.48, 0.08)
        impulsivity = rng.normal(0.10, 0.05)
        consistency = rng.normal(0.82, 0.08)

    elif profile == "Impulsive":
        ability = rng.normal(0.58, 0.10)
        speed = rng.normal(0.86, 0.07)
        impulsivity = rng.normal(0.78, 0.09)
        consistency = rng.normal(0.50, 0.12)

    else:
        ability = rng.normal(0.62, 0.17)
        speed = rng.normal(0.58, 0.18)
        impulsivity = rng.normal(0.45, 0.18)
        consistency = rng.normal(0.30, 0.10)

    memory_accuracy = generate_accuracy(
        ability,
        impulsivity,
        consistency,
    )

    pattern_accuracy = generate_accuracy(
        ability,
        impulsivity,
        consistency,
        noise=8.0,
    )

    multi_switch_accuracy = generate_accuracy(
        ability,
        impulsivity,
        consistency,
        noise=8.0,
    )

    dual_memory_accuracy = generate_accuracy(
        ability,
        impulsivity,
        consistency,
        noise=8.0,
    )

    dual_math_accuracy = generate_accuracy(
        ability,
        impulsivity,
        consistency,
        noise=8.0,
    )

    cpt_accuracy = generate_accuracy(
        ability,
        impulsivity,
        consistency,
    )

    keep_track_accuracy = generate_accuracy(
        ability,
        impulsivity,
        consistency,
        noise=8.0,
    )

    operation_processing_accuracy = generate_accuracy(
        ability,
        impulsivity,
        consistency,
        noise=8.0,
    )

    operation_storage_accuracy = generate_accuracy(
        ability,
        impulsivity,
        consistency,
        noise=8.0,
    )

    find_box_accuracy = generate_accuracy(
        ability,
        impulsivity,
        consistency,
        noise=8.0,
    )

    color_number_accuracy = generate_accuracy(
        ability,
        impulsivity,
        consistency,
        noise=8.0,
    )

    rule_discovery_accuracy = generate_accuracy(
        ability,
        impulsivity,
        consistency,
        noise=9.0,
    )

    memory_time = generate_reaction_time(speed)
    pattern_time = generate_reaction_time(speed)

    switch_cost = clamp(
        900
        - speed * 350
        - consistency * 300
        + rng.normal(0, 90),
        40,
        1000,
    )

    cpt_false_positives = int(
        clamp(
            impulsivity * 12 + rng.normal(0, 1.5),
            0,
            20,
        )
    )

    color_false_clicks = int(
        clamp(
            impulsivity * 10 + rng.normal(0, 1.3),
            0,
            18,
        )
    )

    average_rule_guesses = clamp(
        5
        - ability * 3
        + impulsivity
        + rng.normal(0, 0.4),
        1,
        6,
    )

    average_discovery_time_ms = clamp(
        9000
        - ability * 4500
        + rng.normal(0, 600),
        1000,
        10000,
    )

    overall_score = (
        memory_accuracy * 0.12
        + pattern_accuracy * 0.10
        + multi_switch_accuracy * 0.10
        + dual_memory_accuracy * 0.06
        + dual_math_accuracy * 0.06
        + cpt_accuracy * 0.12
        + keep_track_accuracy * 0.08
        + operation_processing_accuracy * 0.06
        + operation_storage_accuracy * 0.06
        + find_box_accuracy * 0.08
        + color_number_accuracy * 0.08
        + rule_discovery_accuracy * 0.08
        + rng.normal(0, 2.5)
    )

    return {
        "memory_matrix_accuracy": memory_accuracy,
        "memory_matrix_avg_time": memory_time,
        "pattern_sequence_accuracy": pattern_accuracy,
        "pattern_sequence_avg_time": pattern_time,
        "multi_switch_accuracy": multi_switch_accuracy,
        "switch_cost_ms": round(switch_cost, 2),
        "dual_task_memory_accuracy": dual_memory_accuracy,
        "dual_task_math_accuracy": dual_math_accuracy,
        "cpt_accuracy": cpt_accuracy,
        "cpt_false_positives": cpt_false_positives,
        "keep_track_accuracy": keep_track_accuracy,
        "operation_span_processing_accuracy":
            operation_processing_accuracy,
        "operation_span_storage_accuracy":
            operation_storage_accuracy,
        "find_the_box_accuracy": find_box_accuracy,
        "color_number_accuracy": color_number_accuracy,
        "color_number_false_clicks": color_false_clicks,
        "rule_discovery_accuracy": rule_discovery_accuracy,
        "average_rule_guesses": round(
            average_rule_guesses,
            2,
        ),
        "average_discovery_time_ms": round(
            average_discovery_time_ms,
            2,
        ),
        "overall_score": round(
            clamp(overall_score, 0, 100),
            2,
        ),
        "behavior_profile": profile,
    }


def main() -> None:
    profiles = [
        "Efficient",
        "Careful",
        "Impulsive",
        "Inconsistent",
    ]

    rows = [
        generate_row(
            profiles[index % len(profiles)]
        )
        for index in range(ROW_COUNT)
    ]

    dataframe = pd.DataFrame(rows)

    dataframe = dataframe.sample(
        frac=1,
        random_state=RANDOM_SEED,
    ).reset_index(drop=True)

    dataframe.to_csv(
        OUTPUT_FILE,
        index=False,
    )

    print(f"Generated {len(dataframe)} rows")
    print(f"Saved to: {OUTPUT_FILE}")
    print()
    print(dataframe.head())
    print()
    print(dataframe["behavior_profile"].value_counts())


if __name__ == "__main__":
    main()