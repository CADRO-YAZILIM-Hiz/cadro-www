import smtplib
import os
from email.message import EmailMessage
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings # .env ayarlarını buradan aldığını varsayıyoruz

class EmailService:
    @staticmethod
    def _mask_email(to_email: str) -> str:
        if not to_email or "@" not in to_email:
            return "***"
        local_part, domain = to_email.split("@", 1)
        if len(local_part) <= 2:
            masked_local = f"{local_part[:1]}***"
        else:
            masked_local = f"{local_part[:2]}***"
        return f"{masked_local}@{domain}"

    @classmethod
    def _log_delivery_event(cls, status: str, to_email: str, subject: str, error: str | None = None):
        masked_email = cls._mask_email(to_email)
        message = f"[EMAIL {status}] to={masked_email} subject={subject}"
        if error:
            message += f" error={error}"
        print(message)

    @staticmethod
    def _get_from_header() -> str:
        return f"{settings.MAIL_FROM_NAME} <{settings.SMTP_USER}>"

    @staticmethod
    def _open_smtp_connection():
        encryption = str(getattr(settings, "SMTP_ENCRYPTION", "ssl") or "ssl").lower()

        if encryption == "ssl":
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
            if encryption in {"tls", "starttls"}:
                server.starttls()

        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        return server

    @staticmethod
    def _operational_email_enabled() -> bool:
        return os.getenv("ENABLE_OPERATIONAL_EMAILS", "0") == "1"

    @staticmethod
    def _should_log_to_terminal(to_email: str) -> bool:
        """
        Sadece açıkça debug modu açıldıysa maili terminale düşürüyoruz.
        """
        return os.getenv("EMAIL_DEBUG_TO_TERMINAL", "0") == "1"

    @staticmethod
    def _log_email_to_terminal(to_email: str, subject: str, body_html: str):
        print("\n" + "=" * 72)
        print("DEMO EMAIL / TERMINAL MODE")
        print(f"TO: {to_email}")
        print(f"SUBJECT: {subject}")
        print("BODY:")
        print(body_html)
        print("=" * 72 + "\n")
        return True

    @staticmethod
    def _log_email_with_attachments_to_terminal(to_email: str, subject: str, body_html: str, attachments):
        print("\n" + "=" * 72)
        print("DEMO EMAIL / TERMINAL MODE")
        print(f"TO: {to_email}")
        print(f"SUBJECT: {subject}")
        print("ATTACHMENTS:")
        for item in attachments or []:
            print(f"- {item.get('filename')} ({item.get('content_type')}, {len(item.get('content', b''))} bytes)")
        print("BODY:")
        print(body_html)
        print("=" * 72 + "\n")
        return True

    @staticmethod
    def send_email(to_email: str, subject: str, body_html: str):
        # Header injection koruması
        subject = subject.replace('\n', ' ').replace('\r', ' ')
        
        if EmailService._should_log_to_terminal(to_email):
            return EmailService._log_email_to_terminal(to_email, subject, body_html)
        
        msg = MIMEMultipart()
        msg['From'] = EmailService._get_from_header()
        msg['To'] = to_email
        msg['Subject'] = subject

        msg.attach(MIMEText(body_html, 'html'))

        try:
            with EmailService._open_smtp_connection() as server:
                server.send_message(msg)
            EmailService._log_delivery_event("SENT", to_email, subject)
            return True
        except Exception as e:
            EmailService._log_delivery_event("FAILED", to_email, subject, str(e))
            return False

    @staticmethod
    def send_email_with_attachments(to_email: str, subject: str, body_html: str, attachments=None):
        attachments = attachments or []

        if EmailService._should_log_to_terminal(to_email):
            return EmailService._log_email_with_attachments_to_terminal(to_email, subject, body_html, attachments)

        msg = EmailMessage()
        msg['From'] = EmailService._get_from_header()
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.set_content("Bu e-posta HTML içerik ve ek dosyalar içerir.")
        msg.add_alternative(body_html, subtype='html')

        for attachment in attachments:
            filename = attachment.get('filename') or 'attachment'
            content_type = attachment.get('content_type') or 'application/octet-stream'
            content = attachment.get('content') or b''
            maintype, _, subtype = content_type.partition('/')
            maintype = maintype or 'application'
            subtype = subtype or 'octet-stream'
            msg.add_attachment(content, maintype=maintype, subtype=subtype, filename=filename)

        try:
            with EmailService._open_smtp_connection() as server:
                server.send_message(msg)
            EmailService._log_delivery_event("SENT", to_email, subject)
            return True
        except Exception as e:
            EmailService._log_delivery_event("FAILED", to_email, subject, str(e))
            return False

    @classmethod
    def send_operational_email(cls, to_email: str, subject: str, body_html: str):
        if not cls._operational_email_enabled():
            cls._log_delivery_event("SKIPPED", to_email, subject)
            return False
        return cls.send_email(to_email, subject, body_html)

    @classmethod
    def send_otp_email(cls, to_email: str, otp_code: str):
        subject = f"{otp_code} - CADRO Giriş Doğrulama Kodu"
        body = f"""
        <html>
            <body style="font-family: sans-serif;">
                <h2 style="color: #4f46e5;">Giriş Doğrulama</h2>
                <p>Merhaba,</p>
                <p>CADRO sistemine giriş yapabilmek için aşağıdaki doğrulama kodunu kullanın:</p>
                <h1 style="background: #f3f4f6; padding: 10px; text-align: center; letter-spacing: 5px;">{otp_code}</h1>
                <p>Bu kod 10 dakika süreyle geçerlidir. Eğer bu işlemi siz yapmadıysanız lütfen şifrenizi değiştirin.</p>
                <br>
                <p>İyi çalışmalar,<br>CADRO Güvenlik Ekibi</p>
            </body>
        </html>
        """
        return cls.send_email(to_email, subject, body)

    @classmethod
    def send_password_reset_email(cls, to_email: str, otp_code: str, action_url: str | None = None, action_label: str | None = None):
        subject = "CADRO Şifre Sıfırlama Talebi"
        cta_block = ""
        if action_url:
            cta_block = f"""
                <p style="margin-top: 20px;">Şifre belirleme ekranına doğrudan gitmek için aşağıdaki bağlantıyı kullanabilirsiniz:</p>
                <p style="margin: 16px 0;">
                    <a href="{action_url}" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 10px; font-weight: 700;">
                        {action_label or 'Şifre Belirleme Ekranını Aç'}
                    </a>
                </p>
                <p style="font-size: 12px; color: #64748b;">Buton çalışmazsa bu bağlantıyı tarayıcıya yapıştırın:<br>{action_url}</p>
            """
        body = f"""
        <html>
            <body>
                <h2 style="color: #ef4444;">Şifre Sıfırlama</h2>
                <p>Şifrenizi sıfırlamak için geçici kodunuz:</p>
                <h1 style="background: #fef2f2; padding: 10px; text-align: center;">{otp_code}</h1>
                <p>Sisteme bu kodla giriş yaptıktan sonra şifrenizi değiştirmeniz zorunludur.</p>
                {cta_block}
            </body>
        </html>
        """
        return cls.send_email(to_email, subject, body)

    @classmethod
    def send_email_change_code(cls, to_email: str, otp_code: str):
        subject = "CADRO E-posta Değişiklik Onayı"
        body = f"""
        <html>
            <body>
                <h2>E-posta Doğrulama</h2>
                <p>Yeni e-posta adresinizi onaylamak için kodunuz:</p>
                <h1 style="background: #ecfdf5; padding: 10px; text-align: center;">{otp_code}</h1>
            </body>
        </html>
        """
        return cls.send_email(to_email, subject, body)
