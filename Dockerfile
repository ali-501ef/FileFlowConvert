FROM node:20-bullseye as deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-bullseye as builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-bullseye-slim as runner
WORKDIR /app

# Install native tooling for server-side converters
RUN apt-get update && apt-get install -y --no-install-recommends \
    imagemagick ghostscript poppler-utils ffmpeg \
    libvips libvips-dev libheif-examples libheif-dev \
    libpng-dev libjpeg-dev fonts-dejavu-core \
    python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Relax ImageMagick PDF policy
RUN printf '<?xml version="1.0" encoding="UTF-8"?>\n<policymap>\n  <policy domain="coder" rights="read|write" pattern="PDF" />\n  <policy domain="coder" rights="read|write" pattern="PS" />\n  <policy domain="coder" rights="read|write" pattern="EPS" />\n</policymap>\n' > /etc/ImageMagick-6/policy.xml || true

# Create non-root user
RUN useradd -m appuser

# Create directories with proper permissions
RUN mkdir -p /app/uploads /app/output && chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

ENV NODE_ENV=production
COPY --from=builder --chown=appuser:appuser /app/dist ./dist
COPY --from=deps --chown=appuser:appuser /app/node_modules ./node_modules
COPY --chown=appuser:appuser package.json ./
COPY --chown=appuser:appuser server/*.py ./server/

# Render sets PORT; do not hardcode EXPOSE
CMD ["node", "dist/index.js"]