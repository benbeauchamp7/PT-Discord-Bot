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

function getChanFromLink(msg, mention) {
    if (mention.match(/^<#!?(\d+)>$/g)) {
        // Return the id
        let chanID = mention.replace(/[\\<>@#&!]/g, "");
        let parent = msg.guild.channels.cache.get(chanID).parent;

        if (!parent.name.endsWith(config['student-chan-specifier']) && !parent.name.endsWith(config['sticky-chan-specifier'])) {
            return "Invalid Room";
        }

        for (const chan of parent.children) {
            if (chan[1].type === 'voice') {
                return [chan[1], msg.guild.channels.cache.get(chanID)];
            }
        }
    }

    return undefined;
}

function report(anchor, user, target, dest) {
    let chan = anchor.guild.channels.resolve(config["infraction-chan-id"])
    chan.send(`<@&${config['bot-manager-role-id']}>s, ${user} attempted to move ${target} to ${dest}`)

    logger.log(`WARN: ${user} attempted to move ${target} to ${dest}`, user.id);
}

module.exports = {
    name: '#move',
    description: 'moves a student from their current channel to a destination channel',
    async execute(message, args) {

        if (!message.member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {
            replies.timedReply(message, "you do not have permission to use this command.", config["bot-alert-timeout"]);
            throw new CommandError("!#move insufficent perms", `${message.author}`);

        } else if (args === undefined || args.length < 2) {
            replies.timedReply(message, "the syntax is as follows: \`!move @user #text-channel\`", config["bot-alert-timeout"] * 3);
            throw new CommandError("!#move invalid syntax", `${message.author}`);
        }

        let member = getUserFromMention(message, args[0]);
        let chans = getChanFromLink(message, args[1]);

        if (chans === undefined) {
            replies.timedReply(message, "the syntax is as follows: \`!move @user #text-channel\`", config["bot-alert-timeout"] * 3);
            throw new CommandError("!#move invalid syntax", `${message.author}`);

        } else if (chans === "Invalid Room") {
            replies.timedReply(message, "you can only move users into dynamically created rooms", config["bot-alert-timeout"]);
            throw new CommandError("!#move invalid room", `${message.author}`);
        }


        let destination = chans[0];
        let text = chans[1];

        if (member === undefined) {
            replies.timedReply(message, "user not found, command failed", config["bot-alert-timeout"]);
            throw new CommandError("!#move user not found", `${message.author}`);

        } else if (member.id === message.author.id) {
            replies.timedReply(message, "you cannot use an admin command on yourself", config["bot-alert-timeout"]);
            throw new CommandError("!#move use on self", `${message.author}`);

        } else if (destination === undefined) {
            replies.timedReply(message, "channel not found, command failed", config["bot-alert-timeout"]);
            throw new CommandError("!#move channel not found", `${message.author}`);

        } else if (member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {
            replies.timedReply(message, "you cannot move another elevated user. This action was reported to moderators", config["bot-alert-timeout"]);
            report(message, message.author, member, text);
            throw new CommandError("!#move elevated user", `${message.author}`);
        }

        if (member.voice.channel !== undefined) {
            member.voice.setChannel(destination).then(() => {
                replies.timedReply(message, `we moved ${member} to ${text}. This action was recorded`, config["bot-alert-timeout"]);
                logger.log(`WARN: moved <@${member}> to ${text}`, message.author.id);
                return true;
            });
        }
        
        return true;
    }
}