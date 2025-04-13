import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface GarminActivity {
  activityId: number
  activityName: string
  activityType: string
  startTimeGMT: string
  duration: number
  distance: number
  calories: number
  averageHR: number
  maxHR: number
  steps: number
  averageRunningCadenceInStepsPerMinute: number
  maxRunningCadenceInStepsPerMinute: number
  deviceId: string
  [key: string]: any // For additional fields that will go into metadata
}

interface GarminSleep {
  deepSleepSeconds: number
  lightSleepSeconds: number
  remSleepSeconds: number
  awakeSleepSeconds: number
  sleepMovement: number
  startTimeGMT: string
  durationInSeconds: number
  [key: string]: any
}

interface GarminHeartRate {
  heartRate: number
  timestamp: number
  deviceId: string
}

async function processActivities(userId: string, fileContent: GarminActivity[]) {
  const activities = fileContent.map(activity => ({
    user_id: userId,
    activity_id: activity.activityId,
    activity_name: activity.activityName,
    activity_type: activity.activityType,
    start_time: new Date(activity.startTimeGMT).toISOString(),
    duration_seconds: activity.duration,
    distance_meters: activity.distance,
    calories: activity.calories,
    average_heart_rate: activity.averageHR,
    max_heart_rate: activity.maxHR,
    steps: activity.steps,
    average_cadence: activity.averageRunningCadenceInStepsPerMinute,
    max_cadence: activity.maxRunningCadenceInStepsPerMinute,
    device_id: activity.deviceId,
    source: 'GARMIN',
    metadata: {
      ...activity,
      // Exclude fields that are already in the main columns
      activityId: undefined,
      activityName: undefined,
      activityType: undefined,
      startTimeGMT: undefined,
      duration: undefined,
      distance: undefined,
      calories: undefined,
      averageHR: undefined,
      maxHR: undefined,
      steps: undefined,
      averageRunningCadenceInStepsPerMinute: undefined,
      maxRunningCadenceInStepsPerMinute: undefined,
      deviceId: undefined
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }))

  const { error } = await supabase
    .from('user_activities')
    .upsert(activities, { 
      onConflict: 'activity_id',
      ignoreDuplicates: true 
    })

  if (error) {
    console.error('Error inserting activities:', error)
    throw error
  }

  console.log(`Imported ${activities.length} activities`)
}

async function processHeartRates(userId: string, fileContent: any) {
  console.log('Processing heart rate data...')
  
  // Try different possible structures
  let heartRateData: any[] = []
  
  if (Array.isArray(fileContent)) {
    console.log('Heart rate data is an array')
    heartRateData = fileContent
  } else if (fileContent.heartRateValues) {
    console.log('Heart rate data is in heartRateValues')
    heartRateData = fileContent.heartRateValues
  } else if (fileContent.data && Array.isArray(fileContent.data)) {
    console.log('Heart rate data is in data array')
    heartRateData = fileContent.data
  } else if (fileContent.readings && Array.isArray(fileContent.readings)) {
    console.log('Heart rate data is in readings array')
    heartRateData = fileContent.readings
  } else {
    console.error('Could not find heart rate data in expected formats:', Object.keys(fileContent))
    return
  }

  console.log(`Found ${heartRateData.length} heart rate readings`)

  if (heartRateData.length === 0) {
    console.log('No heart rate readings to import')
    return
  }

  // Sample the first item to understand the structure
  console.log('Sample heart rate reading:', JSON.stringify(heartRateData[0], null, 2))

  const heartRates = heartRateData.map(hr => {
    // Handle timestamp conversion
    let timestamp: string
    const rawTimestamp = hr.timestamp || hr.time || hr.date
    
    if (typeof rawTimestamp === 'number') {
      // If timestamp is a number, assume it's milliseconds since epoch
      timestamp = new Date(rawTimestamp).toISOString()
    } else if (typeof rawTimestamp === 'string') {
      // If timestamp is a string, try to parse it
      timestamp = new Date(rawTimestamp).toISOString()
    } else {
      throw new Error(`Invalid timestamp format: ${typeof rawTimestamp}`)
    }

    return {
      user_id: userId,
      device_id: hr.deviceId || fileContent.deviceId || 'unknown',
      source: 'GARMIN',
      timestamp,
      heart_rate: hr.heartRate || hr.value || hr.bpm,
      reading_type: 'CONTINUOUS',
      extracted_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    }
  })

  const { error } = await supabase
    .from('heart_rate_readings')
    .upsert(heartRates, {
      onConflict: 'user_id,timestamp',
      ignoreDuplicates: true
    })

  if (error) {
    console.error('Error inserting heart rates:', error)
    throw error
  }

  console.log(`Imported ${heartRates.length} heart rate readings`)
}

async function processSleep(userId: string, fileContent: GarminSleep) {
  const sleepId = `${userId}_${new Date(fileContent.startTimeGMT).getTime()}`
  const startTime = new Date(fileContent.startTimeGMT)

  // Process sleep stages
  const stages = [
    { stage: 'DEEP', duration: fileContent.deepSleepSeconds },
    { stage: 'LIGHT', duration: fileContent.lightSleepSeconds },
    { stage: 'REM', duration: fileContent.remSleepSeconds },
    { stage: 'AWAKE', duration: fileContent.awakeSleepSeconds }
  ]

  const sleepStages = stages.map(({ stage, duration }) => ({
    user_id: userId,
    device_id: fileContent.deviceId || 'unknown',
    source: 'GARMIN',
    sleep_id: sleepId,
    timestamp: startTime.toISOString(),
    stage,
    duration_seconds: duration,
    extracted_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  }))

  const { error: stagesError } = await supabase
    .from('sleep_stages')
    .upsert(sleepStages, {
      onConflict: 'sleep_id,timestamp,stage',
      ignoreDuplicates: true
    })

  if (stagesError) {
    console.error('Error inserting sleep stages:', stagesError)
    throw stagesError
  }

  // Process sleep movement if available
  if (typeof fileContent.sleepMovement === 'number') {
    const sleepMovement = {
      user_id: userId,
      device_id: fileContent.deviceId || 'unknown',
      source: 'GARMIN',
      sleep_id: sleepId,
      timestamp: startTime.toISOString(),
      movement_value: Math.round(fileContent.sleepMovement * 100),
      extracted_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    }

    const { error: movementError } = await supabase
      .from('sleep_movements')
      .upsert([sleepMovement], {
        onConflict: 'sleep_id,timestamp',
        ignoreDuplicates: true
      })

    if (movementError) {
      console.error('Error inserting sleep movement:', movementError)
      throw movementError
    }
  }

  console.log(`Imported sleep data for ${fileContent.startTimeGMT}`)
}

async function processFile(userId: string, bucketName: string, filePath: string) {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(filePath)

    if (error) {
      throw error
    }

    const rawContent = await data.text()
    console.log(`Raw file content for ${filePath}:`, rawContent)
    
    const content = JSON.parse(rawContent)

    if (filePath.includes('activities-')) {
      await processActivities(userId, content)
    } else if (filePath.includes('heart-rate-')) {
      await processHeartRates(userId, content)
    } else if (filePath.includes('sleep-')) {
      await processSleep(userId, content)
    }
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error)
    throw error
  }
}

async function checkBucketFiles() {
  const userId = '7afb527e-a12f-4c78-8dda-bd4e7ae501b1'
  const bucketName = 'garmin-data'
  
  try {
    console.log(`Checking bucket "${bucketName}" for user "${userId}"...`)
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(userId, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' }
      })

    if (error) {
      console.error('Storage API Error:', error)
      throw error
    }

    if (!data || data.length === 0) {
      console.log('No files found. This could mean:')
      console.log('1. The bucket is empty')
      console.log('2. The user folder does not exist')
      console.log('3. Permissions are not configured correctly')
      return
    }

    console.log(`Found ${data.length} files:`)
    for (const file of data) {
      console.log(`Processing ${file.name}...`)
      await processFile(userId, bucketName, `${userId}/${file.name}`)
    }

    console.log('All files processed successfully')
  } catch (err: any) {
    console.error('Error processing bucket:', err)
    if (err.message) console.error('Error message:', err.message)
    if (err.details) console.error('Error details:', err.details)
    throw err
  }
}

// Run the function
checkBucketFiles()
  .catch(error => {
    console.error('Script failed:', error)
    process.exit(1)
  }) 