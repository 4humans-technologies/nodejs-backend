const EventEmmiter = require("events")
const NotificationHolder = require("../../models/globals/notifications")
const io = require("../../socket")

class NotificationEmmiter extends EventEmmiter {
  /**
   * will later add more events with different signatures
   */
  newModelNotification(subEvent, modelId, data) {
    this.emit("new-notification", subEvent, modelId, data)
  }

  newViewerNotification(subEvent, viewerId, data) {
    this.emit("new-notification", data)
  }
}
const Notifier = new NotificationEmmiter()

Notifier.on("new-notification", (subEvent, modelId, data) => {
  switch (subEvent) {
    case "viewer-follow":
      {
        const dataToSave = {
          message: `${data.viewer.name} followed you`,
          tag: subEvent,
          data: JSON.stringify(data),
        }
        NotificationHolder.updateOne(
          {
            _id: modelId,
          },
          {
            $push: { notifications: dataToSave },
          }
        )
          .then(() => {
            io.getIO()
              .in(`${modelId}-private`)
              .emit("new-notification", "viewer-follow", dataToSave)
          })
          .catch(() => console.log("Notification error"))
      }
      break
    case "viewer-coins-gift":
      {
        const dataToSave = {
          message: `${data.viewer.name} tipped you ${data.amount} coins`,
          tag: subEvent,
          data: JSON.stringify(data),
        }
        NotificationHolder.updateOne(
          {
            _id: modelId,
          },
          {
            $push: { notifications: dataToSave },
          }
        )
          .then(() => {
            io.getIO()
              .in(`${modelId}-private`)
              .emit("new-notification", "viewer-follow", dataToSave)
          })
          .catch(() => console.log("Notification error"))
      }
      break
    case "video-album-purchase" || "image-album-purchase":
      {
        const dataToSave = {
          message: `${data.viewer.name} purchased your ${data.album.name} ${
            subEvent === "image-album-purchase" ? "image" : "video"
          } album for ${data.albumCost} coins`,
          tag: subEvent,
          data: JSON.stringify(data),
        }
        NotificationHolder.updateOne(
          {
            _id: modelId,
          },
          {
            $push: { notifications: dataToSave },
          }
        )
          .then(() => {
            io.getIO()
              .in(`${modelId}-private`)
              .emit("new-notification", subEvent, dataToSave)
          })
          .catch(() => console.log("Notification error"))
      }
      break
  }
})

/* 
    {
      msg:"",
      time:"",
      viewed:"",
      tag:""
    }
*/

module.exports = Notifier
