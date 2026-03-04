"""
Leaf Scan API Module

REST API endpoint for leaf health analysis.
POST /scan - accepts image and returns health analysis.
"""

import base64
import io
import numpy as np
import cv2
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import Optional, List
from pydantic import BaseModel

from .image_processing import process_leaf_image
from .health_scoring import compute_health_score_from_features
from .diagnosis import diagnose_leaf


# Create router
router = APIRouter(prefix="/scan", tags=["leaf-analysis"])


class ScanRequest(BaseModel):
    """Request model for base64 image upload."""
    image: str  # Base64-encoded image string


class ScanResponse(BaseModel):
    """Response model for leaf scan analysis."""
    health_score: float
    issue: str
    confidence: float
    ndvi: float
    recommendation: str
    reasoning: List[str]  # Explainability - list of reasoning steps
    overlay_image: Optional[str] = None  # Base64-encoded heatmap overlay


def create_heatmap_overlay(processed_image: np.ndarray, mask: np.ndarray, mean_vari: float) -> str:
    """
    Create a heatmap overlay visualization showing VARI distribution.
    
    Args:
        processed_image: Processed RGB image
        mask: Binary mask (1 = leaf, 0 = background)
        mean_vari: Mean VARI value for color scaling
    
    Returns:
        Base64-encoded image string
    """
    # Compute VARI for all pixels
    r = processed_image[:, :, 0].astype(np.float32)
    g = processed_image[:, :, 1].astype(np.float32)
    b = processed_image[:, :, 2].astype(np.float32)
    
    epsilon = 1e-6
    denominator = g + r - b + epsilon
    vari = (g - r) / denominator
    
    # Normalize VARI to 0-255 for visualization
    # Clip to reasonable range for color mapping
    vari_clipped = np.clip(vari, -0.2, 0.5)
    vari_normalized = (vari_clipped - (-0.2)) / (0.5 - (-0.2)) * 255.0
    vari_normalized = vari_normalized.astype(np.uint8)
    
    # Apply colormap (green = healthy, yellow = moderate, red = stressed)
    heatmap = cv2.applyColorMap(vari_normalized, cv2.COLORMAP_JET)
    
    # Apply mask (set background to original image)
    overlay = processed_image.copy()
    overlay[mask > 0] = heatmap[mask > 0]
    
    # Blend with original (50% opacity)
    blended = cv2.addWeighted(processed_image, 0.5, overlay, 0.5, 0)
    
    # Convert to base64
    _, buffer = cv2.imencode('.jpg', cv2.cvtColor(blended, cv2.COLOR_RGB2BGR))
    image_base64 = base64.b64encode(buffer).decode('utf-8')
    
    return image_base64


