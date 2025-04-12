import pytest
from src.pipeline.data_fetcher import GarminDataFetcher
from src.pipeline.data_processor import GarminDataProcessor
from src.models.device_mapper import ForerunnerFR235Mapper
from src.models.garmin_data import SleepData, ActivityData, HeartRateData

@pytest.fixture
def setup_pipeline():
    fetcher = GarminDataFetcher()
    mapper = ForerunnerFR235Mapper()
    processor = GarminDataProcessor(mapper)
    return fetcher, processor

def test_sleep_data_integration(setup_pipeline):
    """Test processing real sleep data from GitHub"""
    fetcher, processor = setup_pipeline
    
    # Fetch and process real data
    raw_data = fetcher.fetch_sleep_data()
    processed_data = processor.process_sleep_data(raw_data)
    
    # Validate processed data
    assert len(processed_data) > 0, "Should have processed sleep data"
    
    for sleep_entry in processed_data:
        assert isinstance(sleep_entry, SleepData)
        # Validate required fields based on forerunner235.md
        assert sleep_entry.deep_sleep_seconds >= 0
        assert sleep_entry.light_sleep_seconds >= 0
        assert sleep_entry.awake_sleep_seconds >= 0
        assert isinstance(sleep_entry.sleep_movement, list)

def test_activity_data_integration(setup_pipeline):
    """Test processing real activity data from GitHub"""
    fetcher, processor = setup_pipeline
    
    # Fetch and process real data
    raw_data = fetcher.fetch_activity_data()
    processed_data = processor.process_activity_data(raw_data)
    
    # Validate processed data
    assert len(processed_data) > 0, "Should have processed activity data"
    
    for activity in processed_data:
        assert isinstance(activity, ActivityData)
        # Validate required fields based on forerunner235.md
        assert activity.activity_id > 0
        assert activity.activity_name
        assert activity.distance >= 0
        assert activity.duration >= 0
        assert activity.average_hr >= 0
        assert activity.max_hr >= 0
        assert activity.steps >= 0
        assert activity.average_speed >= 0
        assert activity.max_speed >= 0
        # Optional fields might be None
        if activity.elevation_gain is not None:
            assert activity.elevation_gain >= 0
        if activity.elevation_loss is not None:
            assert activity.elevation_loss >= 0

def test_heart_rate_data_integration(setup_pipeline):
    """Test processing real heart rate data from GitHub"""
    fetcher, processor = setup_pipeline
    
    # Fetch and process real data
    raw_data = fetcher.fetch_heart_rate_data()
    processed_data = processor.process_heart_rate_data(raw_data)
    
    # Validate processed data
    assert len(processed_data) > 0, "Should have processed heart rate data"
    
    for hr_entry in processed_data:
        assert isinstance(hr_entry, HeartRateData)
        # Validate required fields based on forerunner235.md
        assert hr_entry.heart_rate > 0
        assert hr_entry.timestamp > 0  # Unix timestamp should be positive

def test_data_consistency(setup_pipeline):
    """Test that processed data maintains consistency with device capabilities"""
    fetcher, processor = setup_pipeline
    
    # Process all data types
    sleep_data = processor.process_sleep_data(fetcher.fetch_sleep_data())
    activity_data = processor.process_activity_data(fetcher.fetch_activity_data())
    hr_data = processor.process_heart_rate_data(fetcher.fetch_heart_rate_data())
    
    # Verify no unsupported fields are present
    for sleep in sleep_data:
        sleep_dict = sleep.dict()
        assert 'remSleepSeconds' not in sleep_dict
        assert 'sleepScore' not in sleep_dict
        assert 'stressLevel' not in sleep_dict
    
    for activity in activity_data:
        activity_dict = activity.dict()
        assert 'groundContactTime' not in activity_dict
        assert 'verticalOscillation' not in activity_dict
        assert 'runningPower' not in activity_dict
    
    for hr in hr_data:
        hr_dict = hr.dict()
        assert 'hrvStatus' not in hr_dict
        assert 'bodyBattery' not in hr_dict
        assert 'pulseOx' not in hr_dict 