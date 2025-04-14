-- Function to get daily sleep statistics
CREATE OR REPLACE FUNCTION get_daily_sleep_stats(p_user_id UUID, p_date DATE)
RETURNS TABLE (
  total_sleep_seconds BIGINT,
  resting_heart_rate INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    SUM(duration_seconds)::BIGINT as total_sleep_seconds,
    AVG(resting_heart_rate)::INTEGER as resting_heart_rate
  FROM sleep_stages
  WHERE user_id = p_user_id
    AND DATE(timestamp) = p_date
  GROUP BY user_id, DATE(timestamp);
END;
$$ LANGUAGE plpgsql;

-- Function to get daily heart rate statistics
CREATE OR REPLACE FUNCTION get_daily_heart_rate_stats(p_user_id UUID, p_date DATE)
RETURNS TABLE (
  min_hr INTEGER,
  max_hr INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    MIN(heart_rate)::INTEGER as min_hr,
    MAX(heart_rate)::INTEGER as max_hr
  FROM heart_rate_readings
  WHERE user_id = p_user_id
    AND DATE(timestamp) = p_date
  GROUP BY user_id, DATE(timestamp);
END;
$$ LANGUAGE plpgsql; 