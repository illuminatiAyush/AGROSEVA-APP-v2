#!/usr/bin/env python3
"""
Plant Disease Model Testing Guide
==================================
Complete guide on how to test your trained model
"""

import os
import json

def show_testing_methods():
    print("🧪 PLANT DISEASE MODEL TESTING GUIDE")
    print("=" * 50)

    # Check model status
    model_exists = os.path.exists("plant_disease_model.h5")
    history_exists = os.path.exists("training_hist.json")
    dataset_exists = os.path.exists("New Plant Diseases Dataset(Augmented)/New Plant Diseases Dataset(Augmented)/train")

    print("📁 Model Status Check:")
    print(f"   Model file (.h5): {'✅ Found' if model_exists else '❌ Missing'}")
    print(f"   Training history: {'✅ Found' if history_exists else '❌ Missing'}")
    print(f"   Dataset: {'✅ Found' if dataset_exists else '❌ Missing'}")

    if history_exists:
        with open("training_hist.json", "r") as f:
            history = json.load(f)
        final_acc = history.get("val_accuracy", [-1])[-1] * 100
        print(".1f")
    print("\n📋 TESTING METHODS:")
    print("1. Web App Testing (Easiest)")
    print("2. Python Script Testing")
    print("3. Jupyter Notebook Testing")
    print("4. Command Line Testing")

    print("\n" + "="*50)
    print("METHOD 1: WEB APP TESTING (RECOMMENDED)")
    print("="*50)
    print("""
🖥️  Use the Streamlit web application:

1. Install dependencies:
   pip install streamlit tensorflow numpy pillow

2. Run the web app:
   streamlit run main.py

3. Open browser and upload plant images
4. Get instant disease predictions!

Features:
- Drag & drop image upload
- Real-time predictions
- Confidence scores
- User-friendly interface
""")

    print("\n" + "="*50)
    print("METHOD 2: PYTHON SCRIPT TESTING")
    print("="*50)
    print("""
🐍 Test with Python code:

# Basic prediction script
import tensorflow as tf
import numpy as np
from tensorflow.keras.preprocessing import image

# Load your trained model
model = tf.keras.models.load_model('plant_disease_model.h5')

# Test on an image
def predict_disease(img_path):
    img = image.load_img(img_path, target_size=(224, 224))
    img_array = image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0) / 255.0

    predictions = model.predict(img_array)
    predicted_class = np.argmax(predictions[0])
    confidence = predictions[0][predicted_class]

    return predicted_class, confidence

# Usage
class_idx, confidence = predict_disease('plant_image.jpg')
print(f"Disease Class: {class_idx}")
print(f"Confidence: {confidence:.1%}")
""")

    print("\n" + "="*50)
    print("METHOD 3: JUPYTER NOTEBOOK TESTING")
    print("="*50)
    print("""
📓 Use the provided Jupyter notebooks:

1. Test_plant_disease.ipynb - For testing the model
2. Train_plant_disease.ipynb - For training analysis

Run in VS Code or Jupyter Lab:
- Open the .ipynb file
- Run all cells
- Upload test images
- View predictions and visualizations
""")

    print("\n" + "="*50)
    print("METHOD 4: COMMAND LINE TESTING")
    print("="*50)
    print("""
💻 Quick command line tests:

# Check model info
python show_results.py

# Quick readiness check
python quick_test.py

# Test on random dataset images
python test_model.py  # (requires TensorFlow)

# Evaluate on full test set
python evaluate_model.py  # (requires TensorFlow)
""")

    print("\n" + "="*50)
    print("🎯 DISEASE CLASS REFERENCE")
    print("="*50)

    if dataset_exists:
        dataset_path = "New Plant Diseases Dataset(Augmented)/New Plant Diseases Dataset(Augmented)/train"
        classes = sorted([d for d in os.listdir(dataset_path) if os.path.isdir(os.path.join(dataset_path, d))])
        print(f"Model predicts {len(classes)} classes (0-{len(classes)-1}):")
        for i, cls in enumerate(classes[:10]):  # Show first 10
            print("2d")
        if len(classes) > 10:
            print(f"   ... and {len(classes)-10} more classes")
    else:
        print("Dataset not found - model predicts classes 0-37")

    print("\n" + "="*50)
    print("🚀 QUICK START COMMANDS")
    print("="*50)
    print("""
# 1. Check if everything is ready
python show_results.py

# 2. Start web app (if TensorFlow installed)
pip install streamlit tensorflow numpy pillow
streamlit run main.py

# 3. Test with Python (if TensorFlow installed)
python -c "
import tensorflow as tf
model = tf.keras.models.load_model('plant_disease_model.h5')
print('Model loaded successfully!')
"
""")

if __name__ == "__main__":
    show_testing_methods()