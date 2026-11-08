# Seeds the local Flagsmith with fixed, example-only values, so the API and the web app can be
# configured in compose.yaml without any manual step. Run by the `flagsmith-seed` job with
# `python manage.py shell`. Safe to run again: it only resets booksV2 to off.
import os

from environments.models import Environment, EnvironmentAPIKey
from features.models import Feature, FeatureState
from projects.models import Project
from users.models import FFAdminUser

ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]
PROJECT_NAME = os.environ["PROJECT_NAME"]
ENVIRONMENT_NAME = "Local"
CLIENT_KEY = os.environ["FLAGSMITH_CLIENT_KEY"]
SERVER_KEY = os.environ["FLAGSMITH_SERVER_KEY"]

# `bootstrap` (ALLOW_ADMIN_INITIATION_VIA_CLI) created the admin, the organisation and the
# project; it only lacks a password.
admin = FFAdminUser.objects.get(email=ADMIN_EMAIL)
admin.set_password(ADMIN_PASSWORD)
admin.save()

project = Project.objects.get(name=PROJECT_NAME)
environment, _ = Environment.objects.get_or_create(
    project=project, name=ENVIRONMENT_NAME, defaults={"api_key": CLIENT_KEY}
)
if environment.api_key != CLIENT_KEY:
    environment.api_key = CLIENT_KEY
    environment.save()

# Server-side key: the backend downloads the whole environment and evaluates flags locally.
EnvironmentAPIKey.objects.get_or_create(
    environment=environment, key=SERVER_KEY, defaults={"name": "library-api"}
)

books_v2, _ = Feature.objects.get_or_create(
    project=project,
    name="booksV2",
    defaults={
        "default_enabled": False,
        "description": "Exposes GET /v2/books (alpha) in the backend and the v2 list in the web app.",
    },
)

# Every `up` starts with the flag off, as a fresh environment would. `save()` (not `update()`) so
# Flagsmith rebuilds the environment document the SDKs download.
for state in FeatureState.objects.filter(
    feature=books_v2, environment=environment, identity=None, feature_segment=None
):
    state.enabled = False
    state.save()

print(f"Flagsmith seeded: project '{PROJECT_NAME}', environment '{ENVIRONMENT_NAME}', flag booksV2")
