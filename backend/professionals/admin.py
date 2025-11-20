from django.contrib import admin
from .models import Professional


@admin.register(Professional)
class ProfessionalAdmin(admin.ModelAdmin):
    list_display = ("id", "full_name", "email", "phone", "company_name", "job_title", "source", "created_at")
    search_fields = ("full_name", "email", "phone", "company_name", "job_title")
    list_filter = ("source", "company_name")
