// Commonly used responses for easy access
module.exports = {
    timedReply: function(message, response, time) {
        message.reply(response).then(reply => {
            setTimeout(() => { reply.delete(); }, time);
            setTimeout(() => { message.delete(); }, time);
        });
    },

    timedMessage: function(message, response, time) {
        message.channel.send(response).then(reply => {
            setTimeout(() => { reply.delete(); }, time);
            setTimeout(() => { message.delete(); }, time);
        });
    }

}
