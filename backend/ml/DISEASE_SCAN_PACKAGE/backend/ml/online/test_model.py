#!/usr/bin/env python3
"""
Plant Disease Model Testing Script
===================================
Tests the trained plant_disease_model.h5 on sample images
"""

import os
import sys
import numpy as np
import matplotlib.pyplot as plt
import tensorflow as tf
from tensorflow.keras.preprocessing import image
import random

# Configuration
MODEL_PATH = "plant_disease_model.h5"
IMG_SIZE = (224, 224)
DATASET_PATH = "New Plant Diseases Dataset(Augmented)/New Plant Diseases Dataset(Augmented)/train"

def load_model():
    """Load the trained model"""
    print("Loading model...")
    try:
        model = tf.keras.models.load_model(MODEL_PATH)
        print(f"✅ Model loaded successfully: {MODEL_PATH}")
        print(f"   Model parameters: {model.count_params():,}")
        return model
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        return None

def load_class_names():
    """Load class names from the dataset"""
    if os.path.exists(DATASET_PATH):
        class_names = sorted(os.listdir(DATASET_PATH))
        print(f"✅ Found {len(class_names)} classes")
        return class_names
    else:
        print("❌ Dataset path not found")
        return None

def preprocess_image(img_path):
    """Preprocess image for model prediction"""
    try:
        img = image.load_img(img_path, target_size=IMG_SIZE)
        img_array = image.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        img_array = img_array / 255.0  # Normalize
        return img_array, img
    except Exception as e:
        print(f"❌ Error preprocessing image {img_path}: {e}")
        return None, None

def predict_disease(model, img_array, class_names):
    """Make prediction on preprocessed image"""
    try:
        predictions = model.predict(img_array, verbose=0)
        predicted_class_idx = np.argmax(predictions[0])
        confidence = predictions[0][predicted_class_idx]

        predicted_class = class_names[predicted_class_idx] if class_names else f"Class_{predicted_class_idx}"

        return predicted_class, confidence, predictions[0]
    except Exception as e:
        print(f"❌ Error making prediction: {e}")
        return None, None, None

def get_random_test_images(num_images=5):
    """Get random test images from the dataset"""
    test_images = []

    if not os.path.exists(DATASET_PATH):
        print("❌ Dataset path not found")
        return test_images

    class_dirs = [d for d in os.listdir(DATASET_PATH) if os.path.isdir(os.path.join(DATASET_PATH, d))]

    for _ in range(num_images):
        # Pick random class
        class_name = random.choice(class_dirs)
        class_path = os.path.join(DATASET_PATH, class_name)

        # Pick random image from class
        images = [f for f in os.listdir(class_path) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        if images:
            img_name = random.choice(images)
            img_path = os.path.join(class_path, img_name)
            test_images.append((img_path, class_name))

    return test_images

def test_model_on_random_images(model, class_names, num_tests=5):
    """Test model on random images from dataset"""
    print(f"\n🧪 Testing model on {num_tests} random images...")
    print("=" * 60)

    test_images = get_random_test_images(num_tests)

    if not test_images:
        print("❌ No test images found")
        return

    correct_predictions = 0
    results = []

    for i, (img_path, true_class) in enumerate(test_images, 1):
        print(f"\nTest {i}/{num_tests}")
        print(f"Image: {os.path.basename(img_path)}")
        print(f"True class: {true_class}")

        # Preprocess and predict
        img_array, img = preprocess_image(img_path)
        if img_array is None:
            continue

        predicted_class, confidence, predictions = predict_disease(model, img_array, class_names)

        if predicted_class:
            print(f"Predicted: {predicted_class}")
            print(".2f")

            # Check if prediction is correct
            is_correct = predicted_class == true_class
            if is_correct:
                correct_predictions += 1
                print("✅ CORRECT")
            else:
                print("❌ WRONG")

            results.append({
                'image_path': img_path,
                'true_class': true_class,
                'predicted_class': predicted_class,
                'confidence': confidence,
                'correct': is_correct
            })

    # Summary
    accuracy = correct_predictions / len(results) * 100 if results else 0
    print(f"\n📊 Test Results Summary")
    print("=" * 60)
    print(f"Total tests: {len(results)}")
    print(f"Correct predictions: {correct_predictions}")
    print(".1f")

    return results

def test_single_image(model, class_names, img_path):
    """Test model on a single image"""
    print(f"\n🖼️  Testing single image: {img_path}")
    print("=" * 60)

    if not os.path.exists(img_path):
        print("❌ Image file not found")
        return

    # Preprocess and predict
    img_array, img = preprocess_image(img_path)
    if img_array is None:
        return

    predicted_class, confidence, predictions = predict_disease(model, img_array, class_names)

    if predicted_class:
        print(f"Predicted Disease: {predicted_class}")
        print(f"Confidence: {confidence:.2%}")

        # Show top 3 predictions
        if predictions is not None and class_names:
            top_indices = np.argsort(predictions)[-3:][::-1]
            print("🔝 Top 3 Predictions:")
            for i, idx in enumerate(top_indices, 1):
                print(f"  {i}. {class_names[idx]}: {predictions[idx]:.2%}")

        # Display image
        try:
            plt.figure(figsize=(6, 6))
            plt.imshow(img)
            plt.title(f"Predicted: {predicted_class}\nConfidence: {confidence:.2%}")
            plt.axis('off')
            plt.show()
        except:
            print("Could not display image (matplotlib display issue)")

def main():
    print("🌿 Plant Disease Model Testing")
    print("=" * 60)

    # Load model
    model = load_model()
    if model is None:
        return

    # Load class names
    class_names = load_class_names()
    if class_names is None:
        return

    print(f"\nModel input shape: {model.input_shape}")
    print(f"Number of classes: {len(class_names)}")

    # Test options
    while True:
        print("
📋 Test Options:"        print("1. Test on random images from dataset")
        print("2. Test on a specific image file")
        print("3. Exit")

        try:
            choice = input("\nEnter your choice (1-3): ").strip()

            if choice == '1':
                num_tests = input("How many random tests? (default: 5): ").strip()
                num_tests = int(num_tests) if num_tests.isdigit() else 5
                test_model_on_random_images(model, class_names, num_tests)

            elif choice == '2':
                img_path = input("Enter image path: ").strip()
                if img_path:
                    test_single_image(model, class_names, img_path)

            elif choice == '3':
                print("👋 Goodbye!")
                break

            else:
                print("❌ Invalid choice. Please enter 1, 2, or 3.")

        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()