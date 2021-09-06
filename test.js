const io = require("./socket")

exports.socketClient = () => {
    // console.log("client id is: ",io.getClient());
    io.getClient().join("new-test-room")
}