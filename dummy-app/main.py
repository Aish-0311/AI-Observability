"""Order Management Service — instrumented with Azure Monitor / Application Insights.

A realistic e-commerce microservice with 5 business endpoints.
Each endpoint has named internal helpers so that when YOU intentionally break one,
App Insights captures a rich, contextual exception that drives a meaningful RCA issue.

Fault injection hints (edit to trigger errors):
  1. _calculate_discounted_price()  — change `quantity` to `0`         → ZeroDivisionError   → POST /api/orders
  2. _fetch_stock()                 — change `STOCK[pid]` to `STOCK["x"]` → KeyError          → GET  /api/products/{id}/stock
  3. _charge_payment()              — remove `if amount <= 0` guard     → ValueError           → POST /api/orders/{id}/pay
  4. _resolve_order()               — raise RuntimeError directly       → unhandled exception  → GET  /api/orders/{id}
  5. _notify_fulfilment()           — raise ConnectionError             → dependency failure   → POST /api/orders/{id}/pay
"""

from __future__ import annotations

import asyncio
import logging
import os
import random
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from opentelemetry import trace

# ---------------------------------------------------------------------------
# Azure Monitor / Application Insights setup
# ---------------------------------------------------------------------------

CONNECTION_STRING = os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING", "")

if CONNECTION_STRING:
    from azure.monitor.opentelemetry import configure_azure_monitor
    configure_azure_monitor(connection_string=CONNECTION_STRING)

from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s [%(name)s] %(message)s")
logger = logging.getLogger("order-service")
tracer = trace.get_tracer("order-service")

# ---------------------------------------------------------------------------
# Simulated in-memory data store
# ---------------------------------------------------------------------------

PRODUCTS: dict[str, dict] = {
    "PRD-001": {"name": "Wireless Headphones",  "price": 79.99,  "category": "electronics"},
    "PRD-002": {"name": "Ergonomic Keyboard",   "price": 129.99, "category": "electronics"},
    "PRD-003": {"name": "Standing Desk Mat",    "price": 49.99,  "category": "furniture"},
    "PRD-004": {"name": "USB-C Hub 7-in-1",     "price": 39.99,  "category": "electronics"},
    "PRD-005": {"name": "Noise-Cancelling Mic", "price": 59.99,  "category": "electronics"},
}

# Stock levels per product — intentionally break by using a bad key
STOCK: dict[str, int] = {
    "PRD-001": 142,
    "PRD-002": 38,
    "PRD-003": 75,
    "PRD-004": 210,
    "PRD-005": 19,
}

ORDERS: dict[str, dict] = {}  # order_id → order dict

DISCOUNT_TIERS = {5: 0.05, 10: 0.10, 20: 0.15}  # qty threshold → discount rate

# ---------------------------------------------------------------------------
# Internal helpers — these are your fault injection targets
# ---------------------------------------------------------------------------


def _calculate_discounted_price(unit_price: float, quantity: int) -> float:
    """Apply bulk-purchase discount tiers.

    FAULT HINT: change `quantity` argument to `0` in the call site to
    trigger ZeroDivisionError with full stack trace in App Insights.
    """
    rate = 0.0
    for threshold in sorted(DISCOUNT_TIERS):
        if quantity >= threshold:
            rate = DISCOUNT_TIERS[threshold]
    base_total = unit_price * quantity
    # KEEP: divisor must never be zero
    per_unit_after_discount = base_total / quantity * (1 - rate)
    return round(per_unit_after_discount * quantity, 2)


async def _fetch_stock(product_id: str) -> int:
    """Read stock level from the simulated inventory store.

    FAULT HINT: change `STOCK[product_id]` to `STOCK["INVALID-KEY"]` to
    trigger KeyError — simulates inventory service data inconsistency.
    """
    with tracer.start_as_current_span("inventory-db-read", attributes={"product_id": product_id}):
        await asyncio.sleep(random.uniform(0.005, 0.02))
        return STOCK["INVALID-KEY"]   # ← break here


async def _charge_payment(order_id: str, amount: float) -> str:
    """Submit a charge to the simulated payment gateway.

    FAULT HINT: remove the `if amount <= 0` guard below to let a
    negative/zero amount through → ValueError raised by gateway validation.
    """
    with tracer.start_as_current_span("payment-gateway-charge", attributes={"order_id": order_id, "amount": amount}):
        await asyncio.sleep(random.uniform(0.08, 0.25))
        if amount <= 0:   # ← remove this guard to inject fault
            raise ValueError(f"Invalid charge amount {amount!r} for order {order_id}")
        return f"txn-{random.randint(100_000, 999_999)}"


async def _resolve_order(order_id: str) -> dict:
    """Load an order from the store.

    FAULT HINT: replace the body with `raise RuntimeError(f"DB connection lost: {order_id}")`
    to simulate a sudden database outage.
    """
    with tracer.start_as_current_span("order-db-read", attributes={"order_id": order_id}):
        await asyncio.sleep(random.uniform(0.005, 0.02))
        order = ORDERS.get(order_id)
        if order is None:
            raise HTTPException(status_code=404, detail=f"Order {order_id!r} not found")
        return order


async def _notify_fulfilment(order_id: str, email: str) -> None:
    """Send a fulfilment notification via the email service.

    FAULT HINT: replace the body with
    `raise ConnectionError("Email service unreachable — connection refused")` to
    simulate a downstream dependency failure.
    """
    with tracer.start_as_current_span("email-service-send", attributes={"order_id": order_id, "email": email}):
        await asyncio.sleep(random.uniform(0.02, 0.06))
        logger.info("Fulfilment notification sent for order %s to %s", order_id, email)


