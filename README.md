# Auri Health Data Pipeline

This repository contains the data pipeline for processing Garmin device data for Auri Health. The pipeline specifically handles data from the Garmin Forerunner 235 device.

## Pipeline Overview

1. **Data Source**: Raw Garmin data from [auri-health/auri/garmin_raw](https://github.com/auri-health/auri/tree/main/garmin_raw)
2. **Data Filtering**: Processes data according to device capabilities documented in [forerunner235.md](forerunner235.md)
3. **Data Destination**: Filtered and processed data is pushed to Supabase

## Supported Data Types

Based on the Forerunner 235 capabilities, the pipeline processes:

### Sleep Data
- Deep sleep duration
- Light sleep duration
- Awake time
- Sleep movement (timeseries)

### Activity Data
- Basic metrics (distance, duration, calories, steps)
- Heart rate data (average, max)
- Speed metrics (average, max)
- Running cadence
- Limited elevation and stride length data

### Heart Rate Data
- Heart rate values (timeseries)
- Associated timestamps

## Setup

[Setup instructions will be added once the pipeline implementation is complete]

## Development

[Development instructions will be added once the pipeline implementation is complete]

## License

[License information to be added] 