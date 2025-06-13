from functools import lru_cache
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    auth0_domain: str = os.getenv("AUTH0_DOMAIN", None)
    auth0_api_audience: str = os.getenv("AUTH0_API_AUDIENCE", None)
    auth0_issuer: str = os.getenv("AUTH0_ISSUER", None)
    auth0_algorithms: str = os.getenv("AUTH0_ALGORITHMS", "RS256")


@lru_cache()
def get_settings():
    return Settings()