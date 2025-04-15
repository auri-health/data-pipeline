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
  SELECT 
    SUM(ua.calories)::INTEGER as total_calories,
    SUM(ua.calories)::INTEGER as active_calories,
    0::INTEGER as bmr_calories
  FROM user_activities ua
  WHERE ua.user_id = p_user_id
    AND DATE(ua.start_time) = p_date
  GROUP BY user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get daily activity intensity statistics
CREATE OR REPLACE FUNCTION get_daily_activity_stats(p_date DATE, p_user_id UUID)
RETURNS TABLE (
  highly_active_seconds INTEGER,
  active_seconds INTEGER,
  sedentary_seconds INTEGER,
  moderate_intensity_minutes INTEGER,
  vigorous_intensity_minutes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH activity_durations AS (
    SELECT 
      SUM(CASE 
        WHEN ua.metadata->>'intensity' = 'VIGOROUS' THEN ua.duration_seconds
        ELSE 0 
      END)::INTEGER as vigorous_seconds,
      SUM(CASE 
        WHEN ua.metadata->>'intensity' = 'MODERATE' THEN ua.duration_seconds
        ELSE 0 
      END)::INTEGER as moderate_seconds,
      SUM(CASE 
        WHEN ua.metadata->>'intensity' = 'LOW' THEN ua.duration_seconds
        ELSE 0 
      END)::INTEGER as low_intensity_seconds
    FROM user_activities ua
    WHERE ua.user_id = p_user_id
      AND DATE(ua.start_time) = p_date
  )
  SELECT 
    COALESCE(vigorous_seconds, 0) as highly_active_seconds,
    COALESCE(vigorous_seconds + moderate_seconds, 0) as active_seconds,
    COALESCE(low_intensity_seconds, 0) as sedentary_seconds,
    COALESCE((moderate_seconds / 60)::INTEGER, 0) as moderate_intensity_minutes,
    COALESCE((vigorous_seconds / 60)::INTEGER, 0) as vigorous_intensity_minutes
  FROM activity_durations;
END;
$$ LANGUAGE plpgsql;

-- Function to get daily stress statistics
CREATE OR REPLACE FUNCTION get_daily_stress_stats(p_date DATE, p_user_id UUID)
RETURNS TABLE (
  avg_stress_level INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    AVG(sr.stress_level)::INTEGER as avg_stress_level
  FROM stress_readings sr
  WHERE sr.user_id = p_user_id
    AND DATE(sr.timestamp) = p_date
  GROUP BY sr.user_id, DATE(sr.timestamp);
END;
$$ LANGUAGE plpgsql;