from django.urls import path
from .views import DiagnoseCropView, CropDiagnoseResultView, SaveCropReportView

urlpatterns = [
    path('diagnose/', DiagnoseCropView.as_view(), name='crop_diagnose'),
    path('result/<str:task_id>/', CropDiagnoseResultView.as_view(), name='crop_diagnose_result'),
    path('save-report/', SaveCropReportView.as_view(), name='save_crop_report'),
]
