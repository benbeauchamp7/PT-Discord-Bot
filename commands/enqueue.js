const logger = require('../logging.js');
const fs = require("fs");
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const replies = require('../replies.js');
const save = require('../save.js');
const CommandError = require('../commandError.js');

function checkMention(mention, msg) {
    if (mention.match(/^<@!?(\d+)>$/g)) {
        let id = mention.replace(/[\\<>@#&!]/g, "");

        if (msg.guild.members.cache.get(user.id) === undefined) { return false; }
        return id;
    }
    return false;
}

function roleCheck(msg, roles) {
    return msg.member.roles.cache.find(r => roles.includes(r.name))
}

function getPlace(rank) {
    switch (rank) {
        case 1:  return "**first**";
        case 2:  return "**second**";
        case 3:  return "**third**";
        case 4:  return "**fourth**";
        case 5:  return "**fifth**";
        case 6:  return "**sixth**";
        case 7:  return "**seventh**";
        case 8:  return "**eighth**";
        case 9:  return "**nineth**";
        default: return "number **" + rank + "**";
    }
}

module.exports = {
    name: 'q',
    description: 'puts a student into a queue',
    async execute(msg, args, options) {
        let queues = options.queues;
        let bot = options.bot;
        let user = Object.assign({}, msg.author);
        let adminQ = false;

        // Check for elevated user to allow args
        if (!roleCheck(msg, config['elevated-roles']) && args.length !== 0) {
            
            // If a valid mention
            let mentionID = checkMention(args[0], msg);
            if (!mentionID) {
                replies.timedReply(msg, "that user does not exist (maybe a broken mention?)", config['bot-alert-timeout'])
                throw new CommandError(`!q undefined user [${user.id}]`, `${msg.author}`);
            }
            adminQ = true;
            user.id = mentionID;
            
        } else if (args.length !== 0) {
            replies.timedReply(msg, "you do not have permission to use arguments with this command", config['bot-alert-timeout'])
            throw new CommandError("!q insufficient permissions", `${msg.author}`);
        }

        // Don't let them join a queue if they're already in one
        for (let [temp, list] of queues) {
            for (let i = 0; i < list.length; i++) {
                if (list[i].user === user.id) {
                    replies.timedReply(msg, `you're already queued in ${temp}, so we couldn't queue you here`, config['bot-alert-timeout'])
                    throw new CommandError(`!q already queued in ${temp}`, `${msg.author}`);
                }
            }
        }

        // Get the list then add the new user to the back
        let course = msg.channel.name;
        queues.get(course).push({user: user.id, time: Date.now()})

        let position = getPlace(queues.get(course).length);

        // Give them the queued role
        msg.guild.members.cache.get(user.id).roles.add(config['role-q-code']);

        if (adminQ) {
            logger.log(`!q @${user.id} into ${course}`, `${msg.author}`)
            msg.reply(`we queued ${msg.guild.members.cache.get(user.id)}, they're ${position} in line`);
        } else {
            logger.log(`!q self into ${course}`, `${msg.author}`)
            msg.reply(`queued! You're ${position} in line`);
        }

        bot.channels.fetch(config['q-alert-id']).then(channel => {
            const tag = `role-${msg.channel.name.substring(5)}-code`;
            channel.send(`<@&${config[tag]}>, <@${user.id}> has joined the ${msg.channel.name} queue and needs *your* help!`);
        });

        save.saveQueue(queues);

        return true;
    }
}