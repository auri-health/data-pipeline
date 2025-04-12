from typing import List, Dict, Any
from ..models.device_mapper import DeviceMapper
from ..models.garmin_data import SleepData, ActivityData, HeartRateData

class GarminDataProcessor:
    def __init__(self, device_mapper: DeviceMapper):
        """
        Initialize processor with device-specific mapper
        
        Args:
            device_mapper: Implementation of DeviceMapper for specific device
        """
        self.device_mapper = device_mapper

    def process_sleep_data(self, raw_data: List[Dict[str, Any]]) -> List[SleepData]:
        """Process raw sleep data using device-specific mapping"""
        processed_data = []
        for item in raw_data:
            mapped_data = self.device_mapper.map_sleep_data(item)
            if mapped_data:
                processed_data.append(mapped_data)
        return processed_data

    def process_activity_data(self, raw_data: List[Dict[str, Any]]) -> List[ActivityData]:
        """Process raw activity data using device-specific mapping"""
        processed_data = []
        for item in raw_data:
            mapped_data = self.device_mapper.map_activity_data(item)
            if mapped_data:
                processed_data.append(mapped_data)
        return processed_data

    def process_heart_rate_data(self, raw_data: List[Dict[str, Any]]) -> List[HeartRateData]:
        """Process raw heart rate data using device-specific mapping"""
        processed_data = []
        for item in raw_data:
            mapped_data = self.device_mapper.map_heart_rate_data(item)
            if mapped_data:
                processed_data.append(mapped_data)
        return processed_data 