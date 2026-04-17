FROM node:20-alpine

WORKDIR /app

# Copy package files and install production deps only
COPY package*.json ./
RUN npm install --omit=dev --prefer-offline || npm install --omit=dev

# Copy built app
COPY dist/ ./dist/

# Data file (will be seeded on first run)
COPY data.json ./

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "dist/index.cjs"]
