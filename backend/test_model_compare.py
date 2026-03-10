"""
Compare tf_keras vs tf.keras model loading to find the broken one.
"""
import os
import sys
import numpy as np
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

MODEL_PATH = os.path.join("ml", "online", "plant_disease_model.h5")

print(f"Model: {MODEL_PATH}")
print(f"Exists: {os.path.exists(MODEL_PATH)}")

# Create test image
from PIL import Image
import io

green_img = Image.new('RGB', (224, 224), (34, 139, 34))
buf = io.BytesIO()
green_img.save(buf, format='JPEG')
test_bytes = buf.getvalue()

img = Image.open(io.BytesIO(test_bytes)).convert('RGB')
img = img.resize((224, 224))
img_array = np.array(img, dtype=np.float32) / 255.0
img_array = np.expand_dims(img_array, axis=0)

print(f"\nTest image shape: {img_array.shape}")
print(f"Test image range: [{img_array.min():.3f}, {img_array.max():.3f}]")

# Method 1: tf.keras (standard)
print("\n--- Method 1: tf.keras ---")
try:
    import tensorflow as tf
    
    class CustomDepthwiseConv2D1(tf.keras.layers.DepthwiseConv2D):
        def __init__(self, **kwargs):
            kwargs.pop('groups', None)
            super().__init__(**kwargs)
    
    model1 = tf.keras.models.load_model(
        MODEL_PATH, 
        custom_objects={'DepthwiseConv2D': CustomDepthwiseConv2D1}
    )
    print(f"  Input shape: {model1.input_shape}")
    preds1 = model1.predict(img_array, verbose=0)[0]
    top_idx1 = int(np.argmax(preds1))
    print(f"  Top class idx: {top_idx1}")
    print(f"  Top confidence: {preds1[top_idx1]*100:.2f}%")
    print(f"  Max raw value: {preds1.max():.6f}")
    print(f"  Sum of predictions: {preds1.sum():.6f}")
    print(f"  Non-zero predictions: {np.count_nonzero(preds1)}")
    
    # Show top 5
    top5 = np.argsort(preds1)[-5:][::-1]
    for i, idx in enumerate(top5):
        print(f"    {i+1}. class {idx}: {preds1[idx]*100:.4f}%")
except Exception as e:
    print(f"  ERROR: {e}")

# Method 2: tf_keras
print("\n--- Method 2: tf_keras ---")
try:
    import tf_keras as keras
    
    class CustomDepthwiseConv2D2(keras.layers.DepthwiseConv2D):
        def __init__(self, **kwargs):
            kwargs.pop('groups', None)
            super().__init__(**kwargs)
    
    model2 = keras.models.load_model(
        MODEL_PATH,
        custom_objects={'DepthwiseConv2D': CustomDepthwiseConv2D2}
    )
    print(f"  Input shape: {model2.input_shape}")
    preds2 = model2.predict(img_array, verbose=0)[0]
    top_idx2 = int(np.argmax(preds2))
    print(f"  Top class idx: {top_idx2}")
    print(f"  Top confidence: {preds2[top_idx2]*100:.2f}%")
    print(f"  Max raw value: {preds2.max():.6f}")
    print(f"  Sum of predictions: {preds2.sum():.6f}")
    print(f"  Non-zero predictions: {np.count_nonzero(preds2)}")
    
    # Show top 5
    top5 = np.argsort(preds2)[-5:][::-1]
    for i, idx in enumerate(top5):
        print(f"    {i+1}. class {idx}: {preds2[idx]*100:.4f}%")
except Exception as e:
    print(f"  ERROR: {e}")

# Compare
print("\n--- Comparison ---")
try:
    if top_idx1 == top_idx2:
        print(f"✅ Both methods agree: class {top_idx1}")
    else:
        print(f"❌ MISMATCH! tf.keras={top_idx1}, tf_keras={top_idx2}")
    
    diff = np.abs(preds1 - preds2).sum()
    print(f"  Total prediction difference: {diff:.6f}")
except:
    print("Could not compare (one method failed)")
