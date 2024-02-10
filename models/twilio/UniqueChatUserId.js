const mongoose = require("mongoose");


const UniqueChatIdSchema = new mongoose.Schema({
    /**
     * dis allot via socket disconnection event
     * and also with isAvailable and updatedAt > 10 hours
     */
    isAvailable: {
        type: Boolean,
        default: true,
        required: true
    },
    numUsersServed: {
        type: Number,
        default: 1
    }
}, { timestamps: true })

const UniqueChatId = mongoose.model("UniqueChatId", UniqueChatIdSchema)

module.exports = UniqueChatId