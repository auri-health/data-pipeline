import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface UserSummary {
  userProfileId: number;
  totalKilocalories: number | null;
  activeKilocalories: number | null;
  bmrKilocalories: number | null;
  totalSteps: number | null;
  totalDistanceMeters: number | null;
  highlyActiveSeconds: number | null;
  activeSeconds: number | null;
  sedentarySeconds: number | null;
  sleepingSeconds: number | null;
  moderateIntensityMinutes: number | null;
  vigorousIntensityMinutes: number | null;
  minHeartRate: number | null;
  maxHeartRate: number | null;
  restingHeartRate: number | null;
  averageStressLevel: number | null;
  source: string;
  calendarDate: string;
  uuid: string;
}

async function generateDailySummaries(startDate: string, endDate: string) {
  console.log(`Generating daily summaries from ${startDate} to ${endDate}`)

  // Process each date in the range
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  for (let date = start; date <= end; date.setDate(date.getDate() + 1)) {
    const dateStr = date.toISOString().split('T')[0]
    
    try {
      // Get the file from Supabase storage
      const { data, error } = await supabase
        .storage
        .from('garmin-data')
        .download(`7afb527e-a12f-4c78-8dda-bd4e7ae501b1/user_summary_${dateStr}.json`)

      if (error) {
        console.log(`No data file found for ${dateStr}`)
        continue
      }

      // Convert the downloaded blob to JSON
      const fileContent = await data.text()
      const summary: UserSummary = JSON.parse(fileContent)

      // Prepare summary for database
      const dbSummary = {
        user_id: summary.userProfileId.toString(), // Convert to string as it's UUID in DB
        device_id: summary.uuid,
        source: summary.source.toLowerCase(),
        date: summary.calendarDate,
        total_calories: summary.totalKilocalories,
        active_calories: summary.activeKilocalories,
        bmr_calories: summary.bmrKilocalories,
        total_steps: summary.totalSteps,
        total_distance_meters: summary.totalDistanceMeters,
        highly_active_seconds: summary.highlyActiveSeconds,
        active_seconds: summary.activeSeconds,
        sedentary_seconds: summary.sedentarySeconds,
        sleeping_seconds: summary.sleepingSeconds,
        moderate_intensity_minutes: summary.moderateIntensityMinutes,
        vigorous_intensity_minutes: summary.vigorousIntensityMinutes,
        min_heart_rate: summary.minHeartRate,
        max_heart_rate: summary.maxHeartRate,
        resting_heart_rate: summary.restingHeartRate,
        avg_stress_level: summary.averageStressLevel,
        activity_count: null, // No longer available in new format
        extracted_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      }

      // Only set fields that have non-null values
      const finalSummary = Object.fromEntries(
        Object.entries(dbSummary).filter(([_, value]) => value !== null)
      )

      // Insert or update daily summary
      const { error: upsertError } = await supabase
        .from('daily_summaries')
        .upsert(finalSummary, {
          onConflict: 'user_id,date'
        })

      if (upsertError) {
        console.error(`Error upserting summary for ${dateStr}:`, upsertError)
      } else {
        console.log(`Successfully processed ${dateStr}`)
      }
    } catch (error) {
      console.error(`Error processing date ${dateStr}:`, error)
    }
  }
}

// If running directly (not imported)
if (require.main === module) {
  const startDate = process.argv[2] || new Date().toISOString().split('T')[0]
  const endDate = process.argv[3] || startDate

  generateDailySummaries(startDate, endDate)
    .then(() => console.log('Done generating daily summaries'))
    .catch(console.error)
}

export { generateDailySummaries } 