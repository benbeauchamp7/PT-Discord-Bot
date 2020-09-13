const logger = require('../logging.js');
const Discord = require("discord.js");

module.exports = {
    name: 'pt-commands',
    description: 'basic ping command',
    async execute(message) {
        const commands = new Discord.MessageEmbed()
                .setColor('#0099ff')
                .setTitle('Commands you can use')
                .addFields(
                    { name: "Queues", value: `\`!q @user\` & \`!enqueue @user\`
> Adds a user to the queue of that course
\n\`!dq @user\` & \`!dequeue @user\`
> Removes a user from the queue they're in
\n\`!vq [@user || course numbers || all || me]\` & \`!viewqueue [...]\`
> Shows queue for [course numbers], all courses if \`all\` is used, or a pt's courses if they are mentioned. Using \`me\` is equivalent to a self mention`},

                    { name: "Chatroom management", value: `\`!create [name]\`
> Creates a room that times out after 20mins of inactivity
\n\`!sticky [name]\`
> Creates a room that times out after 2hrs of inactivity
\n\`!end [now]\`
> Archives a room. If the 'now' argument is used, the room is deleted instead
\n\`!topic <name>\`
> Renames a room set
\n\`!lock\`
> Prevents students other than the ones currently present in a voice channel from joining
\n\`!superlock\`
> Prevents all non-moderator users other than those present in the channel from joining
\n\`!unlock\`
> Reverses the effects of \`!lock\` and \`!superlock\``},

                    { name: "Administrative commands", value: `\`!#ban @user\`
> Bans a student, this action is monitored
\n\`!#dc @user\`
> Disconnects a student, this action is monitored
\n\`!#kick @user\`
> Kicks a student from the server, this action is monitored
\n\`!#move @user #destination\`
> Moves a student to the voice channel under #destination, this action is monitored
\n\`!#mute @user\`
> Toggles server mute for a student, this action is monitored`}
                )
                .setFooter("This embed will disappear in 3 minutes");;

        message.channel.send(commands).then(reply => {
            reply.delete({'timeout': 180000});
            message.delete({'timeout': 180000});
        });

        return true;
    }
}