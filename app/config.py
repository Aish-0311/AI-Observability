"""Application configuration loaded from environment variables."""

from __future__ import annotations

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Azure Monitor / Log Analytics
    azure_log_analytics_workspace_id: str = ""
    azure_subscription_id: str = ""

    # Azure OpenAI
    azure_openai_endpoint: str = ""
    azure_openai_deployment: str = "gpt-4o"
    azure_openai_api_version: str = "2024-12-01-preview"

    # Prometheus (optional — leave blank to skip)
    prometheus_endpoint: str = ""  # e.g. http://prometheus:9090

    # Grafana (optional — leave blank to skip)
    grafana_endpoint: str = ""  # e.g. https://grafana.example.com
    grafana_api_key: str = ""

    # GitHub
    github_token: str = ""
    github_repo: str = ""  # "owner/repo"

    # Past incidents
    past_incidents_path: str = "data/past_incidents.json"

    # App
    log_level: str = "INFO"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
