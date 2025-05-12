from pydantic import BaseModel, EmailStr, Field, validator
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Имя пользователя")
    email: EmailStr = Field(..., description="Email пользователя")

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="Пароль пользователя (минимум 8 символов)")
    
    @validator('password')
    def password_strength(cls, v):
        """Проверка силы пароля"""
        if not any(c.isupper() for c in v):
            raise ValueError('Пароль должен содержать как минимум одну заглавную букву')
        if not any(c.islower() for c in v):
            raise ValueError('Пароль должен содержать как минимум одну строчную букву')
        if not any(c.isdigit() for c in v):
            raise ValueError('Пароль должен содержать как минимум одну цифру')
        return v

class UserLogin(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None