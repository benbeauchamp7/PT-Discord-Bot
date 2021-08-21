const { SlashCommandBuilder } = require('@discordjs/builders');

// It just pings to be sure the bot is alive
module.exports = {
    name: 'ping',
    description: 'basic ping command',
    slashes: [
        new SlashCommandBuilder()
            .setName('ping')
            .setDescription('basic ping command')
    ],

    permissions: {
        ping: {
            permissions: [{
                id: '804540323367354388',
                type: 'ROLE',
                permission: true
            }]
        }
    },

    async executeInteraction(interaction) {
        await interaction.reply('pong!')
    },

    async execute(message) {
        message.channel.send('pong!');
        return true;
    }
}