@router.post("", response_model=ScanResponse)
async def scan_leaf(
    image: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    """
    Analyze leaf health from uploaded image.
    
    Accepts image in two formats:
    1. Base64-encoded string in 'image' form field
    2. Multipart file upload in 'file' form field
    
    Returns:
        JSON response with:
        - health_score: 0-100 leaf health score
        - issue: Classification (Healthy, Nitrogen Deficiency, etc.)
        - confidence: 0.0-1.0 confidence score
        - ndvi: Approximate NDVI value
        - recommendation: Actionable recommendation
        - overlay_image: Base64-encoded heatmap visualization (optional)
    
    Example request (base64):
        POST /scan
        Content-Type: application/x-www-form-urlencoded
        image=data:image/jpeg;base64,/9j/4AAQSkZJRg...
    
    Example request (multipart):
        POST /scan
        Content-Type: multipart/form-data
        file=<binary image data>
    """
    try:
        # Get image data from either source
        image_data = None
        
        if image:
            # Base64 string provided
            image_data = image
        elif file:
            # Multipart file upload
            file_contents = await file.read()
            image_data = base64.b64encode(file_contents).decode('utf-8')
        else:
            raise HTTPException(
                status_code=400,
                detail="Either 'image' (base64) or 'file' (multipart) must be provided"
            )
        
        # Process image
        processing_result = process_leaf_image(image_data)
        
        # Extract all features (including new analysis features)
        features = {
            'mean_vari': processing_result['mean_vari'],
            'std_vari': processing_result['std_vari'],
            'green_pixel_ratio': processing_result['green_pixel_ratio'],
            'brightness': processing_result['brightness'],
            'segmentation_confidence': processing_result['segmentation_confidence'],
            'has_brown_yellow_clusters': processing_result['has_brown_yellow_clusters'],
            'brown_yellow_ratio': processing_result['brown_yellow_ratio'],
            'texture_variance': processing_result['texture_variance'],
            'has_lesions': processing_result['has_lesions'],
            'lesion_coverage': processing_result['lesion_coverage'],
            'spot_variance': processing_result['spot_variance'],
            'contrast_score': processing_result['contrast_score']
        }
        
        # Compute health score (using basic features)
        basic_features = {
            'mean_vari': features['mean_vari'],
            'std_vari': features['std_vari'],
            'green_pixel_ratio': features['green_pixel_ratio']
        }
        health_score = compute_health_score_from_features(basic_features)
        
        # Diagnose issue (using all features)
        diagnosis = diagnose_leaf(features, health_score)
        
        # Create heatmap overlay
        overlay_image = create_heatmap_overlay(
            processing_result['processed_image'],
            processing_result['mask'],
            features['mean_vari']
        )
        
        # Build response
        response = ScanResponse(
            health_score=health_score,
            issue=diagnosis['issue'],
            confidence=diagnosis['confidence'],
            ndvi=diagnosis['ndvi'],
            recommendation=diagnosis['recommendation'],
            reasoning=diagnosis['reasoning'],
            overlay_image=overlay_image
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing leaf image: {str(e)}"
        )


@router.post("/base64")
async def scan_leaf_base64(request: ScanRequest):
    """
    Alternative endpoint for base64 image in JSON body.
    
    Request body:
        {
            "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
        }
    
    Returns same response as POST /scan
    """
    try:
        # Process image
        processing_result = process_leaf_image(request.image)
        
        # Extract all features (including new analysis features)
        features = {
            'mean_vari': processing_result['mean_vari'],
            'std_vari': processing_result['std_vari'],
            'green_pixel_ratio': processing_result['green_pixel_ratio'],
            'brightness': processing_result['brightness'],
            'segmentation_confidence': processing_result['segmentation_confidence'],
            'has_brown_yellow_clusters': processing_result['has_brown_yellow_clusters'],
            'brown_yellow_ratio': processing_result['brown_yellow_ratio'],
            'texture_variance': processing_result['texture_variance'],
            'has_lesions': processing_result['has_lesions'],
            'lesion_coverage': processing_result['lesion_coverage'],
            'spot_variance': processing_result['spot_variance'],
            'contrast_score': processing_result['contrast_score']
        }
        
        # Compute health score (using basic features)
        basic_features = {
            'mean_vari': features['mean_vari'],
            'std_vari': features['std_vari'],
            'green_pixel_ratio': features['green_pixel_ratio']
        }
        health_score = compute_health_score_from_features(basic_features)
        
        # Diagnose issue (using all features)
        diagnosis = diagnose_leaf(features, health_score)
        
        # Create heatmap overlay
        overlay_image = create_heatmap_overlay(
            processing_result['processed_image'],
            processing_result['mask'],
            features['mean_vari']
        )
        
        # Build response
        response = ScanResponse(
            health_score=health_score,
            issue=diagnosis['issue'],
            confidence=diagnosis['confidence'],
            ndvi=diagnosis['ndvi'],
            recommendation=diagnosis['recommendation'],
            reasoning=diagnosis['reasoning'],
            overlay_image=overlay_image
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing leaf image: {str(e)}"
        )

