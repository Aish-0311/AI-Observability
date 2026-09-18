namespace AiObservability.Api.Data;

using Models;

public static class SeedServices
{
    public static ServicesData Get() => new(
        Nodes: [
            new("web-frontend", "Web Frontend", ServiceNodeType.frontend, NodeHealth.healthy, 3, "React SPA served via Azure CDN", "React / Azure CDN", 3, 0),
            new("api-gateway", "API Gateway", ServiceNodeType.api, NodeHealth.degraded, 4, "Kong API gateway — rate limiting, auth, routing", "Kong / AKS", 3, 1),
            new("checkout-api", "Checkout API", ServiceNodeType.service, NodeHealth.incident, 8, "Handles checkout flow and order creation", ".NET 8 / AKS", 1, 2),
            new("auth-service", "Auth Service", ServiceNodeType.service, NodeHealth.healthy, 6, "JWT issuance and validation", ".NET 8 / AKS", 3, 2),
            new("notification-service", "Notification", ServiceNodeType.service, NodeHealth.healthy, 3, "Email and push notification delivery", "Node.js / AKS", 5, 2),
            new("payment-gateway", "Payment Gateway", ServiceNodeType.service, NodeHealth.incident, 7, "Stripe integration — charge and refund processing", ".NET 8 / AKS", 0, 3),
            new("order-processor", "Order Processor", ServiceNodeType.service, NodeHealth.degraded, 5, "Kafka consumer — order fulfilment pipeline", "Java 21 / AKS", 2, 3),
            new("users-db", "Users DB", ServiceNodeType.database, NodeHealth.healthy, 2, "Azure SQL — user accounts and sessions", "Azure SQL / Gen5", 3, 4),
            new("orders-db", "Orders DB", ServiceNodeType.database, NodeHealth.degraded, 3, "Azure SQL — orders and transactions", "Azure SQL / Gen5", 1, 4),
            new("redis-cache", "Redis Cache", ServiceNodeType.cache, NodeHealth.healthy, 3, "Session cache, rate limiting counters", "Azure Cache for Redis", 5, 4),
            new("kafka", "Kafka", ServiceNodeType.queue, NodeHealth.degraded, 2, "Event streaming — orders, audit, notifications", "Azure Event Hub / Kafka API", 2, 5),
            new("aiopsstorage", "Blob Storage", ServiceNodeType.storage, NodeHealth.healthy, 1, "Static assets, reports, log archives", "Azure Blob Storage", 4, 5),
            new("stripe", "Stripe (external)", ServiceNodeType.external, NodeHealth.unknown, 0, "Third-party payment processor", "Stripe API", 0, 5),
        ],
        Edges: [
            new("web-frontend", "api-gateway"),
            new("api-gateway", "checkout-api"),
            new("api-gateway", "auth-service"),
            new("api-gateway", "notification-service"),
            new("checkout-api", "payment-gateway"),
            new("checkout-api", "order-processor", "Kafka"),
            new("auth-service", "users-db"),
            new("auth-service", "redis-cache", "session"),
            new("order-processor", "orders-db"),
            new("order-processor", "kafka"),
            new("payment-gateway", "stripe"),
            new("payment-gateway", "orders-db"),
            new("notification-service", "kafka", "consume"),
            new("notification-service", "aiopsstorage", "templates"),
        ]
    );
}
