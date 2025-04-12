import requests
from typing import Dict, Any, List
import json
from ..config.settings import GARMIN_RAW_DATA_URL

class GarminDataFetcher:
    def __init__(self):
        self.base_url = "https://raw.githubusercontent.com/auri-health/auri/main/garmin_raw"

    def list_available_files(self) -> List[str]:
        """
        List available data files in the garmin_raw directory
        Returns a list of file paths
        """
        # For now, we'll use the GitHub API to list files
        api_url = "https://api.github.com/repos/auri-health/auri/contents/garmin_raw"
        response = requests.get(api_url)
        response.raise_for_status()
        files = response.json()
        return [file['name'] for file in files if file['type'] == 'file']

    def fetch_raw_data(self, file_path: str) -> Dict[str, Any]:
        """
        Fetch raw JSON data from GitHub
        
        Args:
            file_path: Name of the JSON file in the garmin_raw directory
            
        Returns:
            Dict containing the JSON data
        """
        url = f"{self.base_url}/{file_path}"
        response = requests.get(url)
        response.raise_for_status()
        return response.json()

    def fetch_all_data(self) -> Dict[str, List[Dict[str, Any]]]:
        """
        Fetch all available data files
        
        Returns:
            Dict with file names as keys and their contents as values
        """
        all_data = {}
        for file_path in self.list_available_files():
            if file_path.endswith('.json'):
                try:
                    all_data[file_path] = self.fetch_raw_data(file_path)
                except requests.RequestException as e:
                    print(f"Error fetching {file_path}: {e}")
        return all_data

    def fetch_sleep_data(self) -> List[Dict[str, Any]]:
        """Fetch sleep data files"""
        return self.fetch_raw_data("sleep-data.json")

    def fetch_activity_data(self) -> List[Dict[str, Any]]:
        """Fetch activity data files"""
        return self.fetch_raw_data("activities-data.json")

    def fetch_heart_rate_data(self) -> List[Dict[str, Any]]:
        """Fetch heart rate data files"""
        return self.fetch_raw_data("heart-rate-data.json") 