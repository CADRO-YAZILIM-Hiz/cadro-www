"""
Locust Load Test — cadro.io
app.cadro.io ve api.cadro.io için yük testi
"""

from locust import HttpUser, task, between


class CadroAppUser(HttpUser):
    """
    app.cadro.io ve api.cadro.io'yu test eden sanal kullanıcı.
    Her istek arasında 1-3 saniye bekler (gerçek kullanıcı davranışı).
    """

    wait_time = between(1, 3)

    # ── app.cadro.io ────────────────────────────────────────────
    @task(4)  # 4x ağırlık — ana sayfaya daha çok istek
    def app_homepage(self):
        self.client.get(
            "/",
            headers={"Host": "app.cadro.io"},
            name="APP — Ana Sayfa",
        )

    @task(3)
    def app_login_page(self):
        self.client.get(
            "/login",
            headers={"Host": "app.cadro.io"},
            name="APP — Login Sayfası",
        )

    @task(2)
    def app_static_assets(self):
        self.client.get(
            "/favicon.ico",
            headers={"Host": "app.cadro.io"},
            name="APP — Statik Dosya",
        )

    # ── api.cadro.io ────────────────────────────────────────────
    @task(3)
    def api_health(self):
        self.client.get(
            "/health",
            headers={"Host": "api.cadro.io"},
            name="API — Health Check",
        )

    @task(2)
    def api_status(self):
        self.client.get(
            "/api/status",
            headers={"Host": "api.cadro.io"},
            name="API — Status",
        )

    # ── Başlangıç ───────────────────────────────────────────────
    def on_start(self):
        """Her sanal kullanıcı başladığında bir kere çalışır."""
        print("🟢 Sanal kullanıcı başladı")