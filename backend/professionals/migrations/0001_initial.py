# Generated manually to align with spec
from django.db import migrations, models
from django.core.validators import RegexValidator


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Professional",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("full_name", models.CharField(max_length=200)),
                ("email", models.EmailField(max_length=254, unique=True, null=True, blank=True)),
                (
                    "phone",
                    models.CharField(
                        blank=True,
                        max_length=32,
                        null=True,
                        unique=True,
                        validators=[
                            RegexValidator(
                                regex=r"^[+0-9\\s().-]{7,20}$",
                                message="Enter a valid phone number (digits, spaces, +, -, ., parentheses).",
                            )
                        ],
                    ),
                ),
                ("company_name", models.CharField(blank=True, max_length=200)),
                ("job_title", models.CharField(blank=True, max_length=200)),
                (
                    "source",
                    models.CharField(
                        choices=[("direct", "Direct"), ("partner", "Partner"), ("internal", "Internal")],
                        db_index=True,
                        default="direct",
                        max_length=50,
                    ),
                ),
                ("resume", models.FileField(blank=True, null=True, upload_to="resumes/")),
                ("resume_text", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "indexes": [
                    models.Index(fields=["email"], name="idx_prof_email"),
                    models.Index(fields=["phone"], name="idx_prof_phone"),
                    models.Index(fields=["source"], name="idx_prof_source"),
                ],
            },
        ),
    ]
