const logger = require('../custom_modules/logging.js');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const replies = require('../custom_modules/replies.js');
const CommandError = require('../custom_modules/commandError.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

async function getUserFromMention(msg, mention) {
    if (mention.match(/^<@!?(\d+)>$/g)) {
        // Return the id
        let userID = mention.replace(/[\\<>@#&!]/g, "");
        return msg.guild.members.fetch(userID);
    }

    return undefined;
}

function report(anchor, user, target) {
    let chan = anchor.guild.channels.resolve(config["infraction-chan-id"])
    chan.send(`<@&${config['bot-manager-role-id']}>s, ${user} used !#mute on ${target}`)

    logger.log(`WARN: ${user} used !#unmute on ${target}`, user.id);
}

module.exports = {
    name: 'unmute',
    description: 'server unmutes a student',
    slashes: [new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Unmutes a student so that they can speak in a voice channel if perviously muted')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to unmute')
                .setRequired(true))
    ],

    permissions: {
        unmute: {
            permissions: [{
                id: '750838675763494995',
                type: 'ROLE',
                permission: true
            }]
        }
    },

    async executeInteraction(interaction) {
        const target = await interaction.guild.members.fetch(interaction.options.getUser('user'));
        if (target.id === interaction.member.id) {
            await interaction.reply({content: 'You can\'t unmute yourself (how did this happen, you might want to contact a moderator)', ephemeral: true});
            throw new CommandError('/#unmute self', `${interaction.member}`);
        } else if (common.roleCheck(target, config['elevated-roles'])) {
            await interaction.reply({content: 'You can\'t unmute another elevated user, this action was recorded', ephemeral: true});
            throw new CommandError(`/#unmute elevated ${target}`, `${interaction.member}`);
        } else {
            await interaction.reply(`The user ${target.nickname} with uid ${target.id} is now unmuted`);
            target.voice.setMute(false);

            logger.log(`WARN: /#unmute ${target}`, `${interaction.member}`);
            interaction.guild.channels.resolve(config["infraction-chan-id"]).send(`<@&${config['bot-manager-role-id']}>s, ${interaction.member} used /#unmute on ${target}`);

            return true;
        }
    },

    async execute(message, args) {

        if (!message.member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {
            replies.timedReply(message, "you do not have permission to use this command.", config["bot-alert-timeout"]);
            throw new CommandError("!#unmute insufficient perms", `${message.author}`);
        } else if (args.length == 0) {
            replies.timedReply(message, "no user specified, use @ to mention a user", config["bot-alert-timeout"]);
            throw new CommandError("!#unmute no user specified", `${message.author}`);
        }

        let member = await getUserFromMention(message, args[0]);

        if (member === undefined) {
            replies.timedReply(message, "user not found, command failed", config["bot-alert-timeout"]);
            throw new CommandError("!#unmute user not found", `${message.author}`);

        } else if (member.id === message.author.id) {
            replies.timedReply(message, "you cannot use an admin command on yourself", config["bot-alert-timeout"]);
            throw new CommandError("!#unmute use on self", `${message.author}`);

        } else if (member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {
            replies.timedReply(message, "you cannot server unmute another elevated user. This action was reported to moderators", config["bot-alert-timeout"]);
            report(message, message.author, member);
            throw new CommandError("!#unmute elevated user", `${message.author}`);
        }


        member.voice.setMute(false);

        replies.timedReply(message, `we unmuted ${member}. This action was recorded`, config["bot-alert-timeout"]);
        logger.log(`WARN: muted ${member}`, `${message.author}`);
        report(message, message.author, member);

        return true;

        
    }
}