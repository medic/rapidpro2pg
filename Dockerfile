ARG node_version=12
FROM node:$node_version
WORKDIR /usr/app
COPY . .
RUN npm ci
CMD ["node", "/usr/app/bin/index.js"]
