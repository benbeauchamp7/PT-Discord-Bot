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
    chan.send(`<@&${config['bot-manager-role-id']}>s, ${user} attempted to disconnect ${target}`)

    logger.log(`WARN: ${user} attempted to disconnect ${target}`, user.id);
}

module.exports = {
    name: '#dc',
    description: 'disconnects a student from a voice chat',
    async execute(message, args) {

        if (!message.member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {
            replies.timedReply(message, "you do not have permission to use this command.", config["bot-alert-timeout"]);
            throw new CommandError("!#dc insufficent perms", `${message.author}`);
        } else if (args.length == 0) {
            replies.timedReply(message, "no user specified, use @ to mention a user", config["bot-alert-timeout"]);
            throw new CommandError("!#dc no user specified", `${message.author}`);
        }

        let member = getUserFromMention(message, args[0]);

        if (member === undefined) {
            replies.timedReply(message, "user not found, command failed", config["bot-alert-timeout"]);
            throw new CommandError("!#dc user not found", `${message.author}`);

        } else if (member.id === message.author.id) {
            replies.timedReply(message, "you cannot use an admin command on yourself", config["bot-alert-timeout"]);
            throw new CommandError("!#dc use on self", `${message.author}`);

        } else if (member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {
            replies.timedReply(message, "you cannot disconnect another elevated user. This action was reported to moderators", config["bot-alert-timeout"]);
            report(message, message.author, member);
            throw new CommandError("!#dc elevated user", `${message.author}`);
        }

        if (member.voice.channel !== undefined) {
            member.voice.kick();
            replies.timedReply(message, `we disconnected ${member}. This action was recorded`, config["bot-alert-timeout"]);
            logger.log(`WARN: disconnected ${member}`, `${message.author.id}`);
            return true;

        } else {
            replies.timedReply(message, "user not in a voice channel", config["bot-alert-timeout"]);
            throw new CommandError(`${member} not in VC`, `${message.author}`);
        }
    }
}