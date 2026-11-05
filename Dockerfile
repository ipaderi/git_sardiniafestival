FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS build
COPY . .
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
# Prisma reads its datasource configuration while generating the client; this
# placeholder is used only during the build and is never used at runtime.
RUN DATABASE_URL=postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder AUTH_SECRET=build-placeholder npm run build

FROM dependencies AS runtime
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 3000
CMD ["sh", "-c", "npm run db:migrate:deploy && npm run start"]
