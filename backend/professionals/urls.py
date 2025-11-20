from rest_framework import routers

from .views import ProfessionalViewSet

router = routers.DefaultRouter()
router.register(r"", ProfessionalViewSet, basename="professional")

urlpatterns = router.urls
