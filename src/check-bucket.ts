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

async function checkBucketFiles() {
  const userId = '7afb527e-a12f-4c78-8dda-bd4e7ae501b1'
  const bucketName = 'garmin-data'
  
  try {
    console.log('Environment check:')
    console.log('- SUPABASE_URL configured:', !!process.env.SUPABASE_URL)
    console.log('- SUPABASE_SERVICE_ROLE_KEY configured:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
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
    } else {
      console.log(`Found ${data.length} files:`)
      data.forEach(file => console.log(`- ${file.name}`))
    }

    return data
  } catch (err: any) {
    console.error('Error checking bucket:', err)
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