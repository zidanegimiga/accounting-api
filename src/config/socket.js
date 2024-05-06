const socketIO = require('socket.io');
const logger = require('./logger');

const io = socketIO();
const socketApi = {};
// Your socket logic here

socketApi.io = io;

socketApi.io.on('connection', function (client) {
  //   console.log('client connect...', client.id);
  logger.info(`client connected ${client.id}`);

  client.on('typing', (data) => {
    io.emit(`typing_${data.userId}_${data.ticketId}`, data.typing);
  });

  client.on('message', (data) => {
    io.emit('message', data);
  });

  client.on('location', (data) => {
    io.emit('location', data);
  });

  client.on('connect', () => {
    logger.info(`on connect: ${client.id}`);
  });

  client.on('disconnect', () => {
    logger.info(`client disconnected: ${client.id}`);
    // handleDisconnect()
  });

  client.on('error', function (err) {
    logger.info(`received error from client: ${client.id}`);
    logger.error(err);
  });
});

module.exports = socketApi;
