import pytest
from datetime import datetime

@pytest.fixture
def sample_sleep_data():
    return {
        "deepSleepSeconds": 7200,  # 2 hours
        "lightSleepSeconds": 14400,  # 4 hours
        "awakeSleepSeconds": 1800,  # 30 minutes
        "sleepMovement": [0.1, 0.2, 0.3],
        "date": "2024-03-15T22:00:00",
        # Unsupported fields that should be ignored
        "remSleepSeconds": 0,
        "sleepScore": None,
        "stressLevel": None
    }

@pytest.fixture
def sample_activity_data():
    return {
        "activityId": 12345,
        "activityName": "Morning Run",
        "startTimeLocal": "2024-03-15T06:30:00",
        "startTimeGMT": "2024-03-15T13:30:00",
        "distance": 5000.0,  # 5km
        "duration": 1800.0,  # 30 minutes
        "averageHR": 145,
        "maxHR": 165,
        "calories": 300,
        "steps": 6000,
        "averageSpeed": 2.78,  # m/s
        "maxSpeed": 3.5,
        "elevationGain": 50.0,
        "elevationLoss": 50.0,
        "averageRunningCadenceInStepsPerMinute": 170.0,
        "maxRunningCadenceInStepsPerMinute": 180.0,
        "strideLength": 1.2,
        # Unsupported fields that should be ignored
        "groundContactTime": None,
        "verticalOscillation": None
    }

@pytest.fixture
def sample_heart_rate_data():
    return {
        "heartRate": 75,
        "timestamp": 1710515400000,  # 2024-03-15T13:30:00Z
        # Unsupported fields that should be ignored
        "hrvStatus": None,
        "stressLevel": None,
        "bodyBattery": None
    } 