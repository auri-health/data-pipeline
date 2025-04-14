# Garmin Data Mapping

This document provides a general mapping of all data fields available through the Garmin Connect API extraction. This is a device-agnostic mapping that shows all possible fields that can be extracted.

## Sleep Data (sleep-*.json)

| Field | Format | Description |
|-------|--------|-------------|
| `deepSleepSeconds` | Integer | Total deep sleep duration in seconds |
| `lightSleepSeconds` | Integer | Total light sleep duration in seconds |
| `remSleepSeconds` | Integer | Total REM sleep duration in seconds |
| `awakeSleepSeconds` | Integer | Total time awake in seconds |
| `sleepMovement` | Float | Movement level, range 0-1 |
| `sleepQualityTypePK` | String | Sleep quality classification |
| `sleepResultTypePK` | String | Overall sleep result classification |
| `respirationRate` | Float | Average breaths per minute |
| `pulseOx` | Integer | Blood oxygen saturation percentage |
| `sleepScore` | Integer | Overall sleep quality score |
| `stressLevel` | Integer | Stress level during sleep |
| `startTimeLocal` | ISO8601 | Local sleep start time |
| `startTimeGMT` | ISO8601 | GMT sleep start time |
| `durationInSeconds` | Integer | Total sleep duration |

## Activity Data (activities-*.json)

| Field | Format | Description |
|-------|--------|-------------|
| `activityId` | Integer | Unique identifier for the activity |
| `activityName` | String | Name of the activity |
| `startTimeLocal` | ISO8601 | Local start time |
| `startTimeGMT` | ISO8601 | GMT start time |
| `distance` | Float | Distance in meters |
| `duration` | Float | Duration in seconds |
| `averageHR` | Integer | Average heart rate |
| `maxHR` | Integer | Maximum heart rate |
| `calories` | Integer | Calories burned |
| `steps` | Integer | Total steps during activity |
| `averageSpeed` | Float | Average speed in m/s |
| `maxSpeed` | Float | Maximum speed in m/s |
| `elevationGain` | Float | Total elevation gain in meters |
| `elevationLoss` | Float | Total elevation loss in meters |
| `averageRunningCadenceInStepsPerMinute` | Float | Average running cadence |
| `maxRunningCadenceInStepsPerMinute` | Float | Maximum running cadence |
| `groundContactTime` | Integer | Ground contact time in milliseconds |
| `groundContactBalanceLeft` | Float | Left foot ground contact balance % |
| `verticalOscillation` | Float | Vertical oscillation in meters |
| `runningPower` | Float | Running power in watts |
| `trainingEffect` | Float | Aerobic training effect score |
| `trainingEffectAnaerobic` | Float | Anaerobic training effect score |
| `recoveryTime` | Integer | Recommended recovery time in hours |
| `performanceCondition` | Integer | Performance condition score |
| `strideLength` | Float | Average stride length in meters |
| `deviceId` | String | Device identifier |
| `activityType` | String | Type of activity (running, cycling, etc.) |
| `averageVerticalRatio` | Float | Vertical ratio percentage |
| `avgStrideLength` | Float | Average stride length |
| `avgFractionalCadence` | Float | Average fractional cadence |
| `maxFractionalCadence` | Float | Maximum fractional cadence |
| `trainingStressScore` | Float | Training stress score |
| `intensityFactor` | Float | Intensity factor |
| `vo2MaxValue` | Float | VO2 Max estimate |
| `aerobicTrainingEffect` | Float | Aerobic training effect |
| `anaerobicTrainingEffect` | Float | Anaerobic training effect |

## Heart Rate Data (heart-rate-*.json)

| Field | Format | Description |
|-------|--------|-------------|
| `heartRate` | Integer | Heart rate value |
| `timestamp` | Integer | Unix timestamp in milliseconds |
| `hrvStatus` | String | Heart rate variability status |
| `hrvValueInMs` | Float | Heart rate variability in milliseconds |
| `stressLevel` | Integer | Current stress level |
| `bodyBattery` | Integer | Body battery level |
| `pulseOx` | Integer | Blood oxygen saturation percentage |
| `deviceId` | String | Device identifier |

## Steps Data (steps-*.json)

