const logger = require('../custom_modules/logging.js');
const Discord = require("discord.js");

module.exports = {
    name: 'help',
    description: 'basic ping command',
    async execute(message) {
        const commands = new Discord.MessageEmbed()
                .setColor('#0099ff')
                .setTitle('Commands you can use')
                .addFields(
                    { name: "Getting Started", value: `1. Use /nick to set your name to your first and last
2. Visit <#737169678677311578> to enroll in courses
3. Use !q in a csce channel to ask a peer teacher for help (don't jump straight into a voice chat with an unsuspecting PT)`},

                    { name: "Queues", value: `\`!q\`
> Queues you into the channel you use it in
\n\`!dq\`
> Removes you from the queue
\n\`!vq\`
> Shows the queue for the current channel.`},

                    { name: "Office Hours", value: `[A link to the website](https://engineering.tamu.edu/cse/academics/peer-teachers/current-peer-teachers.html)`},

                    { name: "Comments or concerns?", value: `Be nice to the bot. If something goes wrong or if something is broken, DM <@335481074236915712> and he'll sort it out for ya`}
                )
                .setFooter("This embed will disappear in 15 minutes");

        message.channel.send(commands).then(reply => {
            reply.delete({'timeout': 900000});
            message.delete({'timeout': 900000});
        });

        return true;
    }
}