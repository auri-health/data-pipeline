from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class SleepData(BaseModel):
    deep_sleep_seconds: int
    light_sleep_seconds: int
    awake_sleep_seconds: int
    sleep_movement: List[float]  # Timeseries data
    date: datetime

class ActivityData(BaseModel):
    activity_id: int
    activity_name: str
    start_time_local: datetime
    start_time_gmt: datetime
    distance: float
    duration: float
    average_hr: int
    max_hr: int
    calories: int
    steps: int
    average_speed: float
    max_speed: float
    elevation_gain: Optional[float]  # Limited accuracy
    elevation_loss: Optional[float]  # Limited accuracy
    average_running_cadence: float
    max_running_cadence: float
    stride_length: Optional[float]  # Limited accuracy

class HeartRateData(BaseModel):
    heart_rate: int
    timestamp: int  # Unix timestamp in milliseconds 