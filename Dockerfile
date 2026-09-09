#  Stage 1 — Build the React frontend
FROM node:20-alpine AS frontend-build

WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

COPY frontend/ .
RUN npm run build


#  Stage 2 — Build the Spring Boot backend
FROM eclipse-temurin:21-jdk-alpine AS backend-build

WORKDIR /backend

# Copy Maven wrapper and POM first (dependency layer caching)
COPY backend/stock-screener/mvnw .
COPY backend/stock-screener/.mvn .mvn
COPY backend/stock-screener/pom.xml .

RUN chmod +x mvnw
RUN ./mvnw dependency:go-offline -B

# Copy source and build
COPY backend/stock-screener/src src
RUN ./mvnw package -DskipTests -B \
    && mv target/*.jar target/app.jar


#  Stage 3 — Runtime (Nginx + Java in one container)
FROM eclipse-temurin:21-jre-alpine AS runtime

# Install Nginx and Supervisor (to run both processes)
RUN apk add --no-cache nginx supervisor curl

# Set up Nginx
# Remove default nginx config
RUN rm -rf /etc/nginx/http.d/default.conf

# Copy built React app into Nginx's serve directory
COPY --from=frontend-build /frontend/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/http.d/screener.conf

# Set up Spring Boot
WORKDIR /app

# Add a non-root-capable app user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy the built JAR
COPY --from=backend-build /backend/target/app.jar app.jar

# ── Supervisor config (runs both Nginx + Java) ────────────
COPY supervisord.conf /etc/supervisord.conf

# Permissions 
RUN mkdir -p /var/log/supervisor /var/lib/nginx/tmp \
    && chown -R appuser:appgroup /app /var/log/supervisor \
    && chown -R appuser:appgroup /usr/share/nginx/html \
    && chown -R appuser:appgroup /var/lib/nginx \
    && chown -R appuser:appgroup /var/log/nginx \
    && chown -R appuser:appgroup /run/nginx || true

EXPOSE 80

ENV JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseG1GC -XX:+UseContainerSupport"

# Supervisor runs as root to manage both processes
CMD ["supervisord", "-c", "/etc/supervisord.conf"]

