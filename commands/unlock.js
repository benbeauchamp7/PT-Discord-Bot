const fs = require('fs');
const logger = require('../logging.js');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const replies = require('../replies.js');
const CommandError = require('../commandError.js');

module.exports = {
    name: 'unlock',
    description: 'allows other users to join a voice channel',
    async execute(message) {
        
        // Elevated check
        if (message.member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {

            // Used in a temp set
            const parent = message.channel.parent;
            if (parent.name.endsWith(config['student-chan-specifier'] || chan.name.endsWith(config['sticky-chan-specifier']))) {

                // While in a matching voice channel
                let voiceChan = message.member.voice.channel;
                if (voiceChan !== null && voiceChan.parent === parent) {
                    // Add back all permissions
                    voiceChan.lockPermissions();

                    message.reply("we've unlocked the channel, anyone can join now!");
                    logger.log(`unlocked #${parent.name}`, `${message.author}`)


                } else {
                    // You must be in the corresponding voice channel
                    replies.timedReply(message, "you must be in this room's voice channel to use this command", config['bot-alert-timeout']);
                    throw new CommandError("!unlock not in VC", `${message.author}`);
                }

            } else {
                // Incorrect Channel
                replies.timedReply(message, "you can only use this in a temporary chat room", config['bot-alert-timeout']);
                throw new CommandError("!unlock wrong room", `${message.author}`);
            }

        } else {
            // Insufficent permissions
            replies.timedReply(message, "you do not have permission to use this command", config['bot-alert-timeout']);
            throw new CommandError("!unlock insufficent permissions", `${message.author}`);
        }


        return true;
    }
}