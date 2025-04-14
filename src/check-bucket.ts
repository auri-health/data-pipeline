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

interface GarminSteps {
  startTimeGMT: string
  steps: number
  deviceId?: string
  [key: string]: any
}

interface SupabaseError {
  message?: string;
  details?: string;
  hint?: string;
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
    // Handle array format [timestamp, value]
    if (Array.isArray(hr)) {
      return {
        user_id: userId,
        device_id: fileContent.deviceId || 'unknown',
        source: 'garmin',
        timestamp: new Date(hr[0]).toISOString(),
        heart_rate: hr[1],
        reading_type: 'CONTINUOUS',
        extracted_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      }
    }
    
    // Handle object format {timestamp, heartRate}
    return {
      user_id: userId,
      device_id: hr.deviceId || fileContent.deviceId || 'unknown',
      source: 'garmin',
      timestamp: new Date(hr.timestamp || hr.time || hr.date).toISOString(),
      heart_rate: hr.heartRate || hr.value || hr.bpm,
      reading_type: 'CONTINUOUS',
      extracted_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    }
  }).filter(hr => hr.heart_rate !== null) // Filter out null heart rate values

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

async function processSleep(userId: string, fileContent: any) {
  const logPrefix = '[SLEEP_PROCESSOR]'
  console.log(`${logPrefix} Starting sleep data processing...`)
  
  try {
    console.log(`${logPrefix} Sleep data structure:`)
    console.log(`${logPrefix} Available fields:`, Object.keys(fileContent))
    
    // Validate input
    if (!fileContent) {
      throw new Error('Sleep data is null or undefined')
    }

    // Handle array of sleep records
    let sleepRecords = Array.isArray(fileContent) ? fileContent : [fileContent]
    console.log(`${logPrefix} Found ${sleepRecords.length} sleep records to process`)

    if (sleepRecords.length === 0) {
      console.warn(`${logPrefix} No sleep records found in the data`)
      return
    }

    let processedRecords = 0
    let failedRecords = 0
    let skippedRecords = 0

    for (const record of sleepRecords) {
      try {
        console.log(`\n${logPrefix} Processing sleep record:`, JSON.stringify(record, null, 2))
        
        // Validate required fields
        if (!record) {
          console.error(`${logPrefix} Invalid record: Record is null or undefined`)
          failedRecords++
          continue
        }

        // Find timestamp field
        console.log(`${logPrefix} Searching for date fields...`)
        const dateFields = Object.entries(record)
          .filter(([key, value]) => 
            key.toLowerCase().includes('time') || 
            key.toLowerCase().includes('date') ||
            (typeof value === 'string' && value.includes('T'))
          )
        console.log(`${logPrefix} Found date fields:`, dateFields)

        // Handle timestamp conversion with detailed error tracking
        let startTime: Date
        try {
          const timestampField = dateFields.find(([_, value]) => value !== null)?.[0]
          const timestamp = timestampField ? record[timestampField] : null

          if (!timestamp) {
            console.error(`${logPrefix} No valid timestamp found. Available fields:`, Object.keys(record))
            failedRecords++
            continue
          }

          if (typeof timestamp === 'number') {
            startTime = new Date(timestamp)
          } else if (typeof timestamp === 'string' && timestamp.includes('T')) {
            startTime = new Date(timestamp)
          } else if (typeof timestamp === 'string') {
            startTime = new Date(timestamp + 'T00:00:00Z')
          } else {
            throw new Error(`Invalid timestamp format: ${typeof timestamp}`)
          }
          
          if (isNaN(startTime.getTime())) {
            throw new Error(`Invalid date value: ${timestamp}`)
          }

          console.log(`${logPrefix} Successfully parsed timestamp:`, startTime.toISOString())
        } catch (error) {
          console.error(`${logPrefix} Error parsing timestamp:`, error)
          console.error(`${logPrefix} Raw record:`, record)
          failedRecords++
          continue
        }

        const sleepId = `${userId}_${startTime.getTime()}`
        console.log(`${logPrefix} Generated sleep_id: ${sleepId}`)

        // Process sleep stages with validation
        const stages = [
          { stage: 'DEEP', duration: record.deepSleepSeconds || record.deepSleep || record.deep },
          { stage: 'LIGHT', duration: record.lightSleepSeconds || record.lightSleep || record.light },
          { stage: 'REM', duration: record.remSleepSeconds || record.remSleep || record.rem },
          { stage: 'AWAKE', duration: record.awakeSleepSeconds || record.awakeSleep || record.awake }
        ].filter(({ duration }) => typeof duration === 'number' && !isNaN(duration))

        if (stages.length === 0) {
          console.warn(`${logPrefix} No valid sleep stages found in record`)
          skippedRecords++
          continue
        }

        console.log(`${logPrefix} Found ${stages.length} valid sleep stages`)

        const sleepStages = stages.map(({ stage, duration }) => ({
          user_id: userId,
          device_id: record.deviceId || 'unknown',
          source: 'garmin',
          sleep_id: sleepId,
          timestamp: startTime.toISOString(),
          stage,
          duration_seconds: duration,
          extracted_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        }))

        // Insert sleep stages with transaction
        try {
          console.log(`${logPrefix} Inserting ${sleepStages.length} sleep stages...`)
          const { error: stagesError } = await supabase
            .from('sleep_stages')
            .upsert(sleepStages, {
              onConflict: 'sleep_id,timestamp,stage',
              ignoreDuplicates: true
            })

          if (stagesError) {
            throw stagesError
          }

          console.log(`${logPrefix} Successfully inserted sleep stages for ${startTime.toISOString()}`)
        } catch (error: unknown) {
          const supabaseError = error as SupabaseError
          console.error(`${logPrefix} Error inserting sleep stages:`, error)
          if (supabaseError.details) console.error(`${logPrefix} Error details:`, supabaseError.details)
          if (supabaseError.hint) console.error(`${logPrefix} Error hint:`, supabaseError.hint)
          failedRecords++
          continue
        }

        // Process sleep movement if available
        const movement = record.sleepMovement || record.movement
        if (typeof movement === 'number' && !isNaN(movement)) {
          try {
            console.log(`${logPrefix} Processing sleep movement data...`)
            const sleepMovement = {
              user_id: userId,
              device_id: record.deviceId || 'unknown',
              source: 'garmin',
              sleep_id: sleepId,
              timestamp: startTime.toISOString(),
              movement_value: Math.round(movement * 100),
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
              throw movementError
            }

            console.log(`${logPrefix} Successfully inserted sleep movement data`)
          } catch (error: unknown) {
            const supabaseError = error as SupabaseError
            console.error(`${logPrefix} Error inserting sleep movement:`, error)
            if (supabaseError.details) console.error(`${logPrefix} Error details:`, supabaseError.details)
            if (supabaseError.hint) console.error(`${logPrefix} Error hint:`, supabaseError.hint)
            // Don't increment failedRecords as movement is optional
          }
        }

        processedRecords++
      } catch (recordError) {
        console.error(`${logPrefix} Error processing sleep record:`, recordError)
        failedRecords++
      }
    }

    // Log summary statistics
    console.log(`\n${logPrefix} Processing Summary:`)
    console.log(`${logPrefix} Total records: ${sleepRecords.length}`)
    console.log(`${logPrefix} Successfully processed: ${processedRecords}`)
    console.log(`${logPrefix} Failed: ${failedRecords}`)
    console.log(`${logPrefix} Skipped: ${skippedRecords}`)

    if (failedRecords > 0) {
      throw new Error(`Failed to process ${failedRecords} sleep records`)
    }

  } catch (error: unknown) {
    const supabaseError = error as SupabaseError
    console.error(`${logPrefix} Fatal error in sleep processing:`, error)
    if (supabaseError.details) console.error(`${logPrefix} Error details:`, supabaseError.details)
    if (supabaseError.hint) console.error(`${logPrefix} Error hint:`, supabaseError.hint)
    throw error // Re-throw to be handled by the main process
  }
}

