import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface DailyActivityAggregation {
  total_calories: number;
  active_calories: number;
  bmr_calories: number;
  steps: number;
  distance_meters: number;
  highly_active_seconds: number;
  active_seconds: number;
  sedentary_seconds: number;
  moderate_intensity_minutes: number;
  vigorous_intensity_minutes: number;
}

async function generateDailySummaries(startDate: string, endDate: string) {
  console.log(`Generating daily summaries from ${startDate} to ${endDate}`)

  // Get all unique user_ids and dates combinations that need processing
  const { data: activities, error: activitiesError } = await supabase
    .from('user_activities')
    .select('user_id, start_time')
    .gte('start_time', `${startDate}T00:00:00Z`)
    .lt('start_time', `${endDate}T23:59:59Z`)
    .order('start_time')

  if (activitiesError) {
    console.error('Error fetching activities:', activitiesError)
    return
  }

  // Create a Set to track unique user-date combinations
  const processedDates = new Set<string>()
  
  // Process each unique user-date combination
  for (const activity of activities || []) {
    const { user_id, start_time } = activity
    const date = new Date(start_time).toISOString().split('T')[0]
    
    // Skip if we've already processed this user-date combination
    const key = `${user_id}-${date}`
    if (processedDates.has(key)) continue
    processedDates.add(key)

    console.log(`Processing user ${user_id} for date ${date}`)

    try {
      // Get activity data for the day
      const { data: dailyActivities, error: dailyActivitiesError } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', user_id)
        .gte('start_time', `${date}T00:00:00Z`)
        .lt('start_time', `${date}T23:59:59Z`)

      if (dailyActivitiesError) {
        console.error(`Error fetching daily activities for ${date}:`, dailyActivitiesError)
        continue
      }

      // Count distinct activities
      const distinctActivities = new Set(dailyActivities?.map(a => a.activity_id) || [])
      const activityCount = distinctActivities.size

      // Initialize aggregation with default values
      const initialAggregation: DailyActivityAggregation = {
        total_calories: 0,
        active_calories: 0,
        bmr_calories: 0,
        steps: 0,
        distance_meters: 0,
        highly_active_seconds: 0,
        active_seconds: 0,
        sedentary_seconds: 0,
        moderate_intensity_minutes: 0,
        vigorous_intensity_minutes: 0
      }

      // Aggregate daily activity data with proper number conversion and validation
      const dailyActivity = dailyActivities?.reduce((acc, curr) => {
        // Helper function to safely convert to number
        const toNumber = (value: any) => {
          const num = Number(value)
          return isNaN(num) ? 0 : num
        }

        return {
          total_calories: acc.total_calories + toNumber(curr.total_calories),
          active_calories: acc.active_calories + toNumber(curr.active_calories),
          bmr_calories: toNumber(curr.bmr_calories) || acc.bmr_calories,
          steps: acc.steps + toNumber(curr.steps),
          distance_meters: acc.distance_meters + toNumber(curr.distance_meters),
          highly_active_seconds: acc.highly_active_seconds + toNumber(curr.highly_active_seconds),
          active_seconds: acc.active_seconds + toNumber(curr.active_seconds),
          sedentary_seconds: acc.sedentary_seconds + toNumber(curr.sedentary_seconds),
          moderate_intensity_minutes: acc.moderate_intensity_minutes + toNumber(curr.moderate_intensity_minutes),
          vigorous_intensity_minutes: acc.vigorous_intensity_minutes + toNumber(curr.vigorous_intensity_minutes),
        }
      }, initialAggregation) || initialAggregation

      // Get aggregated sleep data
      const { data: sleepStats, error: sleepError } = await supabase.rpc('get_daily_sleep_stats', {
        p_date: date,
        p_user_id: user_id
      })

      if (sleepError) {
        console.error(`Error fetching sleep stats for ${date}:`, sleepError)
      }

      // Get heart rate stats
      const { data: heartRateStats, error: heartRateError } = await supabase.rpc('get_daily_heart_rate_stats', {
        p_date: date,
        p_user_id: user_id
      })

      if (heartRateError) {
        console.error(`Error fetching heart rate stats for ${date}:`, heartRateError)
      }

      // Get calorie stats
      const { data: calorieStats, error: calorieError } = await supabase.rpc('get_daily_calorie_stats', {
        p_date: date,
        p_user_id: user_id
      })

      if (calorieError) {
        console.error(`Error fetching calorie stats for ${date}:`, calorieError)
      }

      // Prepare summary with non-null values when we have data
      const summary = {
        user_id,
        device_id: '0f96861e-49b1-4aa0-b499-45267084f68c',
        source: 'garmin',
        date,
        total_calories: calorieStats?.[0]?.total_calories || null,
        active_calories: calorieStats?.[0]?.active_calories || null,
        bmr_calories: calorieStats?.[0]?.bmr_calories || null,
        total_steps: dailyActivity.steps || null,
        total_distance_meters: dailyActivity.distance_meters || null,
        highly_active_seconds: dailyActivity.highly_active_seconds || null,
        active_seconds: dailyActivity.active_seconds || null,
        sedentary_seconds: dailyActivity.sedentary_seconds || null,
        sleeping_seconds: sleepStats?.[0]?.total_sleep_seconds || null,
        moderate_intensity_minutes: dailyActivity.moderate_intensity_minutes || null,
        vigorous_intensity_minutes: dailyActivity.vigorous_intensity_minutes || null,
        min_heart_rate: heartRateStats?.[0]?.min_hr || null,
        max_heart_rate: heartRateStats?.[0]?.max_hr || null,
        resting_heart_rate: sleepStats?.[0]?.resting_heart_rate || null,
        activity_count: activityCount || null,
        avg_stress_level: null, // TODO: Add stress level data when available
        extracted_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      }

      // Only set fields that have non-zero values
      const finalSummary = Object.fromEntries(
        Object.entries(summary).map(([key, value]) => [
          key,
          typeof value === 'number' && value === 0 ? null : value
        ])
      )

      // Insert or update daily summary
      const { error: upsertError } = await supabase
        .from('daily_summaries')
        .upsert(finalSummary, {
          onConflict: 'user_id,date'
        })

      if (upsertError) {
        console.error(`Error upserting summary for ${date}:`, upsertError)
      } else {
        console.log(`Successfully processed ${date} with ${activityCount} activities`)
      }
    } catch (error) {
      console.error(`Error processing date ${date}:`, error)
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