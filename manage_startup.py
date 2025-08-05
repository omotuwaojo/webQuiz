# manage_startup.py
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quizWeb.settings')  # Update this as needed
django.setup()

from django.core.management import call_command
from django.contrib.auth import get_user_model

User = get_user_model()

# Read env variable
run_migrations = os.getenv('RUN_MIGRATIONS', 'false').lower() == 'true'

if run_migrations:
    print("🔧 Running migrations...")
    call_command('migrate', interactive=False)

    print("👤 Checking for superuser...")
    admin_username = os.getenv('DJANGO_SUPERUSER_USERNAME', 'Sweet16')
    admin_email = os.getenv('DJANGO_SUPERUSER_EMAIL', 'Sweet16@gmail.com')
    admin_password = os.getenv('DJANGO_SUPERUSER_PASSWORD', 'sweet16')

    if not User.objects.filter(username=admin_username).exists():
        print(f"🛠️ Creating superuser '{admin_username}'...")
        User.objects.create_superuser(
            username=admin_username,
            email=admin_email,
            password=admin_password
        )
    else:
        print("✅ Superuser already exists.")
else:
    print("⚠️ RUN_MIGRATIONS is not set to true. Skipping migrations.")
