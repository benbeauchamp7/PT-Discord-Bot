const logger = require('../logging.js');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));

function getUserFromMention(msg, mention) {
    if (mention.match(/^<@!?(\d+)>$/g)) {
        // Return the id
        let userID = mention.replace(/[\\<>@#&!]/g, "");
        return msg.guild.members.cache.get(userID);
    }

    return undefined;
}

// Basic messages that expire after a set time
function timedReply(message, response, time) {
    message.reply(response).then(reply => {
        reply.delete({'timeout': time});
        message.delete({'timeout': time});
    });
}

function report(anchor, user, target) {
    let chan = anchor.guild.channels.resolve(config["infraction-chan-id"])
    chan.send(`<@&${config['bot-manager-role-id']}>s, ${user} attempted to kick ${target}`)

    logger.log(`WARN: ${user} attempted to kick ${target}`, user.id);
}

module.exports = {
    name: '#kick',
    description: 'kicks a student',
    async execute(message, args) {

        if (!message.member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {
            timedReply(message, "you do not have permission to use this command.", config["bot-alert-timeout"]);
            return false;
        }

        let member = getUserFromMention(message, args[0]);

        if (member === undefined) {
            timedReply(message, "user not found, command failed", config["bot-alert-timeout"]);
            return false;

        } else if (member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {
            timedReply(message, "you cannot kick another elevated user. This action was reported to moderators", config["bot-alert-timeout"]);
            report(message, message.author, member);
            return false;
        }

        member.kick().then(() => {
            timedReply(message, `we kicked ${member}. This action was recorded`, config["bot-alert-timeout"]);
            logger.log(`WARN: kicked <@${target}>`, user.id);
            return true;
        });
        
        return true;
    }
}