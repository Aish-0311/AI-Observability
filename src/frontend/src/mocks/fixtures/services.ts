export type NodeHealth = 'healthy' | 'degraded' | 'incident' | 'unknown';
export interface ServiceNode { id: string; label: string; type: 'frontend' | 'api' | 'service' | 'database' | 'queue' | 'cache' | 'storage' | 'external'; health: NodeHealth; incident_count: number; description: string; tech_stack: string; col: number; row: number; }
export interface ServiceEdge { from: string; to: string; label?: string; }
export interface ServicesData { nodes: ServiceNode[]; edges: ServiceEdge[]; }

export const servicesData: ServicesData = {
  nodes: [
    { id: 'web-frontend',         label: 'Web Frontend',      type: 'frontend',  health: 'healthy',  incident_count: 3, description: 'React SPA served via Azure CDN',                  tech_stack: 'React / Azure CDN',          col: 3, row: 0 },
    { id: 'api-gateway',          label: 'API Gateway',       type: 'api',       health: 'degraded', incident_count: 4, description: 'Kong API gateway — rate limiting, auth, routing',  tech_stack: 'Kong / AKS',                 col: 3, row: 1 },
    { id: 'checkout-api',         label: 'Checkout API',      type: 'service',   health: 'incident', incident_count: 8, description: 'Handles checkout flow and order creation',         tech_stack: '.NET 8 / AKS',               col: 1, row: 2 },
    { id: 'auth-service',         label: 'Auth Service',      type: 'service',   health: 'healthy',  incident_count: 6, description: 'JWT issuance and validation',                      tech_stack: '.NET 8 / AKS',               col: 3, row: 2 },
    { id: 'notification-service', label: 'Notification',      type: 'service',   health: 'healthy',  incident_count: 3, description: 'Email and push notification delivery',             tech_stack: 'Node.js / AKS',              col: 5, row: 2 },
    { id: 'payment-gateway',      label: 'Payment Gateway',   type: 'service',   health: 'incident', incident_count: 7, description: 'Stripe integration — charge and refund processing', tech_stack: '.NET 8 / AKS',               col: 0, row: 3 },
    { id: 'order-processor',      label: 'Order Processor',   type: 'service',   health: 'degraded', incident_count: 5, description: 'Kafka consumer — order fulfilment pipeline',       tech_stack: 'Java 21 / AKS',              col: 2, row: 3 },
    { id: 'users-db',             label: 'Users DB',          type: 'database',  health: 'healthy',  incident_count: 2, description: 'Azure SQL — user accounts and sessions',           tech_stack: 'Azure SQL / Gen5',           col: 3, row: 4 },
    { id: 'orders-db',            label: 'Orders DB',         type: 'database',  health: 'degraded', incident_count: 3, description: 'Azure SQL — orders and transactions',              tech_stack: 'Azure SQL / Gen5',           col: 1, row: 4 },
    { id: 'redis-cache',          label: 'Redis Cache',       type: 'cache',     health: 'healthy',  incident_count: 3, description: 'Session cache, rate limiting counters',            tech_stack: 'Azure Cache for Redis',      col: 5, row: 4 },
    { id: 'kafka',                label: 'Kafka',             type: 'queue',     health: 'degraded', incident_count: 2, description: 'Event streaming — orders, audit, notifications',   tech_stack: 'Azure Event Hub / Kafka API', col: 2, row: 5 },
    { id: 'aiopsstorage',         label: 'Blob Storage',      type: 'storage',   health: 'healthy',  incident_count: 1, description: 'Static assets, reports, log archives',            tech_stack: 'Azure Blob Storage',         col: 4, row: 5 },
    { id: 'stripe',               label: 'Stripe (external)', type: 'external',  health: 'unknown',  incident_count: 0, description: 'Third-party payment processor',                    tech_stack: 'Stripe API',                 col: 0, row: 5 },
  ],
  edges: [
    { from: 'web-frontend',         to: 'api-gateway' },
    { from: 'api-gateway',          to: 'checkout-api' },
    { from: 'api-gateway',          to: 'auth-service' },
    { from: 'api-gateway',          to: 'notification-service' },
    { from: 'checkout-api',         to: 'payment-gateway' },
    { from: 'checkout-api',         to: 'order-processor', label: 'Kafka' },
    { from: 'auth-service',         to: 'users-db' },
    { from: 'auth-service',         to: 'redis-cache', label: 'session' },
    { from: 'order-processor',      to: 'orders-db' },
    { from: 'order-processor',      to: 'kafka' },
    { from: 'payment-gateway',      to: 'stripe' },
    { from: 'payment-gateway',      to: 'orders-db' },
    { from: 'notification-service', to: 'kafka', label: 'consume' },
    { from: 'notification-service', to: 'aiopsstorage', label: 'templates' },
  ],
};
