const logger = require('../custom_modules/logging.js');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const CommandError = require('../custom_modules/commandError.js');
const save = require('../custom_modules/save.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'offline',
    description: 'Adds the "Off the Clock" role',
    slashes: [
        new SlashCommandBuilder()
            .setName('offline')
            .setDescription('Marks you as Off the Clock')
    ],

    permissions: {
        offline: {
            permissions: [{
                id: '731672600367071273',
                type: 'ROLE',
                permission: true
            }]
        }
    },

    async executeInteraction(interaction, data) {
        if (interaction.member.roles.cache.find(r => ["Off the Clock", "Peer Teacher"].includes(r.name))) {
            interaction.member.roles.add("743870484898250753"); // Add off the clock
            interaction.member.roles.remove("731672600367071273"); // Remove PT

            let goodbyes = ['¡Adiós!', 'Arrivederci!', 'Au Revoir!', 'Adeus!', 'Auf Wiedersehen!', 'Sayōnara!', 'Do svidaniya!', 'Annyeong!', 'Tot ziens!'];
            interaction.reply({content: goodbyes[Math.floor(Math.random() * goodbyes.length)], ephemeral: true});
            logger.log("/online", `${interaction.member}`);
            return true;
        }

        throw new CommandError("/online incorrect person", `${interaction.member}`);
    },

    async execute(message, args, options) {
        let queues = options.queues;
        if (message.member.roles.cache.find(r => ["Off the Clock", "Peer Teacher", "Professor"].includes(r.name))) {
            message.guild.members.fetch(message.author).then((user) => { user.roles.add("743870484898250753"); }); // Add off the clock
            message.guild.members.fetch(message.author).then((user) => { user.roles.remove("731672600367071273"); }); // Remove PT
            
            message.channel.send(`Adios ${message.author}!`).then(reply => {
                setTimeout(() => { reply.delete(); }, config['bot-alert-timeout']);
                setTimeout(() => { message.delete(); }, config['bot-alert-timeout']);
            });

            logger.log("!offline", `${message.author}`);

            // Reset the !offline user's personal queue
            if (queues.has(`<@${message.author.id}>`)) {
                queues.set(`<@${message.author.id}>`, []);
                save.saveQueue(queues);
                options.updateQueues.val = true;
            }

            return true;
        }

        throw new CommandError("!offline insufficient permission", `${message.author}`);
    }
}