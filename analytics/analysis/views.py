import json
from pathlib import Path

import joblib
import pandas as pd

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from ml_pipeline.feature_schema import FEATURE_COLUMNS


# ----------------------------
# Load trained models once
# ----------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_DIR = BASE_DIR / "ml_pipeline" / "saved_models"

REGRESSION_MODEL = joblib.load(
    MODEL_DIR / "regression_model.joblib"
)

PROFILE_MODEL = joblib.load(
    MODEL_DIR / "profile_model.joblib"
)

SCALER = joblib.load(
    MODEL_DIR / "scaler.joblib"
)


# ----------------------------
# Prediction API
# ----------------------------

@csrf_exempt
def predict_assessment(request):

    if request.method != "POST":
        return JsonResponse(
            {
                "success": False,
                "message": "POST request required"
            },
            status=405,
        )

    try:
        body = json.loads(request.body)

        # ----------------------------
        # Validate required features
        # ----------------------------

        missing_features = [
            feature
            for feature in FEATURE_COLUMNS
            if feature not in body
        ]

        if missing_features:
            return JsonResponse(
                {
                    "success": False,
                    "message": "Missing required features",
                    "missingFeatures": missing_features,
                },
                status=400,
            )

        # ----------------------------
        # Build DataFrame
        # ----------------------------

        values = [
            float(body[feature])
            for feature in FEATURE_COLUMNS
        ]

        feature_frame = pd.DataFrame(
            [values],
            columns=FEATURE_COLUMNS,
        )

        # ----------------------------
        # Linear Regression
        # ----------------------------

        scaled_features = SCALER.transform(
            feature_frame
        )

        overall_score = float(
            REGRESSION_MODEL.predict(
                scaled_features
            )[0]
        )

        overall_score = max(
            0,
            min(100, overall_score),
        )

        # ----------------------------
        # Random Forest
        # ----------------------------

        behavior_profile = str(
            PROFILE_MODEL.predict(
                feature_frame
            )[0]
        )

        probabilities = PROFILE_MODEL.predict_proba(
            feature_frame
        )[0]

        confidence = float(
            probabilities.max()
        )

        # ----------------------------
        # Response
        # ----------------------------

        return JsonResponse(
            {
                "success": True,
                "prediction": {
                    "overallScore": round(
                        overall_score,
                        2,
                    ),
                    "behaviorProfile": behavior_profile,
                    "confidence": round(
                        confidence,
                        4,
                    ),
                },
            }
        )

    except json.JSONDecodeError:
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid JSON body",
            },
            status=400,
        )

    except (TypeError, ValueError):
        return JsonResponse(
            {
                "success": False,
                "message": "All features must be numeric",
            },
            status=400,
        )

    except Exception as error:
        print("Prediction Error:", error)

        return JsonResponse(
            {
                "success": False,
                "message": "Prediction failed",
                "error": str(error),
            },
            status=500,
        )