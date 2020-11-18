FROM node:12

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY app/package.json ./
COPY app/index.js ./
CMD ["mkdir", "migrations"]
CMD ["mkdir", "refresh_matviews"]
COPY app/migrations/* migrations/
COPY app/refresh_matviews/* refresh_matviews/

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

CMD ["node","index.js"]

# CMD ["tail","-f", "/dev/null"]