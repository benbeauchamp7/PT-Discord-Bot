const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const rest = new REST({version: '9'}).setToken(process.env.BOT_TOKEN);
const fs = require("fs");
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const logger = require('../custom_modules/logging.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

// It just pings to be sure the bot is alive
module.exports = {
    name: 'sys-deregister',
    description: 'Unregisters all slash commands and shuts down the bot',
    slashes: [
        new SlashCommandBuilder()
            .setName('sys-deregister')
            .setDescription('Unregisters all slash commands and shuts down the bot')
    ],

    permissions: {
        'sys-deregister': {
            permissions: [{
                id: '731673496656019457',
                type: 'ROLE',
                permission: true
            }]
        }
    },

    async executeInteraction(interaction, data) {
        logger.log("Deregistration requested", `${interaction.member}`);

        const promises = [];
        let rest_ret = await rest.get(Routes.applicationGuildCommands(process.env.BOT_ID, config['guildId']))

        for (const command of rest_ret) {
            const deleteUrl = `${Routes.applicationGuildCommands(process.env.BOT_ID, config['guildId'])}/${command.id}`;
            promises.push(rest.delete(deleteUrl));
        }

        
        await interaction.reply('Waiting deletion...');
        await Promise.all(promises);
        await interaction.followUp('Done! Shutting down...');
        process.emit('SIGTERM');
    },

    async execute(message) {
        message.channel.send('Use the slash version of this command');
        return true;
    }
}