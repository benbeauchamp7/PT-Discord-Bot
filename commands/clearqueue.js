const logger = require('../logging.js');
const Discord = require('discord.js');
const fs = require("fs");
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const save = require("../save.js");

module.exports = {
    name: 'clearqueue',
    description: 'basic ping command',
    async execute(message, args, options) {
        let queues = options.queues;

        if (message.member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {
            message.reply("this will remove all students from all queues, type !confirm to continue or !cancel to cancel. The command will cancel automatically if no response is detected in 30 seconds").then(confirmationMessage => {
    
                // Both delete promises fail quietly in case !cancel deletes the messages first
                confirmationMessage.delete({"timeout": 30000}).catch(() => {});
                message.delete({"timeout": 30000}).catch(() => {});
    
                // Set a message collector to look for !confirm or !cancel
                const collector = new Discord.MessageCollector(message.channel, reply => reply.author.id === message.author.id, {"time": 30000})
                collector.on('collect', reply => {
                    if (reply.content.toLowerCase() == config["prefix"] + "confirm") {
    
                        // Reinitialize
                        for (course of config['course-channels']) {
                            queues.set(course, []);
                        }
    
                        message.reply("confirmed!").then(recipt => {
    
                            // Deletion promises set to fail quietly in case the 30 second timeout deletes the messages first
                            try {
                                reply.delete({"timeout": config['bot-alert-timeout']}).catch(() => {});
                                message.delete({"timeout": config['bot-alert-timeout']}).catch(() => {});
                                confirmationMessage.delete({"timeout": config['bot-alert-timeout']}).catch(() => {});
                                if (recipt) {
                                    recipt.delete({"timeout": config['bot-alert-timeout']}).catch(() => {});
                                }
                            } catch (err) {
                                logger.log(`ERROR: !clearq promises threw an error`, `${message.author}`)
                                logger.logError(err);
                            }
                            logger.log(`!clearq called`, `${message.author}`);

                            save.saveQueue(queues);
    
                        });

                        return true;
    
                    } else if (reply.content.toLowerCase() == config["prefix"] + "cancel") {
                        message.reply("command canceled").then(cancelMessage => {
    
                            // Deletion promises set to fail quietly in case the 30 second timeout deletes the messages first
                            reply.delete({"timeout": config['bot-alert-timeout']}).catch(() => {});
                            message.delete({"timeout": config['bot-alert-timeout']}).catch(() => {});
                            confirmationMessage.delete({"timeout": config['bot-alert-timeout']}).catch(() => {});
                            cancelMessage.delete({"timeout": config['bot-alert-timeout']}).catch(() => {});
    
                        });

                        return false;  
                    }
                });
            });
        }
    }
}