import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function generateDailySummaries(startDate: string, endDate: string) {
  console.log(`Generating daily summaries from ${startDate} to ${endDate}`)

  // Get all unique user_ids and dates combinations that need processing
  const { data: activities, error: activitiesError } = await supabase
    .from('user_activities')
    .select('user_id, created_at')
    .gte('created_at', `${startDate}T00:00:00Z`)
    .lt('created_at', `${endDate}T23:59:59Z`)
    .order('created_at')

  if (activitiesError) {
    console.error('Error fetching activities:', activitiesError)
    return
  }

  // Create a Set to track unique user-date combinations
  const processedDates = new Set<string>()
  
  // Process each unique user-date combination
  for (const activity of activities || []) {
    const { user_id, created_at } = activity
    const date = new Date(created_at).toISOString().split('T')[0]
    
    // Skip if we've already processed this user-date combination
    const key = `${user_id}-${date}`
    if (processedDates.has(key)) continue
    processedDates.add(key)

    console.log(`Processing user ${user_id} for date ${date}`)

    // Get activity data for the day
    const { data: dailyActivities } = await supabase
      .from('user_activities')
      .select('*')
      .eq('user_id', user_id)
      .gte('created_at', `${date}T00:00:00Z`)
      .lt('created_at', `${date}T23:59:59Z`)

    // Aggregate daily activity data
    const dailyActivity = dailyActivities?.reduce((acc, curr) => ({
      total_calories: (acc.total_calories || 0) + (curr.total_calories || 0),
      active_calories: (acc.active_calories || 0) + (curr.active_calories || 0),
      bmr_calories: curr.bmr_calories || acc.bmr_calories,
      steps: (acc.steps || 0) + (curr.steps || 0),
      distance_meters: (acc.distance_meters || 0) + (curr.distance_meters || 0),
      highly_active_seconds: (acc.highly_active_seconds || 0) + (curr.highly_active_seconds || 0),
      active_seconds: (acc.active_seconds || 0) + (curr.active_seconds || 0),
      sedentary_seconds: (acc.sedentary_seconds || 0) + (curr.sedentary_seconds || 0),
      moderate_intensity_minutes: (acc.moderate_intensity_minutes || 0) + (curr.moderate_intensity_minutes || 0),
      vigorous_intensity_minutes: (acc.vigorous_intensity_minutes || 0) + (curr.vigorous_intensity_minutes || 0),
    }), {})

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