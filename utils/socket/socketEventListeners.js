const socketEvents = require("./socketEvents")
const io = require("../../socket");
module.exports = (client) => {
    // get room size by :io.of("/yourNameSpace").adapter.rooms.get(roomId) 
    // get all rooms io.sockets.adapter.rooms

    // global listeners everybody will listen to
    client.on("disconnect", () => {
        console.log(`${client.id} disconnected`);
    })

    // leave the room on clients demand
    client.on(socketEvents.leaveChannel, ({ room }) => {
        client.leave(room)
    })

    client.on(socketEvents.viewerLeft, () => {
        var rooms = sockets.rooms
        for (var room in rooms) {
            client.leave(room);
        }
    })

    if (client.userType === "UnAuthedViewer" || client.userType === "Viewer") {
        client.on(socketEvents.viewerJoined, ({ streamId, username }) => {
            client.join(`${streamId}-public`)
            const size = io.getIO().of("/").adapter.rooms.get(streamId).size
            io.getIO().to(streamId).emit(socketEvents.viewerJoined, { /* no username for unauthed user */username, userCount: size })
        })
    }

    if (client.userType === "UnAuthedViewer" || client.userType === "Viewer") {
        client.on(socketEvents.viewerLeft, ({ streamId, username }) => {
            client.leave(`${streamId}-public`)
            const size = io.getIO().of("/").adapter.rooms.get(streamId).size
            io.getIO().to(streamId).emit(socketEvents.viewerLeft, { /* no username for unauthed user */username, userCount: size })
        })
    }


    // conditional socket listeners
    if (client.userType === "viewer") {
        client.on(socketEvents.modelAcceptedVideoCall, ({ streamId, modelId, viewerId, callId }) => {
            io.getIO().to(streamId).emit(socketEvents.modelAcceptedVideoCall, { streamId, modelId, viewerId, callId })
        })

        client.on(socketEvents.modelAcceptedAudioCall, ({ streamId, modelId, viewerId, callId }) => {
            io.getIO().to(streamId).emit(socketEvents.modelAcceptedAudioCall, { streamId, modelId, viewerId, callId })
        })
    }
    else if (userType === "model") {
        client.on(socketEvents.createStreamRoom, ({ streamId, jwt, callback }) => {
            // if needed verify jwt, so that only authed models can create rooms
            io.getIO().join(streamId)
            callback({
                action: "room created with the stream id",
                status: "success"
            })
        })

        client.on(socketEvents.deleteStreamRoom, ({ streamId, jwt, callback }) => {
            // if needed verify jwt, so that only authed models can create rooms
            io.getIO().leave(streamId)
            callback({
                action: "room deleted with the stream id",
                status: "success"
            })
        })

        client.on(socketEvents.modelVideoCalling, ({ userId, relatedUserId, callId, modelId, modelName }) => {
            // as the model and viewer are in same room
            //only the viewer will get the calling event
            io.to(callId).emit(socketEvents.modelVideoCalling, { callId, modelId, modelName, relatedUserId })
        })

        client.on(socketEvents.modelAudioCalling, ({ userId, relatedUserId, callId, modelId, modelName }) => {
            // as the model and viewer are in same room
            //only the viewer will get the calling event
            io.to(callId).emit(socketEvents.modelVideoCalling, { callId, modelId, modelName, relatedUserId })
        })
    }
}