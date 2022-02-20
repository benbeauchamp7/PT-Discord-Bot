const logger = require('../custom_modules/logging.js');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const CommandError = require('../custom_modules/commandError.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'online',
    description: 'Removes the "Off the Clock" role',
    slashes: [
        new SlashCommandBuilder()
            .setName('online')
            .setDescription('Marks you as an online peer teacher')
    ],

    permissions: {
        online: {
            permissions: [{
                id: '743870484898250753',
                type: 'ROLE',
                permission: true
            }]
        }
    },

    async executeInteraction(interaction, data) {
        if (interaction.member.roles.cache.find(r => ["Off the Clock", "Peer Teacher"].includes(r.name))) {
            interaction.member.roles.remove("743870484898250753"); // Remove off the clock
            interaction.member.roles.add("731672600367071273"); // Restore PT
            interaction.reply({content: "Welcome back!", ephemeral: true});
            logger.log("/online", `${interaction.member}`);
            return true;
        }

        throw new CommandError("/online incorrect person", `${interaction.member}`);
    },

    async execute(message) {
        if (message.member.roles.cache.find(r => ["Off the Clock", "Peer Teacher"].includes(r.name))) {
            message.guild.members.fetch(message.author).then((user) => { user.roles.remove("743870484898250753"); }); // Remove off the clock
            message.guild.members.fetch(message.author).then((user) => { user.roles.add("731672600367071273"); }); // Restore PT
            
            message.channel.send(`Welcome back ${message.author}`).then(reply => {
                setTimeout(() => { reply.delete(); }, config['bot-alert-timeout']);
                setTimeout(() => { message.delete(); }, config['bot-alert-timeout']);
            });

            logger.log("!online", `${message.author}`)

            return true;
        }

        throw new CommandError("!offline insufficient permission", `${message.author}`);
    }
}