async function processSteps(userId: string, fileContent: any) {
  console.log('Processing steps data...')
  
  // Try different possible structures
  let stepsData: any[] = []
  
  if (Array.isArray(fileContent)) {
    console.log('Steps data is an array')
    stepsData = fileContent
  } else if (fileContent.stepsValues) {
    console.log('Steps data is in stepsValues')
    stepsData = fileContent.stepsValues
  } else if (fileContent.data && Array.isArray(fileContent.data)) {
    console.log('Steps data is in data array')
    stepsData = fileContent.data
  } else {
    console.error('Could not find steps data in expected formats:', Object.keys(fileContent))
    return
  }

  console.log(`Found ${stepsData.length} steps readings`)

  if (stepsData.length === 0) {
    console.log('No steps readings to import')
    return
  }

  // Sample the first item to understand the structure
  console.log('Sample steps reading:', JSON.stringify(stepsData[0], null, 2))

  const stepsReadings = stepsData.map(reading => {
    // Handle array format [timestamp, value]
    if (Array.isArray(reading)) {
      return {
        user_id: userId,
        device_id: fileContent.deviceId || 'unknown',
        source: 'garmin',
        timestamp: new Date(reading[0]).toISOString(),
        steps: reading[1],
        extracted_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      }
    }
    
    // Handle object format
    const timestamp = reading.startTimeGMT || reading.timestamp || reading.time || reading.date
    const steps = reading.steps || reading.value || reading.count

    if (!timestamp || typeof steps !== 'number') {
      console.warn('Invalid steps reading:', reading)
      return null
    }

    return {
      user_id: userId,
      device_id: reading.deviceId || fileContent.deviceId || 'unknown',
      source: 'garmin',
      timestamp: new Date(timestamp).toISOString(),
      steps: steps,
      extracted_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    }
  }).filter(reading => reading !== null && !isNaN(reading.steps))

  if (stepsReadings.length === 0) {
    console.log('No valid steps readings to import')
    return
  }

  const { error } = await supabase
    .from('step_readings')
    .upsert(stepsReadings, {
      onConflict: 'user_id,timestamp',
      ignoreDuplicates: true
    })

  if (error) {
    console.error('Error inserting steps:', error)
    throw error
  }

  console.log(`Imported ${stepsReadings.length} steps readings`)
}

