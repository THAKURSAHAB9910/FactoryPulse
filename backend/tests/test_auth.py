"""
Unit Tests for Authentication and Security Functions
"""

import pytest
import uuid
from backend.app.utils.security import (
    get_password_hash,
    verify_password,
    create_access_token
)
from jose import jwt
from backend.app.config import settings

def test_password_hashing():
    plain = "SuperSecureManufacturingPassword2026!"
    hashed = get_password_hash(plain)
    
    assert hashed != plain
    assert verify_password(plain, hashed) is True
    assert verify_password("wrong_password", hashed) is False

def test_jwt_token_creation_and_decode():
    user_id = str(uuid.uuid4())
    username = "test_engineer"
    role = "ENGINEER"
    
    token = create_access_token(data={"sub": user_id, "username": username, "role": role})
    assert isinstance(token, str)
    
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload.get("sub") == user_id
    assert payload.get("username") == username
    assert payload.get("role") == role
    assert "exp" in payload
