const logger = require('../custom_modules/logging.js');
const fs = require("fs");
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const replies = require('../custom_modules/replies.js');
const save = require('../custom_modules/save.js');
const CommandError = require('../custom_modules/commandError.js');

function roleCheck(msg, roles) {
    return msg.member.roles.cache.find(r => roles.includes(r.name))
}

module.exports = {
    name: 'r',
    description: 'sets a person\'s queue status to not ready',
    async execute(msg, args, options) {
        let queues = options.queues;

        let target = new Map();
        target = msg.mentions.users;

        // Check for elevated user to allow args
        if (roleCheck(msg, config['elevated-roles']) && args.length !== 0) {
            
            if (target.size == 0) {
                replies.timedReply(msg, `your message \`${msg}\` contained no valid users, so nobody was readied`, config['bot-alert-timeout']);
                throw new CommandError(`!r no valid users ${msg}`, `${msg.author}`);
            }

        } else if (args.length !== 0) {
            replies.timedReply(msg, "you do not have permission to use arguments with this command", config['bot-alert-timeout']);
            throw new CommandError("!r insufficient permissions", `${msg.author}`);
        }

        // Find the users
        let readyString = "";
        let readyAllIds = "";
        let readyPrintString = "";
        let readySelf = false;

        // Ready the user if they did not use any arguments
        if (target.size == 0) {
            target.set(`${msg.author.id}`, msg.author);
            readySelf = true;
        }

        let found = false
        for ([id, member] of target) {
            readyAllIds += ` <@${id}>`

            for (let [course, list] of queues) {
                for (let i = 0; i < list.length; i++) {
                    if (list[i].user === id) {
    
                        // Ready the user
                        list[i].ready = true

                        found = true
    
                        if (readySelf) {
                            // Only reading the one person, so we can end the function
                            logger.log(`!ready self`, `${msg.author}`)
							msg.react('✅')
							save.saveQueue(queues);
                            return true;
                        } else {
                            // If multiple, record the information of the successful ready
                            readyString += ` ${member}`;
                            readyPrintString += `${member}\n`
                        }
                    }
                }
            }
        }

        save.saveQueue(queues);
        if (readySelf) {
            replies.timedReply(msg, "you were not in a queue (so no action is required)", config['bot-alert-timeout'])
            throw new CommandError(`!ready self not in queue`, `${msg.author}`);
        } else {
            if (found) {
                logger.log(`!ready${readyString}`, `${msg.author}`)
                if (target.size > 1) {
                    msg.channel.send(`> We readied the following users\n${readyPrintString}`)
                } else {
                    msg.react('✅')
                }
            } else {
                logger.log(`!ready nobody from${readyAllIds}`, `${msg.author}`)
                if (target.size > 1) {
                    replies.timedReply(msg, `none of${readyAllIds} were in a queue`, config['bot-alert-timeout']);
                } else {
                    replies.timedReply(msg, `${target.values().next().value} was not in a queue`, config['bot-alert-timeout']);
                }
            }

            return true;
        }
    }
}