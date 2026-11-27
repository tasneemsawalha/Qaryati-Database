# Disposable benchmark image. Never use this Dockerfile for production.
FROM node:24-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
ARG BENCHMARK_STAGE=before
RUN QARYATI_BENCHMARK_BUILD=1 node performance/prepare-image.cjs "$BENCHMARK_STAGE"
RUN npx prisma generate && npm run build
RUN chown -R node:node /app
USER node
ENV NODE_ENV=production
CMD ["node", "dist/main.js"]
