from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError
import logging
from .database import get_db
from .auth import decode_token
from . import models, schemas

# Настройка логгера
logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        username: str = payload.get("sub")
        if username is None:
            logger.warning("Token payload missing 'sub' field")
            raise credentials_exception
        token_data = schemas.TokenData(username=username)
    except JWTError:
        logger.warning("Invalid JWT token")
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.username == token_data.username).first()
    if user is None:
        logger.warning(f"User not found: {token_data.username}")
        raise credentials_exception
    
    logger.debug(f"Authenticated user: {user.username}")
    return user

async def get_current_active_user(current_user: models.User = Depends(get_current_user)):
    if not current_user.is_active:
        logger.warning(f"Inactive user attempt: {current_user.username}")
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user