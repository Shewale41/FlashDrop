
FROM node:24-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY src ./src

ENV NODE_ENV=development

EXPOSE 3000

CMD ["node", "src/server.ts"]
