module.exports = {
    timedReply: function(message, response, time) {
        message.reply(response).then(reply => {
            reply.delete({'timeout': time});
            message.delete({'timeout': time});
        });
    },

    timedMessage: function(message, response, time) {
        message.channel.send(response).then(reply => {
            reply.delete({'timeout': time});
            message.delete({'timeout': time});
        });
    }

}
