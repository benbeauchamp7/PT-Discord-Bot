const logger = require('../custom_modules/logging.js');
const Discord = require('discord.js');
const fs = require("fs");
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const save = require("../custom_modules/save.js");
const replies = require('../custom_modules/replies.js');
const CommandError = require('../custom_modules/commandError.js');
const common = require('../custom_modules/common.js');

module.exports = {
    name: 'clearqueue',
    description: 'empties all the queues',
    async execute(message, args, options) {
        let queues = options.queues;

        if (message.member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {
            message.reply("This will remove all students from all queues, type !confirm to continue or !cancel to cancel. The command will cancel automatically if no response is detected in 30 seconds").then(confirmationMessage => {
    
                // Both delete promises fail quietly in case !cancel deletes the messages first
                setTimeout(() => { confirmationMessage.delete(); }, 30000)
                setTimeout(() => { message.delete(); }, 30000)
    
                // Set a message collector to look for !confirm or !cancel
                const collector = new Discord.MessageCollector(message.channel, reply => reply.author.id === message.author.id, {"time": 30000})
                collector.on('collect', reply => {
                    if (reply.content.toLowerCase() == process.env.PREFIX + "confirm") {
    
                        // Reinitialize queues to be empty
                        common.emptyQueues(message.guild, queues, config);
    
                        message.reply("Confirmed!").then(recipt => {
    
                            // Deletion promises set to fail quietly in case the 30 second timeout deletes the messages first
                            try {
                                setTimeout(() => { reply.delete(); }, config['bot-alert-timeout'])
                                setTimeout(() => { message.delete(); }, config['bot-alert-timeout'])
                                setTimeout(() => { confirmationMessage.delete(); }, config['bot-alert-timeout'])
                                if (recipt) {
                                    setTimeout(() => { recipt.delete(); }, config['bot-alert-timeout'])
                                }
                            } catch (err) {
                                logger.log(`ERROR: !clearq promises threw an error`, `${message.author}`)
                                logger.logError(err);
                            }
                            logger.log(`!clearq called`, `${message.author}`);

                            // Remove queued role from everyone (issue with cached users)
                            // let queuedMembers = message.guild.roles.cache.get(config['role-q-code']).members;
                            // for ([id, member] of queuedMembers) {
                            //     member.roles.remove(config['role-q-code'])
                            // }

                            

                            save.saveQueue(queues);
                            options.updateQueues.val = true;
    
                        });

                        return true;
    
                    } else if (reply.content.toLowerCase() == process.env.PREFIX + "cancel") {
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
        } else {
            replies.timedReply(message, "you do not have permission to use this command.", config["bot-alert-timeout"]);
            throw new CommandError("!clearqueue insufficient perms", `${message.author}`);
        }
    }
}