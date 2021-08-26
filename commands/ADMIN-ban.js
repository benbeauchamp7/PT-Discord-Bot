const logger = require('../custom_modules/logging.js');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const replies = require('../custom_modules/replies.js');
const CommandError = require('../custom_modules/commandError.js');

const { SlashCommandBuilder } = require('@discordjs/builders');
const common = require('../custom_modules/common.js');

async function getUserFromMention(msg, mention) {
    if (mention.match(/^<@!?(\d+)>$/g)) {
        // Return the id
        let userID = mention.replace(/[\\<>@#&!]/g, "");
        return await msg.guild.members.fetch(userID);
    }

    return undefined;
}

function report(anchor, user, target) {
    let chan = anchor.guild.channels.resolve(config["infraction-chan-id"])
    chan.send(`<@&${config['bot-manager-role-id']}>s, ${user} used !#ban on ${target}`)

    logger.log(`WARN: ${user} used !#ban on ${target}`, user.id);
}

module.exports = {
    name: 'ban',
    description: 'bans a student',
    slashes: [new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bans a student from the server')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to ban')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for the ban')
                .setRequired(true))
    ],

    permissions: {
        ban: {
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
            await interaction.reply({content: 'You can\'t ban yourself', ephemeral: true});
            throw new CommandError('/#ban self', `${interaction.member}`);
        } else if (common.roleCheck(target, config['elevated-roles'])) {
            await interaction.reply({content: 'You can\'t ban another elevated user, this action was recorded', ephemeral: true});
            throw new CommandError(`/#ban elevated ${target}`, `${interaction.member}`);
        } else {
            await interaction.reply(`The user ${target} with uid ${target.id} was banned`);
            target.ban({reason: reason});
            logger.log(`WARN: /#ban ${target}`, `${interaction.member}`);
            interaction.guild.channels.resolve(config["infraction-chan-id"]).send(`<@&${config['bot-manager-role-id']}>s, ${interaction.member} used !#ban on ${target}`);

            return true;
        }
    },

    async execute(message, args) {

        if (!message.member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {
            replies.timedReply(message, "you do not have permission to use this command.", config["bot-alert-timeout"]);
            throw new CommandError("!#ban insufficient perms", `${message.author}`);
        } else if (args.length == 0) {
            replies.timedReply(message, "no user specified, use @ to mention a user", config["bot-alert-timeout"]);
            throw new CommandError("!#ban no user specified", `${message.author}`);
        }

        let member = await getUserFromMention(message, args[0]);

        if (member === undefined) {
            replies.timedReply(message, "user not found, command failed", config["bot-alert-timeout"]);
            throw new CommandError("!#ban user not found", `${message.author}`);

        } else if (member.id === message.author.id) {
            replies.timedReply(message, "you cannot use an admin command on yourself", config["bot-alert-timeout"]);
            throw new CommandError("!#ban use on self", `${message.author}`);

        } else if (member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {
            replies.timedReply(message, "you cannot ban another elevated user. This action was reported to moderators", config["bot-alert-timeout"]);
            report(message, message.author, member);
            throw new CommandError("!#ban elevated user", `${message.author}`);
        }

        member.ban();
        replies.timedReply(message, `we banned ${member}. This action was recorded`, config["bot-alert-timeout"]);
        logger.log(`WARN: banned ${member}`, `${message.author.id}`);
        report(message, message.author, member);
        
        return true;
    }
}