FROM node:18-alpine AS deps
WORKDIR /app
COPY LAUpackage.json ./package.json
RUN npm ci

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# LICENSE_SECRET is validated at module load time (src/license.ts), so it must
# be present during the build's static page-data-collection phase. Override
# with --build-arg LICENSE_SECRET=<real-secret> for production images.
ARG LICENSE_SECRET=build-time-placeholder-secret-32-chars-min
ENV LICENSE_SECRET=${LICENSE_SECRET}
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public 2>/dev/null || true
EXPOSE 3000
CMD ["node", "server.js"]
