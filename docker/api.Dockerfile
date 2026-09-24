# Mini Note 后端镜像：仅安装 backend 生产依赖，镜像内不携带任何密钥

FROM m.daocloud.io/docker.io/library/node:22-alpine

ENV NODE_ENV=production
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --prod --frozen-lockfile

COPY app.js scheduler.js ./
COPY config ./config
COPY middleware ./middleware
COPY routes ./routes
COPY scripts ./scripts
COPY utils ./utils

EXPOSE 3000

CMD ["node", "app.js"]