# ---------------------------------------------------------------------------
# Application setup
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        "Order Management Service starting — App Insights: %s",
        "connected" if CONNECTION_STRING else "NOT configured (set APPLICATIONINSIGHTS_CONNECTION_STRING)",
    )
    yield
    logger.info("Order Management Service shutting down")


app = FastAPI(
    title="Order Management Service",
    description="E-commerce order service instrumented with Azure Monitor for AI observability testing.",
    version="1.0.0",
    lifespan=lifespan,
)
FastAPIInstrumentor.instrument_app(app)


# ---------------------------------------------------------------------------
# Endpoint 1 — GET /api/products
# ---------------------------------------------------------------------------


@app.get("/api/products")
async def list_products():
    """Return the full product catalogue with current stock levels.

    Aggregates product metadata + live inventory in a single response.
    """
    with tracer.start_as_current_span("list-products"):
        result = []
        for pid, product in PRODUCTS.items():
            stock = await _fetch_stock(pid)
            result.append({**product, "product_id": pid, "stock": stock, "available": stock > 0})
        logger.info("Listed %d products", len(result))
        return {"products": result, "total": len(result)}


# ---------------------------------------------------------------------------
# Endpoint 2 — GET /api/products/{product_id}/stock
# ---------------------------------------------------------------------------


@app.get("/api/products/{product_id}/stock")
async def get_product_stock(product_id: str):
    """Return the current stock level and low-stock warning for a product."""
    if product_id not in PRODUCTS:
        raise HTTPException(status_code=404, detail=f"Product {product_id!r} not found")

    stock = await _fetch_stock(product_id)
    return {
        "product_id": product_id,
        "name": PRODUCTS[product_id]["name"],
        "stock": stock,
        "low_stock_warning": stock < 20,
    }


# ---------------------------------------------------------------------------
# Endpoint 3 — POST /api/orders  (create an order)
# ---------------------------------------------------------------------------


@app.post("/api/orders", status_code=201)
async def create_order(request: Request):
    """Create a new order, validate stock and calculate the discounted total.

    Expected body:
      { "product_id": "PRD-001", "quantity": 3, "customer_email": "user@example.com" }
    """
    body = await request.json()
    product_id: str = body.get("product_id", "")
    quantity: int = int(body.get("quantity", 1))
    email: str = body.get("customer_email", "")

    with tracer.start_as_current_span("create-order", attributes={"product_id": product_id, "quantity": quantity}):
        if product_id not in PRODUCTS:
            raise HTTPException(status_code=422, detail=f"Unknown product {product_id!r}")

        stock = await _fetch_stock(product_id)
        if stock < quantity:
            logger.warning(
                "Insufficient stock for %s: requested=%d available=%d", product_id, quantity, stock
            )
            raise HTTPException(
                status_code=409,
                detail=f"Insufficient stock for {product_id}: {stock} units available, {quantity} requested",
            )

        unit_price = PRODUCTS[product_id]["price"]
        total = _calculate_discounted_price(unit_price, quantity)   # ← break here (pass 0 as quantity)

        order_id = f"ORD-{random.randint(10_000, 99_999)}"
        ORDERS[order_id] = {
            "order_id": order_id,
            "product_id": product_id,
            "product_name": PRODUCTS[product_id]["name"],
            "quantity": quantity,
            "unit_price": unit_price,
            "total": total,
            "customer_email": email,
            "status": "pending_payment",
        }
        # Reserve stock
        STOCK[product_id] -= quantity

        logger.info("Order %s created: product=%s qty=%d total=%.2f", order_id, product_id, quantity, total)
        return ORDERS[order_id]


# ---------------------------------------------------------------------------
# Endpoint 4 — GET /api/orders/{order_id}
# ---------------------------------------------------------------------------


@app.get("/api/orders/{order_id}")
async def get_order(order_id: str):
    """Return the current state of an order."""
    order = await _resolve_order(order_id)   # ← break here (raise RuntimeError)
    return order


# ---------------------------------------------------------------------------
# Endpoint 5 — POST /api/orders/{order_id}/pay
# ---------------------------------------------------------------------------


@app.post("/api/orders/{order_id}/pay")
async def pay_for_order(order_id: str, request: Request):
    """Charge payment and fulfil the order.

    Expected body:
      { "card_token": "tok_visa_test" }
    """
    order = await _resolve_order(order_id)

    if order["status"] != "pending_payment":
        raise HTTPException(
            status_code=409,
            detail=f"Order {order_id} is already in status '{order['status']}' — cannot charge again",
        )

    with tracer.start_as_current_span("process-payment", attributes={"order_id": order_id, "total": order["total"]}):
        try:
            txn_id = await _charge_payment(order_id, order["total"])   # ← break here (remove amount guard)
        except ValueError as exc:
            logger.error("Payment validation failed for order %s: %s", order_id, exc, exc_info=True)
            raise HTTPException(status_code=422, detail=str(exc)) from exc

        order["status"] = "paid"
        order["transaction_id"] = txn_id

        await _notify_fulfilment(order_id, order["customer_email"])   # ← break here (raise ConnectionError)

        order["status"] = "fulfilled"
        logger.info("Order %s fulfilled — txn %s", order_id, txn_id)

    return {"order_id": order_id, "status": "fulfilled", "transaction_id": txn_id}


# ---------------------------------------------------------------------------
# Housekeeping
# ---------------------------------------------------------------------------


@app.get("/")
async def root():
    return {"service": "order-management-service", "version": "1.0.0", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
