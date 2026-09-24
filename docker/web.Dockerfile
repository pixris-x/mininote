# ============================================================
# Mini Note Web
# Vue / Vite 构建 + Nginx 静态托管
# ============================================================


# ============================================================
# Build
# ============================================================

FROM m.daocloud.io/docker.io/library/node:22-alpine AS build

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN corepack enable

WORKDIR /app


# ------------------------------------------------------------
# Dependencies
# ------------------------------------------------------------

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile


# ------------------------------------------------------------
# Source
# ------------------------------------------------------------

COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src


# ------------------------------------------------------------
# Build
# ------------------------------------------------------------

RUN pnpm run build


# ============================================================
# Nginx
# ============================================================

FROM m.daocloud.io/docker.io/library/nginx:alpine


# ------------------------------------------------------------
# Nginx configuration
# ------------------------------------------------------------

COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 80;

    client_max_body_size 20m;

    root /usr/share/nginx/html;
    index index.html;


    # ========================================================
    # API
    # ========================================================

    location /api/ {
        proxy_pass http://api:3000;

        proxy_http_version 1.1;

        proxy_set_header Host $host;

        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }


    # ========================================================
    # Uploads
    # ========================================================

    location /uploads/ {
        proxy_pass http://api:3000;

        proxy_http_version 1.1;

        proxy_set_header Host $host;

        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }


    # ========================================================
    # Vue History Mode
    # ========================================================

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF


# ------------------------------------------------------------
# Static files
# ------------------------------------------------------------

COPY --from=build /app/dist /usr/share/nginx/html


# 防止 SVG / 静态资源出现之前 EmailCenter 那种 403 权限问题
RUN find /usr/share/nginx/html -type d -exec chmod 755 {} \; \
    && find /usr/share/nginx/html -type f -exec chmod 644 {} \;


EXPOSE 80
