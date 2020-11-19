const fs = require('fs');
const logger = require('../custom_modules/logging.js');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const replies = require('../custom_modules/replies.js');
const CommandError = require('../custom_modules/commandError.js');

module.exports = {
    name: 'superlock',
    description: 'prevents ALL other users from joining a voice channel',
    async execute(message) {
        
        // Elevated check
        if (message.member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {

            // Used in a temp set
            const parent = message.channel.parent;
            if (parent.name.endsWith(config['student-chan-specifier'] || chan.name.endsWith(config['sticky-chan-specifier']))) {

                // While in a matching voice channel
                let voiceChan = message.member.voice.channel;
                if (voiceChan !== null && voiceChan.parent === parent) {
                    voiceChan.lockPermissions().then(voiceChan => {
                        
                        // Remove all permissions from everyone
                        voiceChan.updateOverwrite(voiceChan.guild.roles.everyone, {
                            VIEW_CHANNEL: true,
                            CONNECT: false,
                            SPEAK: false
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
                            if (role[1].name === "Moderator") {
                                voiceChan.updateOverwrite(role[1], {
                                    VIEW_CHANNEL: true,
                                    CONNECT: true,
                                    SPEAK: true
                                });
                            }
                        }

                        message.reply("superlocked! Not even staff can join this channel (except for Mods)")
                        logger.log(`superlocked #${parent.name}`, `${message.author}`)
                    });

                } else {
                    // You must be in the corresponding voice channel
                    replies.timedReply(message, "you must be in this room's voice channel to use this command", config['bot-alert-timeout']);
                    throw new CommandError("!superlock not in VC", `${message.author}`);
                }

            } else {
                // Incorrect Channel
                replies.timedReply(message, "you can only use this in a temporary chat room", config['bot-alert-timeout']);
                throw new CommandError("!superlock wrong room", `${message.author}`);
            }

        } else {
            // insufficient permissions
            replies.timedReply(message, "you do not have permission to use this command", config['bot-alert-timeout']);
            throw new CommandError("!superlock insufficient permissions", `${message.author}`);
        }


        return true;
    }
}