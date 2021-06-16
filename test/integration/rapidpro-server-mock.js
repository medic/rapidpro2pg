const express = require('express');

const port = process.INT_RP_PORT || 6594;
const responseQueue = {};
const requestsQueue = [];

const app = new express();
const pathPrefix = '/api/v2/';
const endpoints = ['contacts', 'messages', 'runs'];
const defaultResponse = { previous: null, next: null, results: [] };

endpoints.forEach(endpoint => {
  app.get(`${pathPrefix}${endpoint}.json`, (req, res) => {
    requestsQueue.push({ url: req.url, headers: req.headers });
    const response = responseQueue[endpoint].shift() || defaultResponse;
    if (response.error) {
      // todo mock errors better
      response.status(500);
    }

    res.json(response);
  });
});

let server;
module.exports.start = () => {
  endpoints.forEach(endpoint => responseQueue[endpoint] = []);
  requestsQueue.splice(0, requestsQueue.length);
  server = app.listen(port);
};

module.exports.stop = () => {
  server && server.close();
};

module.exports.addResponses = (endpoint, ...responses) => {
  if (!responseQueue[endpoint]) {
    throw new Error(`Incorrect endpoint ${endpoint}`);
  }
  responseQueue[endpoint].push(...responses);
};

module.exports.getRequests = () => requestsQueue;
module.exports.getBaseUrl = () => `http://localhost:${port}`;
module.exports.getUrl = (endpoint, query) => `${module.exports.getBaseUrl()}${pathPrefix}${endpoint}.json${query}`;
