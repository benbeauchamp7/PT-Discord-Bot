const fs = require('fs');
const logger = require('../custom_modules/logging.js');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const replies = require('../custom_modules/replies.js');
const CommandError = require('../custom_modules/commandError.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'unlock',
    description: 'allows other users to join a voice channel',
    slashes: [
        new SlashCommandBuilder()
            .setName('unlock')
            .setDescription('Allows other users to join a voice channel that was previously locked')
    ],

    permissions: {
        unlock: {
            permissions: [{
                id: '750838675763494995',
                type: 'ROLE',
                permission: true
            }]
        }
    },

    async executeInteraction(interaction, data) {
        if (!interaction.member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {
            // insufficient permissions
            interaction.reply({content: "You do not have permission to use this command", ephemeral: true});
            throw new CommandError("!unlock insufficient permissions", `${interaction.member}`);
        }

        const parent = interaction.channel.parent;
        if (!parent.name.endsWith(config['student-chan-specifier']) && !parent.name.endsWith(config['sticky-chan-specifier'])) {
            // Incorrect Channel
            interaction.reply({content: "You can only use this in a temporary chat room", ephemeral: true});
            throw new CommandError("!unlock wrong room", `${interaction.member}`);
        }

        let voiceChan = interaction.member.voice.channel;
        if (!(voiceChan !== null && voiceChan.parent === parent)) {
            // You must be in the corresponding voice channel
            interaction.reply({content: "You must be in this room's voice channel to use this command", ephemeral: true});
            throw new CommandError("!unlock not in VC", `${interaction.member}`);
        }

        // Add back all permissions
        voiceChan.lockPermissions().then(() => {
            interaction.reply("We've unlocked the channel, anyone can join now!");
            logger.log(`unlocked #${parent.name}`, `${interaction.member}`)
        });
    },

    async execute(message) {
        
        // Elevated check
        if (message.member.roles.cache.find(r => config['elevated-roles'].includes(r.name))) {

            // Used in a temp set
            const parent = message.channel.parent;
            if (parent.name.endsWith(config['student-chan-specifier'] || chan.name.endsWith(config['sticky-chan-specifier']))) {

                // While in a matching voice channel
                let voiceChan = message.member.voice.channel;
                if (voiceChan !== null && voiceChan.parent === parent) {
                    // Add back all permissions
                    voiceChan.lockPermissions().then(() => {
                        message.reply("We've unlocked the channel, anyone can join now!");
                        logger.log(`unlocked #${parent.name}`, `${message.author}`)

                    });

                } else {
                    // You must be in the corresponding voice channel
                    replies.timedReply(message, "you must be in this room's voice channel to use this command", config['bot-alert-timeout']);
                    throw new CommandError("!unlock not in VC", `${message.author}`);
                }

            } else {
                // Incorrect Channel
                replies.timedReply(message, "you can only use this in a temporary chat room", config['bot-alert-timeout']);
                throw new CommandError("!unlock wrong room", `${message.author}`);
            }

        } else {
            // insufficient permissions
            replies.timedReply(message, "you do not have permission to use this command", config['bot-alert-timeout']);
            throw new CommandError("!unlock insufficient permissions", `${message.author}`);
        }


        return true;
    }
}