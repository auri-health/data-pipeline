import requests
from typing import Dict, Any, List
import json
import os

class GarminDataFetcher:
    def __init__(self):
        # Base URL for raw content
        self.base_url = "https://raw.githubusercontent.com/auri-health/auri/main/garmin_raw"
        # API URL for repository contents
        self.api_url = "https://api.github.com/repos/auri-health/auri/contents/garmin_raw"
        # Get GitHub token from environment
        self.headers = {
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28'
        }
        if github_token := os.getenv('GITHUB_TOKEN'):
            self.headers['Authorization'] = f'Bearer {github_token}'

    def list_available_files(self) -> List[str]:
        """
        List available Garmin data files in the repository
        Returns a list of file paths
        """
        response = requests.get(self.api_url, headers=self.headers)
        print(f"Response status: {response.status_code}")
        print(f"Response headers: {response.headers}")
        print(f"Response content: {response.text}")
        response.raise_for_status()
        contents = response.json()
        
        # Look for JSON files
        garmin_files = []
        for item in contents:
            if item['type'] == 'file' and item['name'].endswith('.json'):
                garmin_files.append(item['name'])
        
        return garmin_files

    def fetch_raw_data(self, file_path: str) -> Dict[str, Any]:
        """
        Fetch raw JSON data from GitHub
        
        Args:
            file_path: Path to the JSON file in the repository
            
        Returns:
            Dict containing the JSON data
        """
        url = f"{self.base_url}/{file_path}"
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json()

    def fetch_all_data(self) -> Dict[str, List[Dict[str, Any]]]:
        """
        Fetch all available Garmin data files
        
        Returns:
            Dict with file names as keys and their contents as values
        """
        all_data = {}
        for file_path in self.list_available_files():
            try:
                all_data[file_path] = self.fetch_raw_data(file_path)
            except requests.RequestException as e:
                print(f"Error fetching {file_path}: {e}")
        return all_data

    def fetch_sleep_data(self) -> List[Dict[str, Any]]:
        """Fetch sleep data files"""
        files = self.list_available_files()
        sleep_files = [f for f in files if 'sleep' in f.lower()]
        if not sleep_files:
            raise FileNotFoundError("No sleep data files found")
        return self.fetch_raw_data(sleep_files[0])

    def fetch_activity_data(self) -> List[Dict[str, Any]]:
        """Fetch activity data files"""
        files = self.list_available_files()
        activity_files = [f for f in files if 'activit' in f.lower()]
        if not activity_files:
            raise FileNotFoundError("No activity data files found")
        return self.fetch_raw_data(activity_files[0])

    def fetch_heart_rate_data(self) -> List[Dict[str, Any]]:
        """Fetch heart rate data files"""
        files = self.list_available_files()
        hr_files = [f for f in files if 'heart' in f.lower() or 'hr' in f.lower()]
        if not hr_files:
            raise FileNotFoundError("No heart rate data files found")
        return self.fetch_raw_data(hr_files[0]) 