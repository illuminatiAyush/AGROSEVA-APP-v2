"""
Pydantic Schemas for API Request/Response Validation

Defines data structures for sensor data, decisions, and status.
"""

from typing import Optional, Dict
from pydantic import BaseModel, Field


class SensorData(BaseModel):
    """
    Sensor data structure.
    
    Example:
    {
        "moisture": 42.5,
        "ph": 6.5,
        "temperature": 25.0
    }
    """
    moisture: Optional[float] = Field(None, description="Soil moisture percentage (0-100)")
    ph: Optional[float] = Field(None, description="pH value (0-14)")
    temperature: Optional[float] = Field(None, description="Temperature in Celsius")


class InjectSensorRequest(BaseModel):
    """
    Request to inject sensor data (for demo/testing).
    
    Example:
    {
        "moisture": 22.0,
        "ph": 5.6,
        "temperature": 32.0
    }
    """
    moisture: Optional[float] = Field(None, description="Soil moisture percentage")
    ph: Optional[float] = Field(None, description="pH value")
    temperature: Optional[float] = Field(None, description="Temperature in Celsius")


class DecisionResponse(BaseModel):
    """
    Agent decision response.
    
    Example:
    {
        "action": "IRRIGATE",
        "duration": 30,
        "reason": "Soil very dry (moisture 22.0% < 25%) - irrigating for 30s"
    }
    """
    action: str = Field(..., description="Action: 'IRRIGATE' or 'DO_NOTHING'")
    duration: int = Field(0, description="Irrigation duration in seconds (0 if DO_NOTHING)")
    reason: str = Field(..., description="Explanation for the decision")


class StatusResponse(BaseModel):
    """
    System status response.
    """
    status: str = Field(..., description="System status")
    sensor_data: Optional[SensorData] = Field(None, description="Latest sensor readings")
    relay_state: Dict = Field(..., description="Current relay state")
    last_decision: Optional[DecisionResponse] = Field(None, description="Last decision made")
    safety_status: Dict = Field(..., description="Safety manager status")

