import os
API_KEY = os.environ.get("API_KEY", "")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "")
def get_config(): return {"api_key": API_KEY, "db_password": DB_PASSWORD}
