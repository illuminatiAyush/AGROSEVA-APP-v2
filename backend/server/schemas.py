"""
Pydantic Schemas for API Request/Response Validation

Defines data structures for sensor data and status.
All schemas use ONLY live data - no mocks.
"""

from typing import Optional, Dict
from pydantic import BaseModel, Field


class MoistureResponse(BaseModel):
    """
    Live moisture reading response.
    
    Example:
    {
        "moisture": 42,
        "unit": "%",
        "source": "arduino",
        "timestamp": 1234567890
    }
    """
    moisture: Optional[int] = Field(None, description="Live moisture percentage from Arduino (0-100)")
    unit: str = Field("%", description="Unit of measurement")
    source: str = Field("arduino", description="Data source")
    timestamp: Optional[int] = Field(None, description="Unix timestamp of reading")


class StatusResponse(BaseModel):
    """
    System status response with live data (includes XAI explanation and multi-sensor support).
    
    Note: This schema allows extra fields for backward compatibility.
    The actual /status endpoint returns a dict directly (not this schema) for flexibility.
    """
    status: str = Field(..., description="System status")
    sensor_data: Optional[Dict] = Field(None, description="Latest live sensor data from Arduino")
    relay_state: Dict = Field(..., description="Current relay state")
    last_decision: Optional[Dict] = Field(None, description="Last decision made (based on live data)")
    safety_status: Dict = Field(..., description="Safety manager status")
    irrigation: str = Field(..., description="Irrigation status: 'ON' or 'OFF'")
    moisture: Optional[float] = Field(None, description="Live moisture percentage")
    temperature: Optional[float] = Field(None, description="Live temperature in Celsius")
    ph: Optional[float] = Field(None, description="Live pH value")
    timestamp: Optional[int] = Field(None, description="Unix timestamp of last reading")
    explanation: Optional[str] = Field(None, description="XAI explanation of last decision")
    
    class Config:
        extra = "allow"  # Allow extra fields for backward compatibility

