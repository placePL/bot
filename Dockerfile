FROM node:16-alpine AS builder
WORKDIR /usr/src/app

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
ENV CHROMIUM_PATH /usr/bin/chromium-browser

COPY package*.json ./
RUN npm ci
COPY tsconfig*.json ./
COPY src src
RUN npm run build

FROM node:16-alpine

RUN apk add udev ttf-freefont chromium

ENV NODE_ENV production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
ENV CHROMIUM_PATH /usr/bin/chromium-browser

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install
COPY --from=builder /usr/src/app/dist/ dist/

ENTRYPOINT [ "node", "dist/main.js" ]
