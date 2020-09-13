const logger = require('../logging.js');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const replies = require('../replies.js');
const CommandError = require('../commandError.js');

function getUserFromMention(msg, mention) {
    if (mention.match(/^<@!?(\d+)>$/g)) {
        // Return the id
        let userID = mention.replace(/[\\<>@#&!]/g, "");
        return msg.guild.members.cache.get(userID);
    }

    return undefined;
}

function report(anchor, user, target) {
    let chan = anchor.guild.channels.resolve(config["infraction-chan-id"])
    chan.send(`<@&${config['bot-manager-role-id']}>s, ${user} used !#mute on ${target}`)

    logger.log(`WARN: ${user} used !#mute on ${target}`, user.id);
}

module.exports = {
    name: '#mute',
    description: 'server mutes a student',
    async execute(message, args) {

        if (!message.member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {
            replies.timedReply(message, "you do not have permission to use this command.", config["bot-alert-timeout"]);
            throw new CommandError("!#mute insufficent perms", `${message.author}`);
        }

        let member = getUserFromMention(message, args[0]);

        if (member === undefined) {
            replies.timedReply(message, "user not found, command failed", config["bot-alert-timeout"]);
            throw new CommandError("!#mute user not found", `${message.author}`);

        } else if (member.id === message.author.id) {
            replies.timedReply(message, "you cannot use an admin command on yourself", config["bot-alert-timeout"]);
            throw new CommandError("!#mute use on self", `${message.author}`);

        } else if (member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {
            replies.timedReply(message, "you cannot server mute another elevated user. This action was reported to moderators", config["bot-alert-timeout"]);
            report(message, message.author, member);
            throw new CommandError("!#mute elevated user", `${message.author}`);
        }

        if (member.voice.serverMute) {
            member.voice.setMute(false).then(() => {
                replies.timedReply(message, `we unmuted ${member}. This action was recorded`, config["bot-alert-timeout"]);
                logger.log(`WARN: unmuted ${target}`, user.id);
                report(message, message.author, member);
                return true;
            });

        } else {
            member.voice.setMute(true).then(() => {
                replies.timedReply(message, `we muted ${member}. Use \`!#mute\` again to undo. This action was recorded`, config["bot-alert-timeout"]);
                logger.log(`WARN: muted <@${target}>`, user.id);
                report(message, message.author, member);
                return true;
            });
        }
        
        return true;
    }
}