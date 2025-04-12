import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Supabase settings
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

# Source data settings
GARMIN_RAW_DATA_URL = "https://raw.githubusercontent.com/auri-health/auri/main/garmin_raw"

# Validate required settings
if not all([SUPABASE_URL, SUPABASE_KEY]):
    raise ValueError("Missing required environment variables. Please check .env file.") 