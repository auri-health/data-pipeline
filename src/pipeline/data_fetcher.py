import requests
from typing import Dict, Any, List
import json
from ..config.settings import GARMIN_RAW_DATA_URL

class GarminDataFetcher:
    def __init__(self):
        self.base_url = GARMIN_RAW_DATA_URL

    def fetch_raw_data(self, file_path: str) -> Dict[str, Any]:
        """
        Fetch raw JSON data from GitHub
        
        Args:
            file_path: Path to the JSON file in the GitHub repository
            
        Returns:
            Dict containing the JSON data
        """
        url = f"{self.base_url}/{file_path}"
        response = requests.get(url)
        response.raise_for_status()
        return response.json()

    def fetch_sleep_data(self) -> List[Dict[str, Any]]:
        """Fetch sleep data files"""
        return self.fetch_raw_data("sleep-data.json")

    def fetch_activity_data(self) -> List[Dict[str, Any]]:
        """Fetch activity data files"""
        return self.fetch_raw_data("activities-data.json")

    def fetch_heart_rate_data(self) -> List[Dict[str, Any]]:
        """Fetch heart rate data files"""
        return self.fetch_raw_data("heart-rate-data.json") 