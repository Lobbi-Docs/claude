"""
Token-related Pydantic schemas for authentication.
"""
from pydantic import BaseModel
from typing import Optional

class Token(BaseModel):
    """JWT token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenPayload(BaseModel):
    """Token payload"""
    sub: Optional[str] = None
    exp: Optional[int] = None
    type: Optional[str] = None

class RefreshTokenRequest(BaseModel):
    """Refresh token request"""
    refresh_token: str
