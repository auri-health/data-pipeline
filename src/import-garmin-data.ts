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

interface GarminSleepMovement {
  startGMT: string
  endGMT: string
  activityLevel: number
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
  console.log('File content structure:', Object.keys(fileContent))
  
  // Try different possible structures
  let heartRateData: any[] = []
  let deviceId = fileContent.deviceId || fileContent.device_id || fileContent.device || null
  
  if (Array.isArray(fileContent)) {
    console.log('Heart rate data is an array')
    heartRateData = fileContent
  } else if (fileContent.heartRateValues) {
    console.log('Heart rate data is in heartRateValues')
    heartRateData = fileContent.heartRateValues
    deviceId = deviceId || fileContent.metadata?.deviceId
  } else if (fileContent.data && Array.isArray(fileContent.data)) {
    console.log('Heart rate data is in data array')
    heartRateData = fileContent.data
    deviceId = deviceId || fileContent.metadata?.deviceId
  } else if (fileContent.readings && Array.isArray(fileContent.readings)) {
    console.log('Heart rate data is in readings array')
    heartRateData = fileContent.readings
    deviceId = deviceId || fileContent.metadata?.deviceId
  } else {
    console.error('Could not find heart rate data in expected formats:', Object.keys(fileContent))
    return
  }

  console.log(`Found ${heartRateData.length} heart rate readings`)
  console.log('Device ID from file:', deviceId)

  if (heartRateData.length === 0) {
    console.log('No heart rate readings to import')
    return
  }

  // Sample the first item to understand the structure
  const sampleReading = heartRateData[0]
  console.log('Sample heart rate reading:', JSON.stringify(sampleReading, null, 2))
  console.log('Sample reading device ID:', sampleReading.deviceId || sampleReading.device_id || sampleReading.device)

