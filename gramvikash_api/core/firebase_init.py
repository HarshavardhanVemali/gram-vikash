import os
import firebase_admin
from firebase_admin import credentials
from django.conf import settings


def initialize_firebase():
    """
    Initializes the Firebase Admin SDK using the credentials path from .env
    """
    cred_path = getattr(settings, 'FIREBASE_CREDENTIALS_PATH', None)

    # Check if we already initialized to avoid ValueError in hot-reloading
    if not firebase_admin._apps:
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            print(f"Warning: Firebase credentials not found at {cred_path}. Firebase auth will fail.")

    return firebase_admin