| Field | Format | Description |
|-------|--------|-------------|
| `steps` | Integer | Step count |
| `timestamp` | Integer | Unix timestamp in milliseconds |
| `deviceId` | String | Device identifier |
| `startTimeLocal` | ISO8601 | Local time of step count |
| `startTimeGMT` | ISO8601 | GMT time of step count |
| `calendarDate` | String | Date in YYYY-MM-DD format |
| `activeSteps` | Integer | Steps during active periods |
| `activeTime` | Integer | Time spent active in seconds |
| `floorsClimbed` | Integer | Number of floors climbed |
| `distanceInMeters` | Float | Distance covered in meters |
| `activeCalories` | Integer | Calories burned during activity |
| `totalCalories` | Integer | Total calories burned |

## Notes

1. Data Frequency:
   - Heart rate: Typically recorded every 1-2 minutes during normal use, more frequently during activities
   - Steps: Updated throughout the day, typically aggregated per minute
   - Sleep: One record per sleep session with detailed breakdowns
   - Activities: One record per activity with detailed metrics

2. Time Formats:
   - Most timestamps are provided in both local time and GMT
   - Unix timestamps are in milliseconds
   - ISO8601 format: YYYY-MM-DDTHH:mm:ss

3. Units:
   - Distances are in meters
   - Speeds are in meters per second
   - Times are in seconds unless specified otherwise
   - Temperatures in Celsius
   - Heart rates in beats per minute
   - Elevations in meters

4. Data Availability:
   - Not all fields will be available for every activity or measurement
   - Some fields may be device-dependent
   - Data availability may also depend on the type of activity

## Example JSON Responses

### Sleep Data Example
```json
{
  "deepSleepSeconds": 7200,
  "lightSleepSeconds": 14400,
  "remSleepSeconds": 5400,
  "awakeSleepSeconds": 1800,
  "sleepMovement": 0.15,
  "sleepQualityTypePK": "GOOD",
  "sleepResultTypePK": "DEEP_SLEEP",
  "respirationRate": 14.5,
  "pulseOx": 97,
  "sleepScore": 85,
  "stressLevel": 25,
  "startTimeLocal": "2025-04-13T22:30:00",
  "startTimeGMT": "2025-04-14T05:30:00",
  "durationInSeconds": 28800
}
```

### Activity Data Example
```json
{
  "activityId": 8675309,
  "activityName": "Morning Run",
  "activityType": "RUNNING",
  "startTimeLocal": "2025-04-13T06:30:00",
  "startTimeGMT": "2025-04-13T13:30:00",
  "distance": 5000.0,
  "duration": 1800.0,
  "averageHR": 145,
  "maxHR": 165,
  "calories": 450,
  "steps": 6500,
  "averageSpeed": 2.78,
  "maxSpeed": 3.5,
  "elevationGain": 50.0,
  "elevationLoss": 50.0,
  "averageRunningCadenceInStepsPerMinute": 175.0,
  "maxRunningCadenceInStepsPerMinute": 185.0,
  "groundContactTime": 250,
  "groundContactBalanceLeft": 49.8,
  "verticalOscillation": 0.095,
  "runningPower": 250.0,
  "trainingEffect": 3.5,
  "trainingEffectAnaerobic": 2.0,
  "recoveryTime": 12,
  "performanceCondition": 4,
  "strideLength": 1.2,
  "deviceId": "3935428920",
  "averageVerticalRatio": 7.5,
  "avgStrideLength": 1.2,
  "avgFractionalCadence": 87.5,
  "maxFractionalCadence": 92.5,
  "trainingStressScore": 45.5,
  "intensityFactor": 0.85,
  "vo2MaxValue": 48.0,
  "aerobicTrainingEffect": 3.5,
  "anaerobicTrainingEffect": 2.0
}
```

### Heart Rate Data Example
```json
{
  "heartRate": 72,
  "timestamp": 1681433400000,
  "hrvStatus": "NORMAL",
  "hrvValueInMs": 45.5,
  "stressLevel": 35,
  "bodyBattery": 65,
  "pulseOx": 98,
  "deviceId": "3935428920"
}
```

### Steps Data Example
```json
{
  "steps": 8500,
  "timestamp": 1681433400000,
  "deviceId": "3935428920",
  "startTimeLocal": "2025-04-13T14:30:00",
  "startTimeGMT": "2025-04-13T21:30:00",
  "calendarDate": "2025-04-13",
  "activeSteps": 6200,
  "activeTime": 3600,
  "floorsClimbed": 5,
  "distanceInMeters": 6500.0,
  "activeCalories": 350,
  "totalCalories": 450
}
``` 