FROM node:24-alpine

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    bash \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ttf-freefont \
    ttf-dejavu \
    font-noto \
    font-noto-cjk \
    font-liberation \
    libc6-compat \
    libstdc++ \
    libgcc \
    libx11 \
    libxcomposite \
    libxdamage \
    libxext \
    libxfixes \
    libxrandr \
    ca-certificates \
    curl \
  && npm install -g pnpm@9

WORKDIR /app

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    CHROME_PATH=/usr/bin/chromium-browser \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN pnpm install --frozen-lockfile --prod || pnpm install --prod

COPY . .

RUN mkdir -p \
    logs \
    data \
    data/server_bots \
    data/fonts \
    config \
    config/default_config \
    config/pm2 \
    resources \
    renderers/playwright \
    renderers/puppeteer

ENV NODE_ENV=production \
    DISABLE_CONSOLE=true \
    USE_FILE_LOG=true \
    DEBUG=false \
    XRK_SERVER_PORT=3000 \
    NODE_OPTIONS="--no-warnings --no-deprecation --max-old-space-size=1024"

EXPOSE 3000-3100

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${XRK_SERVER_PORT:-3000}/health" || exit 1

CMD ["sh", "-c", "exec node $NODE_OPTIONS app.js server ${XRK_SERVER_PORT:-3000}"]
