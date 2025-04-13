import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_KEY environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkBucketFiles() {
  const userId = '7afb527e-a12f-4c78-8dda-bd4e7ae501b1'
  
  try {
    const { data, error } = await supabase.storage
      .from('garmin-data')
      .list(userId)

    if (error) {
      throw error
    }

    console.log('Files found:', data)
    return data
  } catch (error) {
    console.error('Error checking bucket:', error)
    throw error
  }
}

// Run the function
checkBucketFiles()
  .catch(error => {
    console.error('Script failed:', error)
    process.exit(1)
  }) 