const fs = require('fs');
const logger = require('../logging.js');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));

function timedReply(message, response, time) {
    message.reply(response).then(reply => {
        reply.delete({'timeout': time});
        message.delete({'timeout': time});
    });
}

module.exports = {
    name: 'unlock',
    description: 'allows other users to join a voice channel',
    async execute(message) {
        
        // Elevated check
        if (message.member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {

            // Used in a temp set
            const parent = message.channel.parent;
            if (parent.name.endsWith(config['student-chan-specifier'])) {

                // While in a matching voice channel
                let voiceChan = message.member.voice.channel;
                if (voiceChan !== null && voiceChan.parent === parent) {
                    // Add back all permissions
                    voiceChan.lockPermissions();

                    message.reply("we've unlocked the channel, anyone can join now!");


                } else {
                    // You must be in the corresponding voice channel
                    timedReply(message, "you must be in this room's voice channel to use this command", config['bot-alert-timeout']);
                    return false;
                }

            } else {
                // Incorrect Channel
                timedReply(message, "you can only use this in a temporary chat room", config['bot-alert-timeout']);
                return false;
            }

        } else {
            // Insufficent permissions
            timedReply(message, "you do not have permission to use this command", config['bot-alert-timeout']);
            return false;
        }


        return true;
    }
}