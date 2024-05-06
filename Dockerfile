FROM node:16.18.0-alpine

RUN mkdir -p /usr/src/api-dir && chown -R node:node /usr/src/api-dir

WORKDIR /usr/src/api-dir

COPY package.json ./

USER node

RUN npm install

COPY --chown=node:node . .

EXPOSE 5100
