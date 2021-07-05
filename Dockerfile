ARG node_version
FROM node:$node_version

WORKDIR /usr/app

COPY package*.json ./

RUN npm ci

COPY . .

#CMD [ "node", "bin/index.js" ]
