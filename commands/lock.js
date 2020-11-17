const fs = require('fs');
const logger = require('../logging.js');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const replies = require('../replies.js');
const CommandError = require('../commandError.js');

module.exports = {
    name: 'lock',
    description: 'prevents other users from joining a voice channel',
    async execute(message) {
        
        // Elevated check
        if (message.member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {

            // Used in a temp set
            const parent = message.channel.parent;
            if (parent.name.endsWith(config['student-chan-specifier'] || chan.name.endsWith(config['sticky-chan-specifier']))) {

                // While in a matching voice channel
                let voiceChan = message.member.voice.channel;
                if (voiceChan !== null && voiceChan.parent === parent) {
                    // Remove all permissions from everyone
                    voiceChan.updateOverwrite(voiceChan.guild.roles.everyone, {
                        VIEW_CHANNEL: true,
                        CONNECT: false,
                        SPEAK: true
                    });

                    // Set permissions for all the occupant members
                    for (fella of voiceChan.members) {
                        voiceChan.updateOverwrite(fella[1], {
                            VIEW_CHANNEL: true,
                            CONNECT: true,
                            SPEAK: true
                        });
                    }

                    // Set permissions for elevated members
                    var i = 0;
                    for (role of voiceChan.guild.roles.cache) {
                        if (config['elevated-roles'].includes(role[1].name)) {
                            voiceChan.updateOverwrite(role[1], {
                                VIEW_CHANNEL: true,
                                CONNECT: true,
                                SPEAK: true
                            });
                        }
                    }

                    message.reply("locked! Nobody new can join this voice channel (other than staff)")
                    logger.log(`locked #${parent.name}`, `${message.author}`)

                } else {
                    // You must be in the corresponding voice channel
                    replies.timedReply(message, "you must be in this room's voice channel to use this command", config['bot-alert-timeout']);
                    throw new CommandError("!lock not in VC", `${message.author}`);
                }

            } else {
                // Incorrect Channel
                replies.timedReply(message, "you can only use this in a temporary chat room", config['bot-alert-timeout']);
                throw new CommandError("!lock wrong room", `${message.author}`);
            }

        } else {
            // Insufficent permissions
            replies.timedReply(message, "you do not have permission to use this command", config['bot-alert-timeout']);
            throw new CommandError("!lock insufficent permissions", `${message.author}`);
        }


        return true;
    }
}