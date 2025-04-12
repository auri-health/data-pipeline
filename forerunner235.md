# Garmin Forerunner 235 Data Analysis

This document analyzes the Forerunner 235's data capabilities based on actual data files. For each field, we indicate whether it's trackable (✓/✗), if it's timeseries data, and its format. This helps determine which data fields can be reliably used for analysis in the database.

## Database Analysis Implications

When analyzing Forerunner 235 user data in the database:
1. Only analyze fields marked as trackable (✓)
2. For fields marked as partially supported (△), consider data quality limitations
3. Exclude fields marked as not supported (✗) from analysis queries
4. For timeseries analysis:
   - Use fields marked as "Timeseries: ✓"
   - Consider the sampling rate in "Data Details"
   - Join with timestamp data when available

## Sleep Data File (sleep-*.json)

| Field | Trackable | Timeseries | Format | Data Details |
|-------|-----------|------------|--------|--------------|
| `deepSleepSeconds` | ✓ | ✗ | Integer | Total deep sleep duration in seconds per night |
| `lightSleepSeconds` | ✓ | ✗ | Integer | Total light sleep duration in seconds per night |
| `awakeSleepSeconds` | ✓ | ✗ | Integer | Total awake time in seconds per night |
| `sleepMovement` | ✓ | ✓ | Float | Movement level per minute, range 0-1 |
| `remSleepSeconds` | ✗ | ✗ | Integer | Always 0, no REM sleep tracking |
| `sleepQualityTypePK` | ✗ | ✗ | Null | Always null, no quality scoring |
| `sleepResultTypePK` | ✗ | ✗ | Null | Always null, no sleep categorization |
| `respirationRate` | ✗ | ✗ | Null | Not available on this device |
| `pulseOx` | ✗ | ✗ | Null | No blood oxygen monitoring |
| `sleepScore` | ✗ | ✗ | Null | No sleep scoring capability |
| `stressLevel` | ✗ | ✗ | Null | No stress tracking during sleep |

## Activity Data File (activities-*.json)

| Field | Trackable | Timeseries | Format | Data Details |
|-------|-----------|------------|--------|--------------|
| `activityId` | ✓ | ✗ | Integer | Unique identifier for activities |
| `activityName` | ✓ | ✗ | String | Custom or auto-generated name |
| `startTimeLocal` | ✓ | ✗ | ISO8601 | Local start time (YYYY-MM-DD HH:mm:ss) |
| `startTimeGMT` | ✓ | ✗ | ISO8601 | GMT start time (YYYY-MM-DD HH:mm:ss) |
| `distance` | ✓ | ✓ | Float | Distance in meters, updated each second |
| `duration` | ✓ | ✗ | Float | Total duration in seconds |
| `averageHR` | ✓ | ✗ | Integer | Average heart rate for activity |
| `maxHR` | ✓ | ✗ | Integer | Maximum heart rate for activity |
| `calories` | ✓ | ✗ | Integer | Total estimated calories burned |
| `steps` | ✓ | ✓ | Integer | Cumulative step count |
| `averageSpeed` | ✓ | ✗ | Float | Average speed in m/s |
| `maxSpeed` | ✓ | ✗ | Float | Maximum speed in m/s |
| `elevationGain` | △ | ✓ | Float | Cumulative elevation gain in meters |
| `elevationLoss` | △ | ✓ | Float | Cumulative elevation loss in meters |
| `averageRunningCadenceInStepsPerMinute` | ✓ | ✗ | Float | Average steps per minute |
| `maxRunningCadenceInStepsPerMinute` | ✓ | ✗ | Float | Maximum steps per minute |
| `groundContactTime` | ✗ | ✗ | Null | No running dynamics support |
| `groundContactBalanceLeft` | ✗ | ✗ | Null | No left/right balance data |
| `verticalOscillation` | ✗ | ✗ | Null | No vertical movement tracking |
| `runningPower` | ✗ | ✗ | Null | No power metrics |
| `trainingEffect` | ✗ | ✗ | Null | No training effect analysis |
| `trainingEffectAnaerobic` | ✗ | ✗ | Null | No anaerobic effect tracking |
| `recoveryTime` | ✗ | ✗ | Null | No recovery recommendations |
| `performanceCondition` | ✗ | ✗ | Null | No performance condition |
| `strideLength` | △ | ✓ | Float | Basic calculation in meters per stride |