async function processFile(userId: string, bucketName: string, filePath: string) {
  try {
    console.log(`\n=== Starting to process file: ${filePath} ===`)
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(filePath)

    if (error) {
      console.error('Error downloading file:', error)
      throw error
    }

    const rawContent = await data.text()
    if (!rawContent || rawContent.trim() === '') {
      console.warn('File is empty!')
      return
    }

    console.log('\n=== Raw file content ===')
    console.log(rawContent)
    console.log('\n=== End raw file content ===')
    
    try {
      const content = JSON.parse(rawContent)
      console.log('\n=== Parsed JSON content ===')
      console.log(JSON.stringify(content, null, 2))
      console.log('\n=== End parsed JSON content ===')

      if (filePath.includes('activities-')) {
        console.log('\nProcessing as activities file...')
        await processActivities(userId, content)
      } else if (filePath.includes('heart-rate-')) {
        console.log('\nProcessing as heart rate file...')
        await processHeartRates(userId, content)
      } else if (filePath.includes('sleep-')) {
        console.log('\nProcessing as sleep file...')
        await processSleep(userId, content)
      } else if (filePath.includes('steps-')) {
        console.log('\nProcessing as steps file...')
        await processSteps(userId, content)
      } else {
        console.warn('Unknown file type, skipping:', filePath)
      }
    } catch (parseError) {
      console.error('\nError parsing JSON:')
      console.error(parseError)
      console.error('\nRaw content that failed to parse:')
      console.error(rawContent)
      throw parseError
    }
  } catch (error) {
    console.error(`\nError processing file ${filePath}:`, error)
    throw error
  }
}

async function checkBucketFiles() {
  const userId = '7afb527e-a12f-4c78-8dda-bd4e7ae501b1'
  const bucketName = 'garmin-data'
  
  // Get today's date in YYYY-MM-DD format
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  
  try {
    console.log(`Checking bucket "${bucketName}" for user "${userId}" for date ${todayStr}...`)
    
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

    // Filter files for today's data
    const todayFiles = data.filter(file => file.name.includes(todayStr))
    console.log(`Found ${todayFiles.length} files for today (${todayStr}):`)
    todayFiles.forEach(file => console.log(`- ${file.name}`))
    
    for (const file of todayFiles) {
      console.log(`\nProcessing ${file.name}...`)
      await processFile(userId, bucketName, `${userId}/${file.name}`)
    }

    console.log('\nAll files for today processed successfully')
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