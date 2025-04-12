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

def test_list_available_files():
    """Test that we can list files from the garmin_raw directory"""
    fetcher = GarminDataFetcher()
    files = fetcher.list_available_files()
    
    # Verify we get a list of files
    assert isinstance(files, list)
    assert len(files) > 0
    
    # Verify we have JSON files
    json_files = [f for f in files if f.endswith('.json')]
    assert len(json_files) > 0

def test_fetch_raw_data():
    """Test that we can fetch and parse JSON data from files"""
    fetcher = GarminDataFetcher()
    files = fetcher.list_available_files()
    
    # Try to fetch each JSON file
    for file_path in files:
        if file_path.endswith('.json'):
            data = fetcher.fetch_raw_data(file_path)
            assert isinstance(data, (dict, list)), f"Data from {file_path} should be JSON-parseable"

def test_fetch_all_data():
    """Test fetching all available data files"""
    fetcher = GarminDataFetcher()
    all_data = fetcher.fetch_all_data()
    
    # Verify we got data
    assert len(all_data) > 0, "Should have fetched some data files"
    
    # Verify structure of data
    for file_name, content in all_data.items():
        assert file_name.endswith('.json'), "Should only have JSON files"
        assert isinstance(content, (dict, list)), f"Content of {file_name} should be JSON-parseable"

def test_data_structure():
    """Test that the data structure matches what we expect from Forerunner 235"""
    fetcher = GarminDataFetcher()
    all_data = fetcher.fetch_all_data()
    
    # Check for expected data types based on forerunner235.md
    for file_name, content in all_data.items():
        if 'sleep' in file_name.lower():
            # Verify sleep data structure
            if isinstance(content, list):
                for entry in content:
                    assert isinstance(entry.get('deepSleepSeconds', 0), (int, type(None)))
                    assert isinstance(entry.get('lightSleepSeconds', 0), (int, type(None)))
                    assert isinstance(entry.get('awakeSleepSeconds', 0), (int, type(None)))
        
        elif 'activities' in file_name.lower():
            # Verify activity data structure
            if isinstance(content, list):
                for entry in content:
                    assert 'activityId' in entry, "Activity should have an ID"
                    assert 'activityName' in entry, "Activity should have a name"
                    assert 'distance' in entry, "Activity should have distance"
        
        elif 'heart-rate' in file_name.lower():
            # Verify heart rate data structure
            if isinstance(content, list):
                for entry in content:
                    assert 'heartRate' in entry, "Heart rate data should have heart rate value"
                    assert 'timestamp' in entry, "Heart rate data should have timestamp" 