## Heart Rate Data File (heart-rate-*.json)

| Field | Trackable | Timeseries | Format | Data Details |
|-------|-----------|------------|--------|--------------|
| `heartRate` | ✓ | ✓ | Integer | Heart rate value every ~1-2 minutes |
| `timestamp` | ✓ | ✓ | Integer | Unix timestamp in milliseconds |
| `hrvStatus` | ✗ | ✗ | Null | No HRV capability |
| `hrvValueInMs` | ✗ | ✗ | Null | No HRV measurements |
| `stressLevel` | ✗ | ✗ | Null | No stress monitoring |
| `bodyBattery` | ✗ | ✗ | Null | No body battery feature |
| `pulseOx` | ✗ | ✗ | Null | No SpO2 measurements |

## Device Capabilities

| Feature | Supported | Format | Details |
|---------|-----------|--------|----------|
| Storage | ✓ | - | 8GB total capacity |
| Battery Life | ✓ | Hours | 144 hours smartwatch mode |
| GPS | ✓ | Float | Lat/Long coordinates, ~1s updates |
| Heart Rate | ✓ | Integer | Optical HR, ~1-2s during activity |
| Notifications | △ | String | Basic text only, no actions |
| Music Control | ✗ | - | No music features |
| Payments | ✗ | - | No contactless payments |
| Weather | ✗ | - | No weather data |
| Barometric Altimeter | ✗ | - | No elevation tracking |
| Touchscreen | ✗ | - | Button control only |

Legend:
- ✓ : Fully supported - Include in database analysis
- △ : Partially supported/Limited accuracy - Use with caution in analysis
- ✗ : Not supported - Exclude from database queries
- Timeseries: Data collected over time at regular intervals
- Format: Data type and structure of the field

---
Note: This analysis is based on actual data files extracted from the device. When querying the database, filter by device model to ensure accurate analysis based on device capabilities. Timeseries data typically has timestamps associated with each data point.

## Example Database Query Considerations

### Sleep Analysis
```sql
-- Good: Analyzing supported sleep metrics
SELECT 
    deep_sleep_seconds,  -- ✓ Supported
    light_sleep_seconds, -- ✓ Supported
    awake_sleep_seconds -- ✓ Supported
FROM sleep_data
WHERE device_model = 'Forerunner 235';

-- Avoid: Querying unsupported metrics
-- Do NOT include rem_sleep_seconds, sleep_score, or stress_level
```

### Activity Analysis
```sql
-- Good: Analyzing supported metrics
SELECT 
    distance,           -- ✓ Supported, timeseries
    average_hr,        -- ✓ Supported
    steps,             -- ✓ Supported, timeseries
    calories           -- ✓ Supported
FROM activity_data
WHERE device_model = 'Forerunner 235';

-- Use with caution: Limited accuracy metrics
-- elevation_gain, elevation_loss, stride_length

-- Avoid: Unsupported metrics
-- Do NOT include ground_contact_time, vertical_oscillation, running_power
```

### Heart Rate Analysis
```sql
-- Good: Analyzing supported metrics
SELECT 
    heart_rate,        -- ✓ Supported, timeseries
    timestamp          -- ✓ Supported, timeseries
FROM heart_rate_data
WHERE device_model = 'Forerunner 235'
AND timestamp BETWEEN start_time AND end_time;

-- Avoid: Unsupported metrics
-- Do NOT include hrv_value, stress_level, body_battery, pulse_ox
``` 