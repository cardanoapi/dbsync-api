FROM node:20-alpine AS base
WORKDIR /app

# Minimal dependencies to fix the Prisma OpenSSL warning
RUN apk add --no-cache openssl openssl-dev

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY prisma ./prisma
RUN yarn prisma generate

COPY . .
RUN yarn build
RUN cp ./swagger.yaml ./dist

# ---------- Final lightweight image ----------
FROM node:20-alpine AS production
RUN apk add --no-cache openssl

# Create a non-root user
USER node
WORKDIR /api

# Copy only what's needed for production runtime
COPY --from=base --chown=node:node /app/node_modules ./node_modules
COPY --from=base --chown=node:node /app/prisma ./prisma
COPY --from=base --chown=node:node /app/dist ./

# Set environment variables
ENV NODE_ENV=production
ENV ENABLE_TRACING=false
ENV RUST_LOG=info

# Expose app port
EXPOSE 8080

# Start the app
CMD ["node", "index.js"]    