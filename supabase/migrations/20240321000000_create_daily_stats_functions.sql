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

-- Function to get daily calorie statistics
CREATE OR REPLACE FUNCTION get_daily_calorie_stats(p_date DATE, p_user_id UUID)
RETURNS TABLE (
  total_calories INTEGER,
  active_calories INTEGER,
  bmr_calories INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH activity_calories AS (
    SELECT 
      SUM(ua.active_calories)::INTEGER as active_calories
    FROM user_activities ua
    WHERE ua.user_id = p_user_id
      AND DATE(ua.start_time) = p_date
  ),
  daily_bmr AS (
    SELECT 
      ds.bmr_calories::INTEGER as bmr_calories
    FROM daily_summaries ds
    WHERE ds.user_id = p_user_id
      AND ds.date = p_date
    LIMIT 1
  )
  SELECT 
    (COALESCE(ac.active_calories, 0) + COALESCE(db.bmr_calories, 0))::INTEGER as total_calories,
    COALESCE(ac.active_calories, 0)::INTEGER as active_calories,
    COALESCE(db.bmr_calories, 0)::INTEGER as bmr_calories
  FROM activity_calories ac
  CROSS JOIN daily_bmr db;
END;
$$ LANGUAGE plpgsql;