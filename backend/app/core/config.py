import os


class Settings:
    DATABASE_URL = os.getenv("DATABASE_URL")
    SECRET_KEY = os.getenv("SECRET_KEY")
    ALGORITHM = "HS256"

    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.hostinger.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", 465))
    SMTP_ENCRYPTION = os.getenv("SMTP_ENCRYPTION", "ssl").lower()
    SMTP_USER = os.getenv("SMTP_USER", "info@cadro.io")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    MAIL_FROM_NAME = os.getenv("MAIL_FROM_NAME", "CADRO")

    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

    # ==============================================================
    # 🤖 HR AI AGENT (Bağımsız mikroservis)
    # Cadro backend bu servisi HTTP ile çağırır.
    # Yerel geliştirme: http://localhost:8001
    # Production: http://127.0.0.1:8001 (aynı VPS, Nginx proxy değil)
    # ==============================================================
    HR_AGENT_URL = os.getenv("HR_AGENT_URL", "http://localhost:8001")
    HR_AGENT_SECRET = os.getenv("HR_AGENT_SECRET", "")  # X-Agent-Secret header değeri

    # ==============================================================
    # 💳 PADDLE BİLLİNG AYARLARI
    # PADDLE_ENV: live | sandbox
    # ==============================================================
    PADDLE_API_KEY = os.getenv("PADDLE_API_KEY", "")
    PADDLE_CLIENT_SIDE_TOKEN = os.getenv("PADDLE_CLIENT_SIDE_TOKEN", "")
    PADDLE_WEBHOOK_SECRET = os.getenv("PADDLE_WEBHOOK_SECRET", "")
    PADDLE_ENV = os.getenv("PADDLE_ENV", "sandbox")

    PADDLE_PRICE_BASIC_MONTHLY = os.getenv("PADDLE_PRICE_BASIC_MONTHLY", "")
    PADDLE_PRICE_BASIC_YEARLY = os.getenv("PADDLE_PRICE_BASIC_YEARLY", "")
    PADDLE_PRICE_PRO_MONTHLY = os.getenv("PADDLE_PRICE_PRO_MONTHLY", "")
    PADDLE_PRICE_PRO_YEARLY = os.getenv("PADDLE_PRICE_PRO_YEARLY", "")
    PADDLE_PRICE_ENTERPRISE_MONTHLY = os.getenv("PADDLE_PRICE_ENTERPRISE_MONTHLY", "")
    PADDLE_PRICE_ENTERPRISE_YEARLY = os.getenv("PADDLE_PRICE_ENTERPRISE_YEARLY", "")

    APP_BASE_URL = os.getenv("APP_BASE_URL", "https://app.cadro.io")
    API_BASE_URL = os.getenv("API_BASE_URL", "https://api.cadro.io")
    MARKETING_BASE_URL = os.getenv("MARKETING_BASE_URL", "https://www.cadro.io")


settings = Settings()