  const heartRates = heartRateData.map(hr => {
    const readingDeviceId = hr.deviceId || hr.device_id || hr.device
    
    // Handle array format [timestamp, value]
    if (Array.isArray(hr)) {
      return {
        user_id: userId,
        device_id: '0f96861e-49b1-4aa0-b499-45267084f68c',
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
      device_id: '0f96861e-49b1-4aa0-b499-45267084f68c',
      source: 'garmin',
      timestamp: new Date(hr.timestamp || hr.time || hr.date).toISOString(),
      heart_rate: hr.heartRate || hr.value || hr.bpm,
      reading_type: 'CONTINUOUS',
      extracted_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    }
  }).filter(hr => hr.heart_rate !== null) // Filter out null heart rate values

  // Log device ID distribution
  const deviceIdCounts = heartRates.reduce((acc: {[key: string]: number}, hr) => {
    acc[hr.device_id] = (acc[hr.device_id] || 0) + 1
    return acc
  }, {})
  console.log('Device ID distribution:', deviceIdCounts)

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
    
    // Determine if we're dealing with an array or object
    let sleepRecords: any[] = []
    
    if (Array.isArray(fileContent)) {
      sleepRecords = fileContent
    } else if (fileContent.sleepData && Array.isArray(fileContent.sleepData)) {
      sleepRecords = fileContent.sleepData
    } else if (fileContent.data && Array.isArray(fileContent.data)) {
      sleepRecords = fileContent.data
    } else if (fileContent.dailySleepDTO) {
      // Handle the case where sleep data is in dailySleepDTO
      sleepRecords = [{
        ...fileContent.dailySleepDTO,
        movementData: fileContent.sleepMovement?.map((m: GarminSleepMovement) => ({
          ...m,
          activityLevel: m.activityLevel,
          timestamp: m.startGMT
        })),
        sleepLevels: fileContent.sleepLevels,
        sleepHeartRate: fileContent.sleepHeartRate,
        restingHeartRate: fileContent.restingHeartRate,
        skinTempDataExists: fileContent.skinTempDataExists
      }]
    } else {
      sleepRecords = [fileContent] // Single record
    }

    console.log(`${logPrefix} Found ${sleepRecords.length} sleep records`)
    
    // Process in batches of 50 records
    const BATCH_SIZE = 50
    let successCount = 0
    let failedRecords = 0
    
    for (let i = 0; i < sleepRecords.length; i += BATCH_SIZE) {
      const batch = sleepRecords.slice(i, i + BATCH_SIZE)
      const sleepStagesRecords = []
      const sleepMovementsRecords = []
      const sleepLevelsRecords = []
      const sleepHeartRatesRecords = []
      
      for (const record of batch) {
        try {
          // Find timestamp field
          console.log(`${logPrefix} Processing record ${i}/${sleepRecords.length}`)
          let startTime: Date | null = null

          // First try sleepStartTimestampGMT
          if (record.sleepStartTimestampGMT) {
            try {
              startTime = new Date(record.sleepStartTimestampGMT)
              if (!isNaN(startTime.getTime())) {
                console.log(`${logPrefix} Using sleepStartTimestampGMT:`, record.sleepStartTimestampGMT)
              } else {
                startTime = null
              }
            } catch (e) {
              console.warn(`${logPrefix} Failed to parse sleepStartTimestampGMT:`, record.sleepStartTimestampGMT)
              startTime = null
            }
          }

          // Then try startTimeGMT
          if (!startTime && record.startTimeGMT) {
            try {
              startTime = new Date(record.startTimeGMT)
              if (!isNaN(startTime.getTime())) {
                console.log(`${logPrefix} Using startTimeGMT:`, record.startTimeGMT)
              } else {
                startTime = null
              }
            } catch (e) {
              console.warn(`${logPrefix} Failed to parse startTimeGMT:`, record.startTimeGMT)
              startTime = null
            }
          }

          // If startTimeGMT failed, try startTimeLocal
          if (!startTime && record.startTimeLocal) {
            try {
              startTime = new Date(record.startTimeLocal)
              if (!isNaN(startTime.getTime())) {
                console.log(`${logPrefix} Using startTimeLocal:`, record.startTimeLocal)
              } else {
                startTime = null
              }
            } catch (e) {
              console.warn(`${logPrefix} Failed to parse startTimeLocal:`, record.startTimeLocal)
              startTime = null
            }
          }

          // If standard fields failed, try to find any timestamp field
          if (!startTime) {
            const dateFields = Object.entries(record)
              .filter(([key, value]) => 
                (key.toLowerCase().includes('time') || 
                 key.toLowerCase().includes('date')) &&
                value !== null && value !== undefined
              )
            
            console.log(`${logPrefix} Found date fields:`, dateFields)

            for (const [key, value] of dateFields) {
              try {
                if (typeof value === 'number') {
                  startTime = new Date(value)
                } else if (typeof value === 'string') {
                  startTime = new Date(value)
                }
                
                if (startTime && !isNaN(startTime.getTime())) {
                  console.log(`${logPrefix} Successfully parsed timestamp from ${key}:`, value)
                  break
                } else {
                  startTime = null
                }
              } catch (e) {
                console.warn(`${logPrefix} Failed to parse timestamp from ${key}:`, value)
                startTime = null
                continue
              }
            }
          }

          if (!startTime) {
            console.error(`${logPrefix} No valid timestamp found in record:`, record)
            failedRecords++
            continue
          }

          // Generate a unique sleep_id based on user and timestamp
          const sleep_id = `${userId}_${startTime.getTime()}`

          // Process sleep stages
          const stages = [
            { stage: 'deep', duration: record.deepSleepSeconds || record.deepSleep || 0 },
            { stage: 'light', duration: record.lightSleepSeconds || record.lightSleep || 0 },
            { stage: 'rem', duration: record.remSleepSeconds || record.remSleep || 0 },
            { stage: 'awake', duration: record.awakeSleepSeconds || record.awakeSleep || 0 }
          ].filter(({ duration }) => typeof duration === 'number' && duration > 0)

          const sleepStages = stages.map(({ stage, duration }) => ({
            user_id: userId,
            device_id: '0f96861e-49b1-4aa0-b499-45267084f68c',
            source: 'garmin',
            sleep_id,
            timestamp: startTime.toISOString(),
            stage,
            duration_seconds: duration,
            resting_heart_rate: record.restingHeartRate || null,
            has_skin_temp_data: record.skinTempDataExists || false,
            extracted_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          }))

          // Process sleep movements timeseries if available
          if (record.movementData && Array.isArray(record.movementData)) {
            const movements = record.movementData.map((movement: any) => ({
              user_id: userId,
              device_id: '0f96861e-49b1-4aa0-b499-45267084f68c',
              source: 'garmin',
              sleep_id,
              timestamp: new Date(movement.startGMT).toISOString(),
              movement_value: movement.activityLevel,
              extracted_at: new Date().toISOString(),
              created_at: new Date().toISOString()
            }))
            sleepMovementsRecords.push(...movements)
          } else if (fileContent.sleepMovement && Array.isArray(fileContent.sleepMovement)) {
            const movements = fileContent.sleepMovement.map((movement: GarminSleepMovement) => ({
              user_id: userId,
              device_id: '0f96861e-49b1-4aa0-b499-45267084f68c',
              source: 'garmin',
              sleep_id,
              timestamp: new Date(movement.startGMT).toISOString(),
              movement_value: movement.activityLevel,
              extracted_at: new Date().toISOString(),
              created_at: new Date().toISOString()
            }))
            sleepMovementsRecords.push(...movements)
          }

          // Process sleep levels timeseries if available
          if (record.sleepLevels && Array.isArray(record.sleepLevels)) {
            const levels = record.sleepLevels.map((level: any) => ({
              user_id: userId,
              device_id: '0f96861e-49b1-4aa0-b499-45267084f68c',
              source: 'garmin',
              sleep_id,
              start_time: new Date(level.startGMT).toISOString(),
              end_time: new Date(level.endGMT).toISOString(),
              activity_level: level.activityLevel,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }))
            sleepLevelsRecords.push(...levels)
          }

          // Process sleep heart rate timeseries if available
          if (record.sleepHeartRate && Array.isArray(record.sleepHeartRate)) {
            const heartRates = record.sleepHeartRate.map((hr: any) => ({
              user_id: userId,
              device_id: '0f96861e-49b1-4aa0-b499-45267084f68c',
              source: 'garmin',
              sleep_id,
              timestamp: new Date(hr.startGMT).toISOString(),
              heart_rate: hr.value,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }))
            sleepHeartRatesRecords.push(...heartRates)
          }

          sleepStagesRecords.push(...sleepStages)
          successCount++

        } catch (error) {
          console.error(`${logPrefix} Error processing sleep record:`, error)
          failedRecords++
        }
      }

      // Insert sleep stages
      if (sleepStagesRecords.length > 0) {
        try {
          const { error: stagesError } = await supabase
            .from('sleep_stages')
            .upsert(sleepStagesRecords, {
              onConflict: 'user_id,device_id,source,sleep_id,timestamp',
              ignoreDuplicates: true
            })

          if (stagesError) {
            console.error(`${logPrefix} Error inserting sleep stages:`, stagesError)
          } else {
            console.log(`${logPrefix} Successfully inserted ${sleepStagesRecords.length} sleep stages`)
          }
        } catch (error) {
          console.error(`${logPrefix} Error upserting sleep stages:`, error)
        }
      }

      // Insert sleep movements
      if (sleepMovementsRecords.length > 0) {
        try {
          const { error: movementsError } = await supabase
            .from('sleep_movements')
            .upsert(sleepMovementsRecords, {
              onConflict: 'user_id,device_id,source,sleep_id,timestamp',
              ignoreDuplicates: true
            })

          if (movementsError) {
            console.error(`${logPrefix} Error inserting sleep movements:`, movementsError)
          } else {
            console.log(`${logPrefix} Successfully inserted ${sleepMovementsRecords.length} sleep movements`)
          }
        } catch (error) {
          console.error(`${logPrefix} Error upserting sleep movements:`, error)
        }
      }

      // Insert sleep levels
      if (sleepLevelsRecords.length > 0) {
        try {
          const { error: levelsError } = await supabase
            .from('sleep_levels')
            .upsert(sleepLevelsRecords, {
              onConflict: 'user_id,device_id,source,sleep_id,start_time',
              ignoreDuplicates: true
            })

          if (levelsError) {
            console.error(`${logPrefix} Error inserting sleep levels:`, levelsError)
          } else {
            console.log(`${logPrefix} Successfully inserted ${sleepLevelsRecords.length} sleep levels`)
          }
        } catch (error) {
          console.error(`${logPrefix} Error upserting sleep levels:`, error)
        }
      }

      // Insert sleep heart rates
      if (sleepHeartRatesRecords.length > 0) {
        try {
          const { error: heartRatesError } = await supabase
            .from('sleep_heart_rates')
            .upsert(sleepHeartRatesRecords, {
              onConflict: 'user_id,device_id,source,sleep_id,timestamp',
              ignoreDuplicates: true
            })

          if (heartRatesError) {
            console.error(`${logPrefix} Error inserting sleep heart rates:`, heartRatesError)
          } else {
            console.log(`${logPrefix} Successfully inserted ${sleepHeartRatesRecords.length} sleep heart rates`)
          }
        } catch (error) {
          console.error(`${logPrefix} Error upserting sleep heart rates:`, error)
        }
      }
    }

    return {
      success: successCount > 0,
      message: `Processed ${successCount} sleep records with ${failedRecords} failures`
    }
  } catch (error) {
    console.error(`${logPrefix} Fatal error processing sleep data:`, error)
    throw error
  }
}

