"""
Groq LLM Service - Plant Disease Diagnosis

When internet is available and a disease is detected, calls Groq's LLM
to generate detailed diagnosis and treatment recommendations.

Usage:
    Set GROQ_API_KEY in your .env file.
    Place accurate model at backend/ml/online/plant_disease_model.h5
"""

import os
import json
from typing import Dict, Any, Optional

from . import config


def _check_internet() -> bool:
    """Quick check if internet is available."""
    try:
        import urllib.request
        import urllib.error
        urllib.request.urlopen("https://api.groq.com", timeout=3)
        return True
    except urllib.error.HTTPError:
        # HTTP errors (e.g. 403) mean the server responded — internet works
        return True
    except Exception:
        return False


def get_disease_diagnosis(
    disease_status: str,
    confidence: float,
    disease_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get detailed diagnosis from Groq LLM.
    
    Args:
        disease_status: "healthy" or "diseased" (from TinyML)
        confidence: confidence percentage (0-100)
        disease_name: specific disease name from accurate model (optional)
    
    Returns:
        dict with: diagnosis, severity, treatment_steps, prevention
    """
    # Check if Groq is configured
    api_key = config.GROQ_API_KEY
    if not api_key:
        return {
            "available": False,
            "reason": "GROQ_API_KEY not set in .env file"
        }
    
    # Check internet
    if not _check_internet():
        return {
            "available": False,
            "reason": "No internet connection - using offline ESP32 result only"
        }
    
    try:
        from groq import Groq
        
        client = Groq(api_key=api_key)
        
        # Build prompt based on available info
        if disease_status == "healthy":
            # Healthy plant — call Groq for detailed explanation
            plant_name = ""
            if disease_name:
                # Extract plant name from formatted name like "Tomato - healthy" or raw "Tomato___healthy"
                if "___" in disease_name:
                    plant_name = disease_name.split("___")[0].replace("_", " ")
                elif " - " in disease_name:
                    plant_name = disease_name.split(" - ")[0].strip()

            plant_context = f" The plant has been identified as {plant_name}." if plant_name else ""
            prompt = f"""You are an expert agricultural advisor providing encouraging feedback to a farmer.

An AI plant health detection model has classified this plant as HEALTHY with {confidence}% confidence.{plant_context}

Provide a helpful, informative response that:
1. Explains what positive health indicators are typically visible in a healthy plant of this type
2. Gives practical care recommendations to maintain the plant's health
3. Lists early warning signs the farmer should watch for to catch problems early
4. Suggests organic practices for continued plant vitality

Respond with this exact JSON structure:
{{
    "disease_name": "Healthy Plant",
    "severity": "none",
    "description": "Encouraging 2-3 sentence explanation of why the plant appears healthy and what good signs are visible.",
    "symptoms": ["Positive health indicator 1", "Positive indicator 2", "Indicator 3"],
    "causes": ["Good practice contributing to health 1", "Good practice 2"],
    "treatment_steps": [
        "Care tip 1: Ongoing maintenance recommendation",
        "Care tip 2: Nutrition advice",
        "Care tip 3: Monitoring schedule"
    ],
    "prevention": [
        "Early warning sign to watch for 1",
        "Warning sign 2",
        "Warning sign 3"
    ],
    "organic_options": [
        "Organic practice 1 for continued health",
        "Organic practice 2"
    ],
    "urgency": "none"
}}

Respond ONLY with the JSON, no other text."""

        elif disease_name and "healthy" not in disease_name.lower():
            # Parse plant name from class (e.g. "Tomato___Late_blight" -> "Tomato")
            plant_name = disease_name.split("___")[0].replace("_", " ") if "___" in disease_name else disease_name.split(" - ")[0].strip() if " - " in disease_name else disease_name.split(" ")[0]
            readable_disease = disease_name.replace("___", " - ").replace("_", " ")

            prompt = f"""You are an expert agricultural plant pathologist providing advice to farmers.

An AI plant disease detection model has predicted:
- Plant: {plant_name}
- Predicted Disease: {readable_disease}
- Model Confidence: {confidence}%

IMPORTANT: The AI model has limited accuracy, so your analysis should:
1. Describe the predicted disease thoroughly so the farmer can verify visually
2. Mention 1-2 similar conditions that could also match (differential diagnosis)
3. Provide actionable treatment even if the exact disease is slightly different
4. Include both chemical and organic treatment options

Respond with this exact JSON structure:
{{
    "disease_name": "{readable_disease}",
    "severity": "low" or "moderate" or "severe" or "critical",
    "description": "Clear 2-3 sentence explanation of this disease, what causes it, and how it affects the plant. Mention that similar symptoms could indicate related conditions.",
    "symptoms": ["Visible symptom 1 the farmer should look for", "Symptom 2", "Symptom 3", "Symptom 4"],
    "causes": ["Primary cause", "Environmental factor", "Contributing factor"],
    "treatment_steps": [
        "Step 1: Immediate action to take",
        "Step 2: Treatment application",
        "Step 3: Follow-up care",
        "Step 4: Monitoring instructions"
    ],
    "prevention": [
        "Prevention tip 1",
        "Prevention tip 2",
        "Prevention tip 3"
    ],
    "organic_options": [
        "Organic remedy 1 with application method",
        "Organic remedy 2 with application method"
    ],
    "urgency": "immediate" or "within_days" or "within_weeks"
}}

Respond ONLY with the JSON, no other text."""

        elif disease_status == "diseased":
            prompt = f"""You are an expert agricultural plant pathologist providing advice to farmers.

A binary disease detection system has classified a plant leaf as DISEASED with {confidence}% confidence.
No specific disease name is available (binary classifier only).

Provide general but practical disease management advice. Since we cannot identify the exact disease, focus on:
1. Common signs the farmer should inspect more closely
2. General first-response steps that work for most plant diseases
3. When to seek professional help

Respond with this exact JSON structure:
{{
    "disease_name": "Unidentified Disease (needs detailed analysis)",
    "severity": "moderate",
    "description": "The AI has detected signs of disease in your plant. While the specific condition cannot be identified with the current detection method, here are general management steps that will help in most cases.",
    "symptoms": ["Common symptom to look for 1", "Symptom 2", "Symptom 3"],
    "causes": ["Common cause 1", "Common cause 2"],
    "treatment_steps": [
        "Step 1: Immediate isolation and inspection",
        "Step 2: General treatment",
        "Step 3: Follow-up",
        "Step 4: When to get expert help"
    ],
    "prevention": [
        "Prevention tip 1",
        "Prevention tip 2",
        "Prevention tip 3"
    ],
    "organic_options": [
        "Organic remedy 1",
        "Organic remedy 2"
    ],
    "urgency": "within_days"
}}

Respond ONLY with the JSON, no other text."""

        else:
            # Edge case: status not healthy/diseased, no disease name
            return {
                "available": False,
                "reason": "Insufficient data for LLM diagnosis"
            }
        
        # Call Groq LLM
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert plant pathologist. Always respond with valid JSON only."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model=config.GROQ_MODEL,
            temperature=0.3,
            max_tokens=1024,
            response_format={"type": "json_object"}
        )
        
        # Parse response
        response_text = chat_completion.choices[0].message.content
        diagnosis = json.loads(response_text)
        
        return {
            "available": True,
            "diagnosis": diagnosis,
            "model_used": config.GROQ_MODEL,
            "tokens_used": chat_completion.usage.total_tokens if chat_completion.usage else 0
        }
        
    except ImportError:
        return {
            "available": False,
            "reason": "groq package not installed - run: pip install groq"
        }
    except json.JSONDecodeError as e:
        return {
            "available": True,
            "diagnosis": {"raw_response": response_text, "parse_error": str(e)}
        }
    except Exception as e:
        return {
            "available": False,
            "reason": f"Groq API error: {str(e)}"
        }
