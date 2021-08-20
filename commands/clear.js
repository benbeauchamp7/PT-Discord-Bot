const Discord = require("discord.js");
const logger = require('../custom_modules/logging.js');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const CommandError = require('../custom_modules/commandError.js');

function clearChat(message) {
    // Creates a copy of the channel, then deletes the original
    const pos = message.channel.position
    message.channel.clone().then(chan => {
        chan.setPosition(pos);
    });

    message.channel.delete();
    logger.log("chat cleared", `${message.author}`);
}

function clearArchives(bot, message) {
    // Loop through archived channels
    bot.channels.fetch(config['archive-cat-id']).then(cat => {
        for (const chan of cat.children) {
            chan[1].delete();
        }
    });
    logger.log("archives cleared", `${message.author}`);
}

function clearStudentRooms(bot) {
    for (const chan of bot.channels.cache) {
        // If student category
        if (chan[1] instanceof Discord.CategoryChannel && (chan[1].name.endsWith(config['student-chan-specifier'] || chan[1].name.endsWith(config['sticky-chan-specifier'])))) {
            for (const child of chan[1].children) {
                child[1].delete()
            }
            chan[1].delete();
            
        }
    }

    logger.log("student rooms cleared", `${message.author}`);
}

module.exports = {
    name: 'clear',
    description: 'clears a text channel',
    async execute(message, args, options) {
        return false;
        
        const promptMap = new Map();
        promptMap.set('chat', "This will erase all content in this channel")
        promptMap.set('archives', "This will erase all archived content in the \"Archived Student Rooms\" category")
        promptMap.set('student rooms', "This will erase all student create study rooms")

        args = args.join(' ');

        // Check for elevated roles
        if (message.member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {

            // Prevent deletion of the "create-room". This is because the unique id of the room is important for link functionality
            if (args === "chat" && (message.channel.name == "create-room" || message.channel.name == "bot-channel")) {
                message.reply("!clearchat command cannot be used on this room").then(reply => {
                    reply.delete({"timeout": config['bot-alert-timeout']});
                    message.delete({"timeout": config['bot-alert-timeout']});
                });
                return false;
            }

            if (!(promptMap.has(args))) {
                message.reply("Invalid specifier, the clear command can be used with 'chat', 'student rooms' and 'archives' following the command.").then(confirmationMessage => {
                    confirmationMessage.delete({"timeout": config['bot-alert-timeout']});
                    message.delete({"timeout": config['bot-alert-timeout']});
                });
                return false;
            }
            
            message.reply(promptMap.get(args) + ", type !confirm to continue or !cancel to cancel. The command will cancel automatically if no response is detected in 30 seconds").then(confirmationMessage => {

                // Both delete promises fail quietly in case !cancel deletes the messages first
                setTimeout(() => { confirmationMessage.delete(); }, 30000)
                setTimeout(() => { message.delete(); }, 30000)

                // Set a message collector to look for !confirm or !cancel
                const collector = new Discord.MessageCollector(message.channel, reply => reply.author.id === message.author.id, {"time": 30000})
                collector.on('collect', reply => {
                    if (reply.content.toLowerCase() == "!confirm") {

                        switch (args) {
                            case 'chat':
                                clearChat(message);
                                break;
                            case 'archives':
                                clearArchives(options.bot, message);
                                break;
                            case 'student rooms':
                                clearStudentRooms(options.bot);
                                break;
                        }

                        message.reply("Confirmed!").then(recipt => {

                            // Deletion promises set to fail quietly in case the 30 second timeout deletes the messages first
                            try {
                                setTimeout(() => { reply.delete(); }, config['bot-alert-timeout'])
                                setTimeout(() => { message.delete(); }, config['bot-alert-timeout'])
                                setTimeout(() => { confirmationMessage.delete(); }, config['bot-alert-timeout'])
                                if (recipt) {
                                    setTimeout(() => { recipt.delete(); }, config['bot-alert-timeout'])
                                }
                            } catch (err) {}
                        });
                        return true;

                    } else if (reply.content.toLowerCase() == "!cancel") {
                        message.reply("Command canceled").then(cancelMessage => {

                            // Deletion promises set to fail quietly in case the 30 second timeout deletes the messages first
                            setTimeout(() => { reply.delete(); }, config['bot-alert-timeout'])
                            setTimeout(() => { message.delete(); }, config['bot-alert-timeout'])
                            setTimeout(() => { confirmationMessage.delete(); }, config['bot-alert-timeout'])
                            setTimeout(() => { cancelMessage.delete(); }, config['bot-alert-timeout'])

                        });
                        return false;  
                    }
                });
            }); 

            return true;
        } else {
            message.reply("Insufficient permissions.").then(reply => {
                reply.delete({"timeout": config['bot-alert-timeout']});
                message.delete({"timeout": config['bot-alert-timeout']});
            });

            logger.log("!clear insufficient permissions", `${message.author}`)

            return false;
        }
    }
}