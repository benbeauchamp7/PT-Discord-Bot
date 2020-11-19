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
    name: 'nr',
    description: 'sets a person\'s queue status to unready',
    async execute(msg, args, options) {
        let queues = options.queues;

        let target = new Map();
        target = msg.mentions.users;

        // Check for elevated user to allow args
        if (roleCheck(msg, config['elevated-roles']) && args.length !== 0) {
            
            if (target.size == 0) {
                replies.timedReply(msg, `your message \`${msg}\` contained no valid users, so nobody was unreadied`, config['bot-alert-timeout']);
                throw new CommandError(`!nr no valid users ${msg}`, `${msg.author}`);
            }

        } else if (args.length !== 0) {
            replies.timedReply(msg, "you do not have permission to use arguments with this command", config['bot-alert-timeout']);
            throw new CommandError("!nr insufficient permissions", `${msg.author}`);
        }

        // Find the users
        let unreadyString = "";
        let unreadyAllIds = "";
        let unreadyPrintString = "";
        let unreadySelf = false;

        // unReady the user if they did not use any arguments
        if (target.size == 0) {
            target.set(`${msg.author.id}`, msg.author);
            unreadySelf = true;
        }

        let found = false
        for ([id, member] of target) {
            unreadyAllIds += ` <@${id}>`

            for (let [course, list] of queues) {
                for (let i = 0; i < list.length; i++) {
                    if (list[i].user === id) {
    
                        // unReady the user
                        list[i].ready = false

                        found = true
    
                        if (unreadySelf) {
                            logger.log(`!unready self`, `${msg.author}`)
							msg.react('✅')
							save.saveQueue(queues);
                            return true;
                        } else {
                            unreadyString += ` ${member}`;
                            unreadyPrintString += `${member}\n`
                        }
                    }
                }
            }
        }

        save.saveQueue(queues);
        if (unreadySelf) {
            replies.timedReply(msg, "you were not in a queue (so no action is required)", config['bot-alert-timeout'])
            throw new CommandError(`!unready self not in queue`, `${msg.author}`);
        } else {
            if (found) {
                logger.log(`!unready${unreadyString}`, `${msg.author}`)
                if (target.size > 1) {
                    msg.channel.send(`> We unreadied the following users\n${unreadyPrintString}`)
                } else {
                    msg.react('✅')
                }
            } else {
                logger.log(`!unready nobody from${unreadyAllIds}`, `${msg.author}`)
                if (target.size > 1) {
                    replies.timedReply(msg, `none of${unreadyAllIds} were in a queue`, config['bot-alert-timeout']);
                } else {
                    replies.timedReply(msg, `${target.values().next().value} was not in a queue`, config['bot-alert-timeout']);
                }
            }

            return true;
        }
    }
}