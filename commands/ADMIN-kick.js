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
    chan.send(`<@&${config['bot-manager-role-id']}>s, ${user} used !#kick on ${target}`)

    logger.log(`WARN: ${user} used !#kick on ${target}`, user.id);
}

module.exports = {
    name: 'kick',
    description: 'kicks a student from the server',
    slashes: [new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kicks a student from the server')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to kick')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for the kick')
                .setRequired(true))
    ],

    permissions: {
        kick: {
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
            await interaction.reply({content: 'You can\'t kick yourself', ephemeral: true});
            throw new CommandError('/#kick self', `${interaction.member}`);
        } else if (common.roleCheck(target, config['elevated-roles'])) {
            await interaction.reply({content: 'You can\'t kick another elevated user, this action was recorded', ephemeral: true});
            throw new CommandError(`/#kick elevated ${target}`, `${interaction.member}`);
        } else {
            await interaction.reply(`The user ${target.nickname} with uid ${target.id} was kicked`);
            target.kick({reason: reason});
            logger.log(`WARN: /#kick ${target}`, `${interaction.member}`);
            interaction.guild.channels.resolve(config["infraction-chan-id"]).send(`<@&${config['bot-manager-role-id']}>s, ${interaction.member} used !#kick on ${target}`);

            return true;
        }
    },

    async execute(message, args) {

        if (!message.member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {
            replies.timedReply(message, "you do not have permission to use this command.", config["bot-alert-timeout"]);
            throw new CommandError("!#kick insufficient perms", `${message.author}`);
        } else if (args.length == 0) {
            replies.timedReply(message, "no user specified, use @ to mention a user", config["bot-alert-timeout"]);
            throw new CommandError("!#kick no user specified", `${message.author}`);
        }

        let member = await getUserFromMention(message, args[0]);

        if (member === undefined) {
            replies.timedReply(message, "user not found, command failed", config["bot-alert-timeout"]);
            throw new CommandError("!#kick user not found", `${message.author}`);

        } else if (member.id === message.author.id) {
            replies.timedReply(message, "you cannot use an admin command on yourself", config["bot-alert-timeout"]);
            throw new CommandError("!#kick use on self", `${message.author}`);

        } else if (member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {
            replies.timedReply(message, "you cannot kick another elevated user. This action was reported to moderators", config["bot-alert-timeout"]);
            report(message, message.author, member);
            throw new CommandError("!#kick elevated user", `${message.author}`);
        }

        member.kick()
        replies.timedReply(message, `we kicked ${member}. This action was recorded`, config["bot-alert-timeout"]);
        logger.log(`WARN: kicked ${target}`, `${message.author.id}`);
        report(message, message.author, member)
        return true;
    }
}