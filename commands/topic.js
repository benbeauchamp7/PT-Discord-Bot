const fs = require('fs');
const logger = require('../custom_modules/logging.js');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const CommandError = require('../custom_modules/commandError.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'topic',
    description: 'Renames a student chat room set',
    slashes: [
        new SlashCommandBuilder()
            .setName('topic')
            .setDescription('Renames a temporary chat room')
            .addStringOption(option => 
                option.setName('name')
                    .setDescription('The new name of the chat room')
                    .setRequired(true))
    ],

    permissions: {
        topic: {
            permissions: [{
                id: '804540323367354388',
                type: 'ROLE',
                permission: true
            }]
        }
    },

    async executeInteraction(interaction, data) {
        const chan = interaction.channel;
        const newName = interaction.options.getString('name');

        if (!chan.parent.name.endsWith(config['student-chan-specifier']) && !chan.parent.name.endsWith(config['sticky-chan-specifier'])) {
            await interaction.reply({content: `You can only use this command in student-created discussion rooms`, ephemeral: true});
            throw new CommandError("/topic wrong room", `${interaction.member}`);
        }

        const suffix = (chan.parent.name.endsWith(config['student-chan-specifier'])) ? config['student-chan-specifier'] : config['sticky-chan-specifier'];
        chan.parent.setName(`${newName} ${suffix}`);
        chan.setName(newName).then(() => {
            interaction.reply({content: "Done!", ephemeral: false});
        });
    },

    async execute(message, args) {

        const timeout = config['bot-alert-timeout'];
        const chan = message.channel;

        if (chan.parent.name.endsWith(config['student-chan-specifier'])) {
            // Rename the temp room

            chan.parent.setName(args.join(' ') + " " + config['student-chan-specifier']);
            chan.setName(args.join('-')).then(() => {
                message.react('✅');
            });

            return true;

        } else if (chan.parent.name.endsWith(config['sticky-chan-specifier'])) {
            // Rename the sticky room

            chan.parent.setName(args.join(' ') + " " + config['sticky-chan-specifier']);
            chan.setName(args.join('-')).then(() => {
                message.react('✅');
            });;

            return true;

        } else {
            message.reply(`You can only use this command in student-created discussion rooms`).then(reply => {
                setTimeout(() => { reply.delete(); }, timeout);
                setTimeout(() => { message.delete(); }, timeout);
            });
            
            throw new CommandError("!topic wrong room", `${message.author}`);
        }
    }
}