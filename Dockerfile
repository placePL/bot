FROM node:16-alpine AS builder
WORKDIR /usr/src/app

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

COPY package*.json ./
RUN npm ci
COPY tsconfig*.json ./
COPY src src
RUN npm run build

FROM node:16-alpine

RUN apk install -y gconf-service libasound2 libatk1.0-0 libatk-bridge2.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
# RUN apk add udev ttf-freefont chromium
RUN apk add firefox

# RUN apk add --update util-linux


ENV NODE_ENV production
ENV PUPPETEER_PRODUCT firefox
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
ENV CHROMIUM_PATH /usr/bin/firefox

WORKDIR /usr/src/app

COPY package*.json ./
RUN PUPPETEER_PRODUCT=firefox npm install
COPY --from=builder /usr/src/app/dist/ dist/

# CMD echo $(whereis firefox)
ENTRYPOINT [ "node", "dist/main.js" ]
