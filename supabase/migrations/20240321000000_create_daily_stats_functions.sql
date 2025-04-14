-- Function to get daily sleep statistics
CREATE OR REPLACE FUNCTION get_daily_sleep_stats(p_date DATE, p_user_id UUID)
RETURNS TABLE (
  total_sleep_seconds BIGINT,
  resting_heart_rate INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    SUM(ss.duration_seconds)::BIGINT as total_sleep_seconds,
    AVG(ss.resting_heart_rate)::INTEGER as resting_heart_rate
  FROM sleep_stages ss
  WHERE ss.user_id = p_user_id
    AND DATE(ss.timestamp) = p_date
  GROUP BY ss.user_id, DATE(ss.timestamp);
END;
$$ LANGUAGE plpgsql;

-- Function to get daily heart rate statistics
CREATE OR REPLACE FUNCTION get_daily_heart_rate_stats(p_date DATE, p_user_id UUID)
RETURNS TABLE (
  min_hr INTEGER,
  max_hr INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    MIN(hr.heart_rate)::INTEGER as min_hr,
    MAX(hr.heart_rate)::INTEGER as max_hr
  FROM heart_rate_readings hr
  WHERE hr.user_id = p_user_id
    AND DATE(hr.timestamp) = p_date
  GROUP BY hr.user_id, DATE(hr.timestamp);
END;
$$ LANGUAGE plpgsql;