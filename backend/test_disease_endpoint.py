"""
Test the /disease endpoint directly with a sample image.
Verifies the model returns different predictions for different images.
"""
import os
import sys
import numpy as np
from PIL import Image
import io

# Add parent to path
sys.path.insert(0, os.path.dirname(__file__))

def test_model_predictions():
    """Test the disease service model with a synthetic image to verify it's not stuck."""
    from server.disease_service import DiseaseService
    
    service = DiseaseService()
    
    if not service.has_accurate_model():
        print("❌ Accurate model not loaded!")
        return
    
    print("✅ Model loaded successfully")
    print(f"   Class names count: {len(service._class_names)}")
    print(f"   Model type: {type(service._accurate_model)}")
    
    # Check model input shape
    if hasattr(service._accurate_model, 'input_shape'):
        print(f"   Input shape: {service._accurate_model.input_shape}")
    
    # Test 1: Random black image
    print("\n--- Test 1: Black image ---")
    black_img = Image.new('RGB', (224, 224), (0, 0, 0))
    buf = io.BytesIO()
    black_img.save(buf, format='JPEG')
    result1 = service.run_accurate_inference(buf.getvalue())
    print(f"   Result: {result1.get('disease_name', 'N/A')}")
    print(f"   Confidence: {result1.get('confidence', 'N/A')}%")
    print(f"   Top predictions: {result1.get('all_predictions', {})}")
    
    # Test 2: Random white image
    print("\n--- Test 2: White image ---")
    white_img = Image.new('RGB', (224, 224), (255, 255, 255))
    buf2 = io.BytesIO()
    white_img.save(buf2, format='JPEG')
    result2 = service.run_accurate_inference(buf2.getvalue())
    print(f"   Result: {result2.get('disease_name', 'N/A')}")
    print(f"   Confidence: {result2.get('confidence', 'N/A')}%")
    
    # Test 3: Random noise
    print("\n--- Test 3: Random noise ---")
    noise = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
    noise_img = Image.fromarray(noise)
    buf3 = io.BytesIO()
    noise_img.save(buf3, format='JPEG')
    result3 = service.run_accurate_inference(buf3.getvalue())
    print(f"   Result: {result3.get('disease_name', 'N/A')}")
    print(f"   Confidence: {result3.get('confidence', 'N/A')}%")
    
    # Test 4: Green image (like a leaf)
    print("\n--- Test 4: Green image ---")
    green_img = Image.new('RGB', (224, 224), (34, 139, 34))
    buf4 = io.BytesIO()
    green_img.save(buf4, format='JPEG')
    result4 = service.run_accurate_inference(buf4.getvalue())
    print(f"   Result: {result4.get('disease_name', 'N/A')}")
    print(f"   Confidence: {result4.get('confidence', 'N/A')}%")
    
    # Summary
    print("\n" + "="*60)
    print("SUMMARY:")
    predictions = [
        result1.get('disease_name', ''),
        result2.get('disease_name', ''),
        result3.get('disease_name', ''),
        result4.get('disease_name', ''),
    ]
    unique = set(predictions)
    if len(unique) == 1:
        print(f"⚠️  ALL 4 tests returned the SAME prediction: {predictions[0]}")
        print("   This suggests a model loading or preprocessing issue!")
    else:
        print(f"✅ Model returns {len(unique)} different predictions across 4 tests")
        for i, p in enumerate(predictions):
            print(f"   Test {i+1}: {p}")

if __name__ == "__main__":
    os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
    test_model_predictions()
