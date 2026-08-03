from django.urls import path

from .views import predict_assessment


urlpatterns = [
    path("predict/", predict_assessment),
]