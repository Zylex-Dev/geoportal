from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import logging
from typing import Optional
from datetime import timedelta
from . import models, schemas, auth

# Настройка логгера
logger = logging.getLogger(__name__)

class UserService:
    @staticmethod
    def create_user(db: Session, user: schemas.UserCreate) -> models.User:
        """Создание нового пользователя"""
        # Проверка на существующего пользователя
        db_user = db.query(models.User).filter(
            (models.User.username == user.username) | (models.User.email == user.email)
        ).first()
        
        if db_user:
            if db_user.username == user.username:
                logger.warning(f"Registration attempt with existing username: {user.username}")
                raise HTTPException(status_code=400, detail="Username already registered")
            else:
                logger.warning(f"Registration attempt with existing email: {user.email}")
                raise HTTPException(status_code=400, detail="Email already registered")
        
        # Создание пользователя
        hashed_password = auth.get_password_hash(user.password)
        db_user = models.User(
            username=user.username,
            email=user.email,
            hashed_password=hashed_password
        )
        
        try:
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
            logger.info(f"New user registered: {user.username}")
            return db_user
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating user: {str(e)}")
            raise HTTPException(status_code=500, detail="Error creating user")

    @staticmethod
    def authenticate_user(db: Session, username: str, password: str) -> Optional[models.User]:
        """Аутентификация пользователя"""
        user = db.query(models.User).filter(models.User.username == username).first()
        
        if not user or not auth.verify_password(password, user.hashed_password):
            logger.warning(f"Failed login attempt for username: {username}")
            return None
        
        logger.info(f"User authenticated: {username}")
        return user

    @staticmethod
    def create_user_token(user: models.User, expires_delta: Optional[timedelta] = None) -> schemas.Token:
        """Создание токена для пользователя"""
        data = {"sub": user.username}
        access_token = auth.create_access_token(data=data, expires_delta=expires_delta)
        return schemas.Token(access_token=access_token, token_type="bearer") 