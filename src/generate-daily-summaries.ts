import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

async function generateDailySummaries(startDate: string, endDate: string) {
  console.log(`Generating daily summaries from ${startDate} to ${endDate}`)

  // Get all unique user_ids and dates combinations that need processing
  const { data: activities, error: activitiesError } = await supabase
    .from('user_activities')
    .select('user_id, date')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date')

  if (activitiesError) {
    console.error('Error fetching activities:', activitiesError)
    return
  }

  // Process each unique user-date combination
  for (const activity of activities || []) {
    const { user_id, date } = activity
    console.log(`Processing user ${user_id} for date ${date}`)

    // Get activity data (already per day)
    const { data: dailyActivity } = await supabase
      .from('user_activities')
      .select('*')
      .eq('user_id', user_id)
      .eq('date', date)
      .single()

    // Get activity count
    const { data: activityStats } = await supabase.rpc('get_daily_activity_stats', {
      p_user_id: user_id,
      p_date: date
    })

    // Get aggregated sleep data
    const { data: sleepStats } = await supabase.rpc('get_daily_sleep_stats', {
      p_user_id: user_id,
      p_date: date
    })

    // Get heart rate stats
    const { data: heartRateStats } = await supabase.rpc('get_daily_heart_rate_stats', {
      p_user_id: user_id,
      p_date: date
    })

    // Prepare summary
    const summary = {
      user_id,
      device_id: '0f96861e-49b1-4aa0-b499-45267084f68c',
      source: 'garmin',
      date,
      total_calories: dailyActivity?.total_calories || null,
      active_calories: dailyActivity?.active_calories || null,
      bmr_calories: dailyActivity?.bmr_calories || null,
      total_steps: dailyActivity?.steps || null,
      total_distance_meters: dailyActivity?.distance_meters || null,
      highly_active_seconds: dailyActivity?.highly_active_seconds || null,
      active_seconds: dailyActivity?.active_seconds || null,
      sedentary_seconds: dailyActivity?.sedentary_seconds || null,
      sleeping_seconds: sleepStats?.[0]?.total_sleep_seconds || null,
      moderate_intensity_minutes: dailyActivity?.moderate_intensity_minutes || null,
      vigorous_intensity_minutes: dailyActivity?.vigorous_intensity_minutes || null,
      min_heart_rate: heartRateStats?.[0]?.min_hr || null,
      max_heart_rate: heartRateStats?.[0]?.max_hr || null,
      resting_heart_rate: sleepStats?.[0]?.resting_heart_rate || null,
      activity_count: activityStats?.[0]?.activity_count || 0,
      avg_stress_level: null, // TODO: Add stress level data when available
      extracted_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    }

    // Insert or update daily summary
    const { error: upsertError } = await supabase
      .from('daily_summaries')
      .upsert(summary, {
        onConflict: 'user_id,date'
      })

    if (upsertError) {
      console.error(`Error upserting summary for ${date}:`, upsertError)
    } else {
      console.log(`Successfully processed ${date}`)
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