async function processSteps(userId: string, fileContent: any) {
  console.log('Processing steps data...')
  
  let steps: number
  let date: string
  
  if (typeof fileContent === 'number') {
    console.log('Steps data is a single number')
    steps = fileContent
    date = new Date().toISOString().split('T')[0] // Use just the date part
  } else if (Array.isArray(fileContent)) {
    console.log('Steps data is an array')
    // Take the last entry if it's an array
    const lastEntry = fileContent[fileContent.length - 1]
    steps = lastEntry.steps || lastEntry.value || lastEntry[1]
    date = new Date(lastEntry.timestamp || lastEntry.time || lastEntry[0]).toISOString().split('T')[0]
  } else if (fileContent.steps || fileContent.value) {
    steps = fileContent.steps || fileContent.value
    date = new Date(fileContent.timestamp || fileContent.time || fileContent.date).toISOString().split('T')[0]
  } else {
    console.error('Could not find steps data in expected formats:', Object.keys(fileContent))
    return
  }

  if (typeof steps !== 'number' || isNaN(steps)) {
    console.error('Invalid steps value:', steps)
    return
  }

  console.log('Processing daily summary with steps:', { date, steps })

  try {
    // First, get existing summary for the day
    const { data: existingSummary } = await supabase
      .from('daily_summaries')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .single()

    const summaryData = {
      user_id: userId,
      device_id: '0f96861e-49b1-4aa0-b499-45267084f68c',
      source: 'garmin',
      date,
      total_steps: steps,
      extracted_at: new Date().toISOString(),
      created_at: existingSummary?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // If summary exists, merge with existing data
    if (existingSummary) {
      Object.assign(summaryData, {
        ...existingSummary,
        total_steps: steps,
        updated_at: new Date().toISOString()
      })
    }

    const { error } = await supabase
      .from('daily_summaries')
      .upsert(summaryData, {
        onConflict: 'user_id,date'
      })

    if (error) {
      console.error('Error upserting daily summary:', error)
      throw error
    }

    console.log(`Successfully updated daily summary for ${date} with ${steps} steps`)
  } catch (error) {
    console.error('Error processing daily summary:', error)
    throw error
  }
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
    
    let content
    try {
      content = JSON.parse(rawContent)
      console.log('\n=== Parsed JSON content ===')
      console.log(JSON.stringify(content, null, 2))
      console.log('\n=== End parsed JSON content ===')
    } catch (parseError) {
      // If JSON parsing fails but content is a number, use the number
      if (!isNaN(Number(rawContent))) {
        content = Number(rawContent)
        console.log('\n=== Parsed numeric content ===')
        console.log(content)
        console.log('\n=== End parsed numeric content ===')
      } else {
        console.error('\nError parsing content:', parseError)
        throw parseError
      }
    }

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
  } catch (error) {
    console.error(`\nError processing file ${filePath}:`, error)
    throw error
  }
}

