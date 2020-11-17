const logger = require('../logging.js');
const fs = require("fs");
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const replies = require('../replies.js');
const save = require('../save.js');
const CommandError = require('../commandError.js');

async function checkMention(mention, msg) {
    if (mention.match(/^<@!?(\d+)>$/g)) {
        let id = mention.replace(/[\\<>@#&!]/g, "");

        if (await msg.guild.members.fetch(id) === undefined) { return false; }

        return id;
    }
    return false;
}

function roleCheck(msg, roles) {
    return msg.member.roles.cache.find(r => roles.includes(r.name))
}

module.exports = {
    name: 'dq',
    description: 'puts a student into a queue',
    async execute(msg, args, options) {
        let queues = options.queues;
        let user = Object.assign({}, msg.author);
        let adminDQ = false;

        let target = new Map();
        target = msg.mentions.users;

        // Check for elevated user to allow args
        if (roleCheck(msg, config['elevated-roles']) && args.length !== 0) {
            
            if (target.size == 0) {
                replies.timedReply(msg, `your message \`${msg}\` contained no valid users, so nobody was dequeued`, config['bot-alert-timeout']);
                throw new CommandError(`!dq no valid users ${msg}`, `${msg.author}`);
            }

        } else if (args.length !== 0) {
            replies.timedReply(msg, "you do not have permission to use arguments with this command", config['bot-alert-timeout']);
            throw new CommandError("!dq insufficient permissions", `${msg.author}`);
        }

        // Find the users
        let dqString = "";
        let dqAllIds = "";
        let dqCourses = "";
        let dqPrintString = "";
        let dqSelf = false;

        // DQ the user if they did not use any arguments
        if (target.size == 0) {
            target.set(`${msg.author.id}`, msg.author);
            dqSelf = true;
        }

        let found = false
        for ([id, member] of target) {
            dqAllIds += ` <@${id}>`

            for (let [course, list] of queues) {
                for (let i = 0; i < list.length; i++) {
                    if (list[i].user === id) {
    
                        // Take the user out of the queue
                        list.splice(i, 1);
    
                        // Remove the queued role
                        msg.guild.members.fetch(id).then(user => {
                            user.roles.remove(config['role-q-code']);
                        })

                        found = true
    
                        if (dqSelf) {
                            logger.log(`!dq self from ${course}`, `${msg.author}`)
                            msg.react('✅')
                            return true;
                        } else {
                            dqString += ` ${member}`;
                            dqCourses += ` ${course}`;
                            dqPrintString += `${member}\n`
                        }
                    }
                }
            }
        }

        save.saveQueue(queues);
        if (dqSelf) {
            replies.timedReply(msg, "you were not in a queue (so no action is required)", config['bot-alert-timeout'])
            throw new CommandError(`!dq self not in queue`, `${msg.author}`);
        } else {
            if (found) {
                logger.log(`!dq${dqString} from${dqCourses}`, `${msg.author}`)
                if (target.size > 1) {
                    msg.channel.send(`> We removed the following from the queue\n${dqPrintString}`)
                } else {
                    msg.react('✅')
                }
            } else {
                logger.log(`!dq nobody from${dqAllIds}`, `${msg.author}`)
                if (target.size > 1) {
                    replies.timedReply(msg, `none of${dqAllIds} were in a queue`, config['bot-alert-timeout']);
                } else {
                    replies.timedReply(msg, `${target.values().next().value} was not in a queue`, config['bot-alert-timeout']);
                }
            }

            return true;
        }
    }
}