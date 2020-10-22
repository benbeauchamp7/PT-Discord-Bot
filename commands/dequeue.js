const logger = require('../logging.js');
const fs = require("fs");
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const replies = require('../replies.js');
const save = require('../save.js');
const CommandError = require('../commandError.js');

function checkMention(mention, msg) {
    if (mention.match(/^<@!?(\d+)>$/g)) {
        let id = mention.replace(/[\\<>@#&!]/g, "");

        if (msg.guild.members.cache.get(id) === undefined) { return false; }

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

        // Check for elevated user to allow args
        if (roleCheck(msg, config['elevated-roles']) && args.length !== 0) {
            
            // If a valid mention
            let mentionID = checkMention(args[0], msg);
            if (!mentionID) {
                replies.timedReply(msg, "that user does not exist (maybe a broken mention?)", config['bot-alert-timeout']);
                throw new CommandError(`!dq undefined user ${args[0]}`, `${msg.author}`);
            }
            adminDQ = true;
            user.id = mentionID;

        } else if (args.length !== 0) {
            replies.timedReply(msg, "you do not have permission to use arguments with this command", config['bot-alert-timeout']);
            throw new CommandError("!dq insufficient permissions", `${msg.author}`);
        }

        // Find the user
        for (let [course, list] of queues) {
            for (let i = 0; i < list.length; i++) {
                if (list[i].user === user.id) {

                    // Take the user out of the queue
                    list.splice(i, 1);

                    // Remove the queued role
                    msg.guild.members.cache.get(user.id).roles.remove(config['role-q-code']);

                    if (adminDQ) {
                        logger.log(`!dq <@${user.id}> from ${course}`, `${msg.author}`)
                        msg.react('✅')
                        msg.reply(`we removed ${msg.guild.members.cache.get(user.id)} from the queue, don't forget to have them fill out the survey!\n<https://forms.gle/ZhiFS4AkzWxY1tzR7>`);
                    } else {
                        logger.log(`!dq self from ${course}`, `${msg.author}`)
                        msg.react('✅')
                        // msg.reply(`removed! You're no longer queued`);
                    }

                    save.saveQueue(queues);

                    return true;
                }
            }
        }

        // User not found
        if (adminDQ) {
            replies.timedReply(msg, `${msg.guild.members.cache.get(user.id)} was not in a queue`, config['bot-alert-timeout'])
            throw new CommandError(`!dq ${msg.guild.members.cache.get(user.id)} not in queue`, `${msg.author}`);
            
        } else {
            replies.timedReply(msg, "you were not in a queue (so no action is required)", config['bot-alert-timeout'])
            throw new CommandError(`!dq self not in queue`, `${msg.author}`);
        }
    }
}