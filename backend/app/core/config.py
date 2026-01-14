from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application
    app_name: str = "Manobela Backend"
    environment: str = "development"

    # CORS
    cors_allow_origins: list[str] = ["*"]

    # WebRTC
    metered_domain: str = ""
    metered_secret_key: str = ""
    metered_credentials_api_key: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )


settings = Settings()
