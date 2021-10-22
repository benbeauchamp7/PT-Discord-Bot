const logger = require('../custom_modules/logging.js');
const replies = require('../custom_modules/replies.js');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    name: 'survey',
    description: 'Links a google survey for feedback',
    slashes: [
        new SlashCommandBuilder()
            .setName('survey')
            .setDescription('Gives the link to the peer teacher survey!')
    ],

    permissions: {
        survey: {
            permissions: [{
                id: '804540323367354388',
                type: 'ROLE',
                permission: false // SET TO TRUE WHEN SURVEY IS LIVE
            }]
        }
    },

    async executeInteraction(interaction, data) {
        await interaction.reply({content: "YOUR LINK HERE", ephemeral: false});
    },

    async execute(message) {

        replies.timedReply(message, "there are no active surveys at this time, thanks for checking though!", config['bot-alert-timeout'])
        throw new CommandError(`!survey offline`, `${message.author}`);

        // message.channel.send('https://forms.gle/qHHuCk1Prjwsj7GY8').then(reply => {
		// 	reply.delete({'timeout': 3600000});
        //     message.delete({'timeout': 3600000});
        //     message.channel.send("This message will disappear in 1 hour").then(reply => {
        //         reply.delete({'timeout': 3600000});
        //     })
		// })
    }
}