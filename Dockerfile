FROM node:16-alpine AS builder
WORKDIR /usr/src/app

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

COPY package*.json ./
RUN npm ci
COPY tsconfig*.json ./
COPY src src
RUN npm run build

FROM node:16-alpine

# RUN apk add udev ttf-freefont chromium
RUN apk add firefox

RUN apk add --update util-linux


ENV NODE_ENV production
ENV PUPPETEER_PRODUCT firefox
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
ENV CHROMIUM_PATH /usr/bin/chromium-browser

WORKDIR /usr/src/app

COPY package*.json ./
RUN PUPPETEER_PRODUCT=firefox npm install
COPY --from=builder /usr/src/app/dist/ dist/

CMD echo $(whereis firefox)
# ENTRYPOINT [ "node", "dist/main.js" ]
