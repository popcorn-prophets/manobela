from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application
    app_name: str = "Manobela API"
    environment: str = "development"

    # CORS
    cors_allow_origins: list[str] = ["*"]

    # WebRTC
    metered_domain: str = ""
    metered_secret_key: str = ""
    metered_credentials_api_key: str = ""
    max_webrtc_connections: int = 25

    # Video processing
    target_fps: int = 15

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )


settings = Settings()
