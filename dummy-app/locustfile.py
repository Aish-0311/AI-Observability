"""Locust load test for the Order Management Service.

Run:
    locust -f locustfile.py --host https://<your-dummy-app-url>

Or headless:
    locust -f locustfile.py --host https://<url> --headless -u 50 -r 5 --run-time 5m
"""

import random

from locust import HttpUser, between, task

PRODUCT_IDS = ["PRD-001", "PRD-002", "PRD-003", "PRD-004", "PRD-005"]


class OrderServiceUser(HttpUser):
    """Simulates a realistic mix of read-heavy + write traffic."""

    wait_time = between(0.5, 2.0)

    def on_start(self):
        """Warm up: verify the service is healthy before running tasks."""
        self.client.get("/health")
        self.pending_orders: list[str] = []

    # ------------------------------------------------------------------
    # Read endpoints (higher weight = more frequent)
    # ------------------------------------------------------------------

    @task(5)
    def list_products(self):
        """GET /api/products — most common read operation."""
        self.client.get("/api/products", name="GET /api/products")

    @task(4)
    def get_stock(self):
        """GET /api/products/{id}/stock — inventory check."""
        pid = random.choice(PRODUCT_IDS)
        self.client.get(f"/api/products/{pid}/stock", name="GET /api/products/{id}/stock")

    @task(3)
    def get_order_status(self):
        """GET /api/orders/{id} — poll order status."""
        if self.pending_orders:
            order_id = random.choice(self.pending_orders)
            self.client.get(f"/api/orders/{order_id}", name="GET /api/orders/{id}")
        else:
            # Hit a non-existent order to exercise the 404 path
            self.client.get("/api/orders/ORD-00000", name="GET /api/orders/{id}")

    # ------------------------------------------------------------------
    # Write endpoints (lower weight — less frequent)
    # ------------------------------------------------------------------

    @task(2)
    def create_order(self):
        """POST /api/orders — simulate a customer placing an order."""
        pid = random.choice(PRODUCT_IDS)
        qty = random.randint(1, 5)
        payload = {
            "product_id": pid,
            "quantity": qty,
            "customer_email": f"test.user.{random.randint(1, 999)}@example.com",
        }
        with self.client.post(
            "/api/orders", json=payload, name="POST /api/orders", catch_response=True
        ) as resp:
            if resp.status_code == 201:
                order_id = resp.json().get("order_id")
                if order_id:
                    self.pending_orders.append(order_id)
                    if len(self.pending_orders) > 20:
                        self.pending_orders.pop(0)
            elif resp.status_code in (409, 422):
                # Stock exhausted or invalid — expected, mark success
                resp.success()

    @task(1)
    def pay_for_order(self):
        """POST /api/orders/{id}/pay — simulate payment flow."""
        if not self.pending_orders:
            return
        order_id = self.pending_orders.pop(0)
        payload = {"card_token": "tok_visa_test"}
        with self.client.post(
            f"/api/orders/{order_id}/pay",
            json=payload,
            name="POST /api/orders/{id}/pay",
            catch_response=True,
        ) as resp:
            if resp.status_code in (200, 409):
                # 409 means already paid — acceptable
                resp.success()

    @task(8)
    def health_check(self):
        self.client.get("/health")

