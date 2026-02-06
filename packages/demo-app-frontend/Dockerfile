# Stage 1: Build the application
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies (cache optimized)
COPY package.json package-lock.json* ./
# Note: If you use yarn or pnpm, copy their lockfiles instead
RUN npm ci

# Copy source code
COPY . .

# Build the application
# Ensure .env is present or variables are passed via build-args if needed for Vite
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]