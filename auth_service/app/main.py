from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta
import logging
from . import models, schemas
from .database import engine, get_db
from .dependencies import get_current_active_user
from .services import UserService
from .config import get_settings

# Настройка логгера
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Инициализация настроек
settings = get_settings()

# Создание таблиц в БД (в продакшене лучше использовать миграции)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Auth Service",
    description="Сервис аутентификации и авторизации пользователей",
    version="1.0.0",
)

# Добавляем CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@app.post("/register", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Регистрация нового пользователя"""
    return UserService.create_user(db=db, user=user)

@app.post("/token", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Получение JWT токена для аутентифицированного пользователя"""
    user = UserService.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return UserService.create_user_token(user, expires_delta=access_token_expires)

@app.get("/users/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(get_current_active_user)):
    """Получение информации о текущем пользователе"""
    return current_user

@app.get("/users/me/items")
def read_own_items(current_user: models.User = Depends(get_current_active_user)):
    """Пример защищенного эндпоинта для пользовательских данных"""
    logger.debug(f"User {current_user.username} requested items")
    return [{"item_id": 1, "owner": current_user.username}]

@app.get("/health")
def health_check():
    """Эндпоинт для проверки работоспособности сервиса"""
    return {"status": "ok", "version": "1.0.0"}