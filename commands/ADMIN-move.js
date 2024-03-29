const logger = require('../custom_modules/logging.js');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const replies = require('../custom_modules/replies.js');
const CommandError = require('../custom_modules/commandError.js');

async function getUserFromMention(msg, mention) {
    if (mention.match(/^<@!?(\d+)>$/g)) {
        // Return the id
        let userID = mention.replace(/[\\<>@#&!]/g, "");
        return msg.guild.members.fetch(userID);
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
            if (chan[1].name === 'Voice') {
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
    // slashes: [new SlashCommandBuilder()
    //     .setName('move')
    //     .setDescription('Moves a student from their current channel to a destination channel')
    //     .addUserOption(option =>
    //         option.setName('user')
    //             .setDescription('The user to move')
    //             .setRequired(true))
    // ],

    // permissions: {
    //     kick: {
    //         permissions: [{
    //             id: '750838675763494995',
    //             type: 'ROLE',
    //             permission: true
    //         }]
    //     }
    // },

    async executeInteraction(interaction) { /// DOES NOT WORK
        await interaction.reply({content: 'This command is disabled', ephemeral: true});
        throw new CommandError('#move is disabled');

        const target = await interaction.guild.members.fetch(interaction.options.getUser('user'));
        const reason = interaction.options.getString('reason');
        if (target.id === interaction.member.id) {
            await interaction.reply({content: 'You can\'t move yourself this way (just click on the voice channel)', ephemeral: true});
            throw new CommandError('/#move self', `${interaction.member}`);
        } else if (common.roleCheck(target, config['elevated-roles'])) {
            await interaction.reply({content: 'You can\'t move another elevated user, this action was recorded', ephemeral: true});
            throw new CommandError(`/#move elevated ${target}`, `${interaction.member}`);
        } else {
            // await interaction.reply(`${target} was moved from ${} to ${}`);
            target.kick({reason: reason});
            logger.log(`WARN: /#kick ${target}`, `${interaction.member}`);
            interaction.guild.channels.resolve(config["infraction-chan-id"]).send(`<@&${config['bot-manager-role-id']}>s, ${interaction.member} used !#kick on ${target}`);

            return true;
        }
    },

    async execute(message, args) {
        replies.timedReply(message, `This command is disabled`, config["bot-alert-timeout"]);
        throw new CommandError('#move is disabled');

        if (!message.member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {
            replies.timedReply(message, "you do not have permission to use this command.", config["bot-alert-timeout"]);
            throw new CommandError("!#move insufficient perms", `${message.author}`);

        } else if (args === undefined || args.length < 2) {
            replies.timedReply(message, "the syntax is as follows: \`!move @user #text-channel\`", config["bot-alert-timeout"] * 3);
            throw new CommandError("!#move invalid syntax", `${message.author}`);
        }

        let member = await getUserFromMention(message, args[0]);
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
            member.voice.setChannel(destination);
            replies.timedReply(message, `we moved ${member} to ${text}. This action was recorded`, config["bot-alert-timeout"]);
            logger.log(`WARN: moved ${member} to ${text}`, message.author.id);
            return true;
        }
        
        return true;
    }
}