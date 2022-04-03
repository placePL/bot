FROM node:16 AS builder
WORKDIR /usr/src/app

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
ENV CHROMIUM_PATH /usr/bin/chromium-browser

COPY package*.json ./
RUN npm ci
COPY tsconfig*.json ./
COPY src src
RUN npm run build

FROM node:16

RUN apt-get update
RUN apt-get install -y firefox

ENV NODE_ENV production
ENV PUPPETEER_PRODUCT firefox
# ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
# ENV CHROMIUM_PATH /usr/bin/chromium

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install
COPY --from=builder /usr/src/app/dist/ dist/

# CMD echo hi $(/usr/bin/chromium --version)
ENTRYPOINT [ "node", "dist/main.js" ]
