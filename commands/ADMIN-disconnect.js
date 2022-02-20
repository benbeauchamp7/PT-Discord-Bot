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
    chan.send(`<@&${config['bot-manager-role-id']}>s, ${user} attempted to disconnect ${target}`)

    logger.log(`WARN: ${user} attempted to disconnect ${target}`, user.id);
}

module.exports = {
    name: 'dc',
    description: 'disconnects a student from a voice chat',
    slashes: [new SlashCommandBuilder()
        .setName('dc')
        .setDescription('Disconnects a student from the voice channel')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to disconnect')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for the disconnect')
                .setRequired(true))
    ],

    permissions: {
        dc: {
            permissions: [{
                id: '750838675763494995',
                type: 'ROLE',
                permission: true
            }]
        }
    },

    async executeInteraction(interaction) {
        const target = await interaction.guild.members.fetch(interaction.options.getUser('user'));
        const reason = interaction.options.getString('reason');
        if (target.id === interaction.member.id) {
            await interaction.reply({content: 'You can\'t disconnect yourself', ephemeral: true});
            throw new CommandError('/#dc self', `${interaction.member}`);
        } else if (common.roleCheck(target, config['elevated-roles'])) {
            await interaction.reply({content: 'You can\'t disconnect another elevated user, this action was recorded', ephemeral: true});
            throw new CommandError(`/#dc elevated ${target}`, `${interaction.member}`);
        } else {
            await interaction.reply(`The user ${target.nickname} with uid ${target.id} was kicked`);
            target.voice.disconnect({reason: reason});
            logger.log(`WARN: /#dc ${target}`, `${interaction.member}`);
            interaction.guild.channels.resolve(config["infraction-chan-id"]).send(`<@&${config['bot-manager-role-id']}>s, ${interaction.member} used !#dc on ${target}`);

            return true;
        }
    },

    async execute(message, args) {

        if (!message.member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {
            replies.timedReply(message, "you do not have permission to use this command.", config["bot-alert-timeout"]);
            throw new CommandError("!#dc insufficient perms", `${message.author}`);
        } else if (args.length == 0) {
            replies.timedReply(message, "no user specified, use @ to mention a user", config["bot-alert-timeout"]);
            throw new CommandError("!#dc no user specified", `${message.author}`);
        }

        let member = await getUserFromMention(message, args[0]);

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
            member.voice.disconnect();
            replies.timedReply(message, `we disconnected ${member}. This action was recorded`, config["bot-alert-timeout"]);
            logger.log(`WARN: disconnected ${member}`, `${message.author.id}`);
            return true;

        } else {
            replies.timedReply(message, "user not in a voice channel", config["bot-alert-timeout"]);
            throw new CommandError(`${member} not in VC`, `${message.author}`);
        }
    }
}