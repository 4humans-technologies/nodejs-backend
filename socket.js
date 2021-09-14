let io;
let clientSocket;
let clientId;
module.exports = {
    init: (serverInstance, options = null) => {
        io = require('socket.io')(serverInstance, options)
        return io
    },
    getIO: () => {
        if (!io) {
            throw new Error('socket.io is not initialized!')
        }
        return io
    },
    setClientSocket:(client) => {
        clientSocket = client
        clientId = client.id
    },
    getClient: () => {
        if (!clientSocket) {
            throw new Error('socket.io is not initialized!')
        }
        return clientSocket
    },
    clientId:clientId
}
