# ---------------------------------------------------------------------------
# Stage 1 — Build
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

# Copy source (includes public/mockServiceWorker.js if already generated)
COPY . .

# Accept build-time env for API base URL
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Accept build-time env for Application Insights
ARG VITE_APPINSIGHTS_CONNECTION_STRING
ENV VITE_APPINSIGHTS_CONNECTION_STRING=$VITE_APPINSIGHTS_CONNECTION_STRING

# Ensure the MSW service worker is present
RUN npx msw init public/ --save

# Production build — output in /app/dist
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2 — Serve with nginx
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy the Vite build output
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx config: serve the SPA, proxy /api/* to the backend container app
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
