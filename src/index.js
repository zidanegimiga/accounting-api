const mongoose = require('mongoose');
const http = require('http');

const app = require('./app');
const config = require('./config/config');
const logger = require('./config/logger');
const socketAPI = require('./config/socket');

let server;
global.__rootDir = __dirname;
mongoose.connect(config.mongoose.url, config.mongoose.options).then(() => {
  logger.info('Connected to MongoDB');
  server = http.createServer(app);
  const options = {
    cors: true,
    origins: ['*'],
  };
  socketAPI.io.attach(server, options);
  server.listen(config.port, () => {
    logger.info(`Listening to port ${config.port}`);
  });
});

const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      // process.exit(1);
    });
  } else {
    // process.exit(1);
  }
};

const unexpectedErrorHandler = (error) => {
  logger.error(error);
  // exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close();
  }
});