async function checkBucketFiles(processHistorical: boolean = false) {
  const userId = '7afb527e-a12f-4c78-8dda-bd4e7ae501b1'
  const bucketName = 'garmin-data'
  
  // Get today's date in YYYY-MM-DD format
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  
  try {
    if (processHistorical) {
      console.log(`Checking bucket "${bucketName}" for user "${userId}" for all historical data...`)
    } else {
      console.log(`Checking bucket "${bucketName}" for user "${userId}" for date ${todayStr}...`)
    }
    
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

    // Filter files based on mode
    let filesToProcess = processHistorical ? data : data.filter(file => file.name.includes(todayStr))
    
    console.log(`Found ${filesToProcess.length} files to process:`)
    filesToProcess.forEach(file => console.log(`- ${file.name}`))
    
    for (const file of filesToProcess) {
      console.log(`\nProcessing ${file.name}...`)
      await processFile(userId, bucketName, `${userId}/${file.name}`)
    }

    console.log('\nAll files processed successfully')
  } catch (err: any) {
    console.error('Error processing bucket:', err)
    if (err.message) console.error('Error message:', err.message)
    if (err.details) console.error('Error details:', err.details)
    throw err
  }
}

async function dumpImport() {
  const userId = process.env.USER_ID
  if (!userId) {
    console.error('USER_ID environment variable is required for dump import')
    process.exit(1)
  }

  const bucketName = 'garmin-data'
  
  try {
    console.log(`Starting dump import for user "${userId}"...`)
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(userId, {
        limit: 1000, // Increased limit for bulk import
        sortBy: { column: 'name', order: 'asc' }
      })

    if (error) {
      console.error('Storage API Error:', error)
      throw error
    }

    if (!data || data.length === 0) {
      console.log('No files found for user. This could mean:')
      console.log('1. The bucket is empty')
      console.log('2. The user folder does not exist')
      console.log('3. Permissions are not configured correctly')
      return
    }

    console.log(`Found ${data.length} files to process:`)
    data.forEach(file => console.log(`- ${file.name}`))
    
    for (const file of data) {
      console.log(`\nProcessing ${file.name}...`)
      await processFile(userId, bucketName, `${userId}/${file.name}`)
    }

    console.log('\nDump import completed successfully')
  } catch (err: any) {
    console.error('Error during dump import:', err)
    if (err.message) console.error('Error message:', err.message)
    if (err.details) console.error('Error details:', err.details)
    throw err
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const processHistorical = args.includes('--historical')
const dumpMode = args.includes('--dump')

// Run the appropriate function
if (dumpMode) {
  dumpImport()
    .catch(error => {
      console.error('Script failed:', error)
      process.exit(1)
    })
} else {
  checkBucketFiles(processHistorical)
    .catch(error => {
      console.error('Script failed:', error)
      process.exit(1)
    })
} 