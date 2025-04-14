# Auri Health Data Pipeline

This repository contains the automated data pipeline for importing Garmin health data into the Auri Health Supabase database. The pipeline runs on a scheduled basis to process various types of health data including activities, heart rate measurements, sleep records, and daily step counts.

## Overview

The data pipeline performs the following main functions:
1. Checks the Supabase bucket for new Garmin data files
2. Processes different types of health data:
   - Activities
   - Heart rate measurements
   - Sleep records
   - Daily step counts
3. Validates and transforms the data
4. Imports the processed data into corresponding Supabase database tables

## Architecture

### Data Flow
```
Garmin Device → Garmin Connect → Supabase Bucket → Data Pipeline → Supabase Database
```

### Key Components

- **Regular Data Import Workflow** (`/.github/workflows/import-garmin-data.yml`):
  - Runs on schedule (10:15am, 6:15pm, and 2:15am UTC)
  - Processes current day's data
  - Can be triggered manually via workflow_dispatch
  - Handles the execution environment and secrets

- **Historical Data Import Workflow** (`/.github/workflows/import-historical-data.yml`):
  - Manually triggered workflow for importing historical data
  - Processes all available data in the bucket
  - Uses the same environment and secrets as the regular workflow

- **Main Processing Script** (`/src/import-garmin-data.ts`):
  - Processes different types of health data
  - Implements data validation and transformation
  - Manages database interactions
  - Supports both current-day and historical data processing modes

### Database Tables

The pipeline interacts with the following Supabase tables:

1. `activities`: Stores workout and activity data
2. `heart_rate_readings`: Contains heart rate measurements
3. `sleep_records`: Stores detailed sleep data including:
   - Sleep stages
   - Movement data
   - Overall sleep quality metrics
4. `daily_summaries`: Stores daily aggregated data including step counts

## Setup

### Prerequisites

- Node.js 20.x
- npm
- Supabase project with the following:
  - Service role key
  - Project URL
  - Configured storage bucket for Garmin data

### Environment Variables

The following environment variables are required:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/auri-health/data-pipeline.git
   cd data-pipeline
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the TypeScript code:
   ```bash
   npm run build
   ```

## Usage

### Running Locally

The pipeline can be run in two modes:

1. Current Day Mode (default):
   ```bash
   npm start
   ```
   This processes only files from the current day.

2. Historical Mode:
   ```bash
   npm run start:historical
   ```
   This processes all available files in the bucket.

### GitHub Actions Workflows

#### Regular Data Import
The pipeline automatically runs via GitHub Actions on the following schedule:
- 10:15 AM UTC
- 6:15 PM UTC
- 2:15 AM UTC

You can also trigger this workflow manually through the GitHub Actions interface.

#### Historical Data Import
To import historical data:
1. Go to the "Actions" tab in GitHub
2. Select "Import Historical Garmin Data" workflow
3. Click "Run workflow"
4. Confirm the workflow run

This is useful when:
- Setting up a new environment
- Recovering from data gaps
- Reprocessing historical data after code changes

## Data Processing Details

### Activity Processing
- Validates required fields (timestamp, activity type, duration)
- Processes GPS data if available
- Handles various activity metrics (distance, calories, etc.)

### Heart Rate Processing
- Processes continuous heart rate measurements
- Validates timestamp and value ranges
- Handles batch inserts for efficiency
- Uses consistent device ID across all readings

### Sleep Processing
- Processes detailed sleep stage data
- Validates sleep quality metrics
- Handles movement data during sleep
- Creates unique sleep IDs based on user and timestamp

### Steps Processing
- Aggregates step data into daily summaries
- Handles multiple data points per day
- Updates existing records with new data

## Error Handling

The pipeline implements comprehensive error handling:
- Validates all required fields
- Logs detailed error messages
- Continues processing on non-critical errors
- Reports critical errors through GitHub Actions

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Submit a pull request with a clear description of the changes

## License

[Add appropriate license information]

## Support

For issues or questions, please create a GitHub issue in this repository. 