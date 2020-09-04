const logger = require('../logging.js');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const Discord = require('discord.js');

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

        if (!parent.name.endsWith(config['student-chan-specifier'])) {
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

// Basic messages that expire after a set time
function timedReply(message, response, time) {
    message.reply(response).then(reply => {
        reply.delete({'timeout': time});
        message.delete({'timeout': time});
    });
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
            timedReply(message, "you do not have permission to use this command.", config["bot-alert-timeout"]);
            return false;

        } else if (args === undefined || args.length < 2) {
            timedReply(message, "the syntax is as follows: \`!move @user #channel\`", config["bot-alert-timeout"] * 3);
            return false;
        }

        let member = getUserFromMention(message, args[0]);
        let chans = getChanFromLink(message, args[1]);

        if (chans === undefined) {
            timedReply(message, "the syntax is as follows: \`!move @user #text-channel\`", config["bot-alert-timeout"] * 3);
            return false;

        } else if (chans === "Invalid Room") {
            timedReply(message, "you can only move users into dynamically created rooms", config["bot-alert-timeout"]);
            return false;
        }


        let destination = chans[0];
        let text = chans[1];

        if (member === undefined) {
            timedReply(message, "user not found, command failed", config["bot-alert-timeout"]);
            return false;

        } else if (destination === undefined) {
            timedReply(message, "channel not found, command failed", config["bot-alert-timeout"]);
            return false;

        } else if (member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {
            timedReply(message, "you cannot move another elevated user. This action was reported to moderators", config["bot-alert-timeout"]);
            report(message, message.author, member, text);
            return false;
        }

        if (member.voice.channel !== undefined) {
            member.voice.setChannel(destination).then(() => {
                timedReply(message, `we moved ${member} to ${text}. This action was recorded`, config["bot-alert-timeout"]);
                logger.log(`WARN: moved <@${member}> to ${text}`, message.author.id);
                return true;
            });
        }
        
        return true;
    }
}