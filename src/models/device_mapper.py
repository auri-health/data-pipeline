from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from datetime import datetime
from .garmin_data import SleepData, ActivityData, HeartRateData

class DeviceMapper(ABC):
    """Abstract base class for device-specific data mapping"""
    
    @abstractmethod
    def map_sleep_data(self, raw_data: Dict[str, Any]) -> Optional[SleepData]:
        """Map raw sleep data to SleepData model"""
        pass

    @abstractmethod
    def map_activity_data(self, raw_data: Dict[str, Any]) -> Optional[ActivityData]:
        """Map raw activity data to ActivityData model"""
        pass

    @abstractmethod
    def map_heart_rate_data(self, raw_data: Dict[str, Any]) -> Optional[HeartRateData]:
        """Map raw heart rate data to HeartRateData model"""
        pass

class ForerunnerFR235Mapper(DeviceMapper):
    """Forerunner 235 specific data mapping implementation"""

    def map_sleep_data(self, raw_data: Dict[str, Any]) -> Optional[SleepData]:
        """
        Maps Forerunner 235 sleep data according to device capabilities in forerunner235.md
        Only maps supported fields, excluding unsupported ones like REM sleep
        """
        try:
            return SleepData(
                deep_sleep_seconds=raw_data.get('deepSleepSeconds', 0),
                light_sleep_seconds=raw_data.get('lightSleepSeconds', 0),
                awake_sleep_seconds=raw_data.get('awakeSleepSeconds', 0),
                sleep_movement=raw_data.get('sleepMovement', []),
                date=datetime.fromisoformat(raw_data['date'])
            )
        except (KeyError, ValueError):
            return None

    def map_activity_data(self, raw_data: Dict[str, Any]) -> Optional[ActivityData]:
        """
        Maps Forerunner 235 activity data according to device capabilities
        Handles partially supported fields as optional
        """
        try:
            return ActivityData(
                activity_id=raw_data['activityId'],
                activity_name=raw_data['activityName'],
                start_time_local=datetime.fromisoformat(raw_data['startTimeLocal']),
                start_time_gmt=datetime.fromisoformat(raw_data['startTimeGMT']),
                distance=raw_data['distance'],
                duration=raw_data['duration'],
                average_hr=raw_data['averageHR'],
                max_hr=raw_data['maxHR'],
                calories=raw_data['calories'],
                steps=raw_data['steps'],
                average_speed=raw_data['averageSpeed'],
                max_speed=raw_data['maxSpeed'],
                elevation_gain=raw_data.get('elevationGain'),  # Optional field
                elevation_loss=raw_data.get('elevationLoss'),  # Optional field
                average_running_cadence=raw_data['averageRunningCadenceInStepsPerMinute'],
                max_running_cadence=raw_data['maxRunningCadenceInStepsPerMinute'],
                stride_length=raw_data.get('strideLength')  # Optional field
            )
        except (KeyError, ValueError):
            return None

    def map_heart_rate_data(self, raw_data: Dict[str, Any]) -> Optional[HeartRateData]:
        """
        Maps Forerunner 235 heart rate data
        Only includes supported fields (heart rate and timestamp)
        """
        try:
            return HeartRateData(
                heart_rate=raw_data['heartRate'],
                timestamp=raw_data['timestamp']
            )
        except (KeyError, ValueError):
            return None 