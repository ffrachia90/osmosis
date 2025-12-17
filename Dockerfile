# Multi-stage build for Osmosis
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled code from builder
COPY --from=builder /app/dist ./dist

# Copy necessary files
COPY .cursor ./.cursor

# Create volume for project data
VOLUME ["/workspace"]

# Expose MCP server port (optional, for HTTP mode)
EXPOSE 3000

# Default command (CLI)
ENTRYPOINT ["node", "dist/cli.js"]
CMD ["--help"]


