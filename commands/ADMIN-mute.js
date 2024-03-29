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

    logger.log(`WARN: ${user} used !#mute on ${target}`, user.id);
}

module.exports = {
    name: 'mute',
    description: 'server mutes a student',
    slashes: [new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mutes a student so that they can\'t speak in a voice channel')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to mute')
                .setRequired(true))
    ],

    permissions: {
        mute: {
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
            await interaction.reply({content: 'You can\'t mute yourself', ephemeral: true});
            throw new CommandError('/#mute self', `${interaction.member}`);
        } else if (common.roleCheck(target, config['elevated-roles'])) {
            await interaction.reply({content: 'You can\'t mute another elevated user, this action was recorded', ephemeral: true});
            throw new CommandError(`/#mute elevated ${target}`, `${interaction.member}`);
        } else {
            let isMute = target.voice.serverMute;
            await interaction.reply(`The user ${target.nickname} with uid ${target.id} is now ${(!isMute)? '***un***muted' : 'muted'}`);
            target.voice.setMute(!isMute); // Toggle the mute

            logger.log(`WARN: /#mute ${target}`, `${interaction.member}`);
            interaction.guild.channels.resolve(config["infraction-chan-id"]).send(`<@&${config['bot-manager-role-id']}>s, ${interaction.member} used /#mute on ${target} (MUTE is now ${!isMute})`);

            return true;
        }
    },

    async execute(message, args) {

        if (!message.member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {
            replies.timedReply(message, "you do not have permission to use this command.", config["bot-alert-timeout"]);
            throw new CommandError("!#mute insufficient perms", `${message.author}`);
        } else if (args.length == 0) {
            replies.timedReply(message, "no user specified, use @ to mention a user", config["bot-alert-timeout"]);
            throw new CommandError("!#mute no user specified", `${message.author}`);
        }

        let member = await getUserFromMention(message, args[0]);

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
            member.voice.setMute(false);

            replies.timedReply(message, `we unmuted ${member}. This action was recorded`, config["bot-alert-timeout"]);
            logger.log(`WARN: muted ${member}`, `${message.author}`);
            report(message, message.author, member);

            return true;

        } else {
            member.voice.setMute(true);

            replies.timedReply(message, `we muted ${member}. Use \`!#mute\` again to undo. This action was recorded`, config["bot-alert-timeout"]);
            logger.log(`WARN: muted ${member}`, `${message.author}`);
            report(message, message.author, member);

            return true;
        }
    }
}