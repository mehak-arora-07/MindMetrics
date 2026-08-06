from pathlib import Path
import sys

import joblib
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LinearRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    mean_absolute_error,
    r2_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler


# Folder paths
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent

# Allows importing feature_schema.py from ml_pipeline
sys.path.append(str(PROJECT_ROOT))

from ml_pipeline.feature_schema import FEATURE_COLUMNS


DATA_FILE = CURRENT_DIR / "synthetic_data.csv"
MODEL_DIR = CURRENT_DIR / "saved_models"

MODEL_DIR.mkdir(exist_ok=True)


def train_models() -> None:
    # 1. Load synthetic dataset
    dataframe = pd.read_csv(DATA_FILE)

    print("Dataset loaded successfully")
    print("Rows:", len(dataframe))
    print("Columns:", len(dataframe.columns))

    # 2. Select ML input features
    x = dataframe[FEATURE_COLUMNS]

    # Targets
    y_score = dataframe["overall_score"]
    y_profile = dataframe["behavior_profile"]

    #  LINEAR REGRESSION
    # Predicts overall score


    (
        x_train_reg,
        x_test_reg,
        y_train_reg,
        y_test_reg,
    ) = train_test_split(
        x,
        y_score,
        test_size=0.20,
        random_state=42,
    )

    # Scale values because reaction times and accuracies

    scaler = StandardScaler()

    x_train_reg_scaled = scaler.fit_transform(x_train_reg)
    x_test_reg_scaled = scaler.transform(x_test_reg)

    regression_model = LinearRegression()

    regression_model.fit(
        x_train_reg_scaled,
        y_train_reg,
    )

    regression_predictions = regression_model.predict(
        x_test_reg_scaled
    )

    regression_mae = mean_absolute_error(
        y_test_reg,
        regression_predictions,
    )

    regression_r2 = r2_score(
        y_test_reg,
        regression_predictions,
    )

    print("\n--- Linear Regression Results ---")
    print("MAE:", round(regression_mae, 4))
    print("R2 Score:", round(regression_r2, 4))

    # RANDOM FOREST CLASSIFIER
    # Predicts behavior profile

    (
        x_train_cls,
        x_test_cls,
        y_train_cls,
        y_test_cls,
    ) = train_test_split(
        x,
        y_profile,
        test_size=0.20,
        random_state=42,
        stratify=y_profile,
    )

    profile_model = RandomForestClassifier(
        n_estimators=150,
        max_depth=12,
        random_state=42,
    )

    profile_model.fit(
        x_train_cls,
        y_train_cls,
    )

    profile_predictions = profile_model.predict(
        x_test_cls
    )

    classifier_accuracy = accuracy_score(
        y_test_cls,
        profile_predictions,
    )

    print("\n--- Random Forest Results ---")
    print(
        "Classification Accuracy:",
        round(classifier_accuracy, 4),
    )

    print(
        classification_report(
            y_test_cls,
            profile_predictions,
        )
    )

    # 3. Save trained models
    joblib.dump(
        regression_model,
        MODEL_DIR / "regression_model.joblib",
    )

    joblib.dump(
        profile_model,
        MODEL_DIR / "profile_model.joblib",
    )

    joblib.dump(
        scaler,
        MODEL_DIR / "scaler.joblib",
    )

    print("\nModels saved successfully")
    print("Saved inside:", MODEL_DIR)


if __name__ == "__main__":
    train_models()