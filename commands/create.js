const fs = require('fs');
const logger = require('../custom_modules/logging.js');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const CommandError = require('../custom_modules/commandError.js');

module.exports = {
    name: 'create',
    description: 'Makes a set of discussion channels',
    async execute(message, args, options) {
        const user = options.user;
        const isAuto = options.auto;
        const cooldown = options.cooldown;
        const timeout = config['bot-alert-timeout'];
        const chan = message.channel;

        if (chan.name == 'create-room' || chan.name == 'bot-channel') {

            // Don't let user create a channel if they are on cooldown
            if (cooldown.has(user.id)) {
                const cooldownTime = config['channel-create-cooldown']
                const timeLeft = cooldownTime - (Date.now() - cooldown.get(user.id));
                message.reply(`you're on cooldown for creating rooms, try again in ${(timeLeft / 1000 + 1).toFixed(0)} seconds`).then(reply => {
                    reply.delete({'timeout': timeout});
                    message.delete({'timeout': timeout});
                });

                throw new CommandError("!create on cooldown", `${message.author}`);
            }

            // Create a category for the student picked topic
            if (args.length === 0) { args = ['Unnamed']; }
            message.guild.channels.create(args.join(' ') + " " + config['student-chan-specifier'], {'type': 'category'}).then(category => {

                // Move cat above archive
                category.setPosition(-1, {"relative": true});

                // Remove view permissions from everyone
                category.updateOverwrite(message.guild.roles.everyone, {
                    VIEW_CHANNEL: false
                });

                // Set view for "welcome role"
                category.updateOverwrite(message.guild.roles.cache.get(config['role-welcome-code']), {
                    VIEW_CHANNEL: true,
                    CONNECT: true,
                    SPEAK: true
                });

                // Create text channel
                message.guild.channels.create(args.join('-')).then(newTextChan => {
                    newTextChan.setParent(category);

                     // Remove view permissions from everyone
                    newTextChan.updateOverwrite(message.guild.roles.everyone, {
                        VIEW_CHANNEL: false
                    });

                    // Set view for "welcome role"
                    newTextChan.updateOverwrite(message.guild.roles.cache.get(config['role-welcome-code']), {
                        VIEW_CHANNEL: true,
                        CONNECT: true,
                        SPEAK: true
                    });

                    newTextChan.send(config["new-chatroom-msg"])

                    if (isAuto === undefined) {
                        message.reply(`we made your channel <#${newTextChan.id}>, click the link to join!`);
                    }
                });

                // Create voice channels
                message.guild.channels.create('Voice', {'type': 'voice'}).then(voiceChan => {
                    voiceChan.setParent(category);

                    // Remove view permissions from everyone
                    voiceChan.updateOverwrite(message.guild.roles.everyone, {
                        VIEW_CHANNEL: false
                    });

                    // Set view for "welcome role"
                    voiceChan.updateOverwrite(message.guild.roles.cache.get(config['role-welcome-code']), {
                        VIEW_CHANNEL: true,
                        CONNECT: true,
                        SPEAK: true
                    });

                    if (isAuto) {
                        user.voice.setChannel(voiceChan.id);
                    }

                }).then(voiceChan => {
                    // TODO: CYCLES
                    // message.guild.channels.create('Cycling Room', {'type': 'voice'}).then(cycleChan => {
                    //     cycleChan.setParent(category);

                    //     // Remove all permissions from everyone
                    //     cycleChan.updateOverwrite(cycleChan.guild.roles.everyone, {
                    //         VIEW_CHANNEL: false,
                    //         CONNECT: false,
                    //         SPEAK: false
                    //     });

                    //     // Set permissions for elevated members
                    //     for (role of cycleChan.guild.roles.cache) {
                    //         if (config['elevated-roles'].includes(role[1].name)) {
                    //             cycleChan.updateOverwrite(role[1], {
                    //                 VIEW_CHANNEL: true,
                    //                 CONNECT: true,
                    //                 SPEAK: true
                    //             });
                    //         }
                    //     }

                    // });
                });
            });
            
            logger.log("Channel Created (txt)", `${message.author}`)
            return true;
 
        } else {
            message.reply(`You can only use this command in <#${config['create-room-id']}>`).then(reply => {
                reply.delete({'timeout': timeout});
                message.delete({'timeout': timeout});
            });

            throw new CommandError("!create wrong room", `${message.author}`);
        }
    }
}