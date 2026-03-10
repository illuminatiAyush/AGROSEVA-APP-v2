#!/usr/bin/env python3
"""
Simple Plant Disease Model Tester
Paste an image path to get prediction results.
"""

import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # Suppress TF info messages
os.environ['TF_USE_LEGACY_KERAS'] = '1'

import sys
import numpy as np
import tf_keras as keras
from tf_keras.preprocessing import image
import matplotlib.pyplot as plt

MODEL_PATH = "plant_disease_model.h5"
IMG_SIZE = (224, 224)

CLASS_NAMES = [
    'Apple___Apple_scab', 'Apple___Black_rot', 'Apple___Cedar_apple_rust', 'Apple___healthy',
    'Blueberry___healthy', 'Cherry_(including_sour)___healthy',
    'Cherry_(including_sour)___Powdery_mildew', 'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot',
    'Corn_(maize)___Common_rust_', 'Corn_(maize)___healthy', 'Corn_(maize)___Northern_Leaf_Blight',
    'Grape___Black_rot', 'Grape___Esca_(Black_Measles)', 'Grape___healthy',
    'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)', 'Orange___Haunglongbing_(Citrus_greening)',
    'Peach___Bacterial_spot', 'Peach___healthy', 'Pepper,_bell___Bacterial_spot',
    'Pepper,_bell___healthy', 'Potato___Early_blight', 'Potato___healthy',
    'Potato___Late_blight', 'Raspberry___healthy', 'Soybean___healthy',
    'Squash___Powdery_mildew', 'Strawberry___healthy', 'Strawberry___Leaf_scorch',
    'Tomato___Bacterial_spot', 'Tomato___Early_blight', 'Tomato___healthy',
    'Tomato___Late_blight', 'Tomato___Leaf_Mold', 'Tomato___Septoria_leaf_spot',
    'Tomato___Spider_mites Two-spotted_spider_mite', 'Tomato___Target_Spot',
    'Tomato___Tomato_mosaic_virus', 'Tomato___Tomato_Yellow_Leaf_Curl_Virus'
]


def load_model():
    """Load the trained model."""
    print("Loading model... (this may take a minute)")
    model = keras.models.load_model(MODEL_PATH, compile=False)
    print("Model loaded successfully!\n")
    return model


def predict(model, img_path):
    """Run prediction on a single image and display results."""
    img = image.load_img(img_path, target_size=IMG_SIZE)
    img_array = image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)  # Model has built-in Rescaling layer, don't normalize here

    print("Running prediction...")
    predictions = model.predict(img_array, verbose=0)
    pred_idx = np.argmax(predictions[0])
    confidence = predictions[0][pred_idx]
    pred_class = CLASS_NAMES[pred_idx]

    plant = pred_class.split('___')[0]
    disease = pred_class.split('___')[1]

    # Console output
    print("=" * 50)
    print(f"  File      : {os.path.basename(img_path)}")
    print(f"  Plant     : {plant}")
    print(f"  Disease   : {disease}")
    print(f"  Confidence: {confidence * 100:.2f}%")
    print("=" * 50)

    # Top 5
    top5_idx = np.argsort(predictions[0])[-5:][::-1]
    print("\nTop 5 Predictions:")
    for rank, i in enumerate(top5_idx, 1):
        print(f"  {rank}. {CLASS_NAMES[i]:50s} {predictions[0][i]*100:6.2f}%")

    # Visual output
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5))

    ax1.imshow(img)
    ax1.set_title(f"{plant} - {disease}\nConfidence: {confidence*100:.1f}%", fontweight='bold')
    ax1.axis('off')

    top5_classes = [CLASS_NAMES[i].replace('___', ' - ') for i in top5_idx]
    top5_scores = [predictions[0][i] * 100 for i in top5_idx]
    colors = ['#27ae60' if j == 0 else '#bdc3c7' for j in range(5)]
    ax2.barh(top5_classes[::-1], top5_scores[::-1], color=colors[::-1])
    ax2.set_xlabel('Confidence (%)')
    ax2.set_title('Top 5 Predictions')

    plt.tight_layout()
    plt.savefig('last_prediction.png', dpi=100)
    print("\nChart saved to last_prediction.png")
    plt.close()


def main():
    model = load_model()

    while True:
        print("\nPaste the full path to a plant leaf image (or type 'quit' to exit):")
        img_path = input("> ").strip().strip('"').strip("'")

        if not img_path or img_path.lower() in ('quit', 'exit', 'q'):
            break

        if not os.path.isfile(img_path):
            print(f"File not found: {img_path}")
            continue

        predict(model, img_path)

    print("Done.")


if __name__ == "__main__":
    main()
