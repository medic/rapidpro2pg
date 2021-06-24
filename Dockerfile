ARG node_version
FROM node:$node_version

WORKDIR /usr/src

COPY package*.json ./

RUN npm ci --production

COPY . .

CMD [ "node", "bin/index.js" ]
