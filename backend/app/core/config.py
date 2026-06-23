from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    PROJECT_NAME: str = "Debatio"
    VERSION: str = "1.0.0"
    
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "debatio"
    
    REDIS_URL: str = "redis://localhost:6379"
    
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    CORS_ORIGINS: List[str] = [
        "http://192.168.1.111:3000",
        "http://192.168.1.115:3000",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "*"  # Allow all origins for mobile testing
    ]
    
    class Config:
        env_file = ".env"


settings = Settings()
