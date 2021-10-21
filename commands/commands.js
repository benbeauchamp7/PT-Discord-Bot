// FILE CAN BE DELETED

const logger = require('../custom_modules/logging.js');
const Discord = require("discord.js");

function getEmbed() {
    return new Discord.MessageEmbed()
    .setColor('#500000')
    .setTitle('Commands you can use')
    .addFields(
{ name: "Key", value: `**>** indicates this feature is available to all users
**X** indicates this feature is not available to students`},

{ name: "Queue management", value: `\`!q [@user] \` & \`!q <@user> [into {course | mine}] [at <position>]\`
**>** \`!q\` queues a user. Marked *ready* by default.
**X** \`@user\` specifies a user to queue. If none is provided, your user is chosen.
**X** \`into {course | mine}\` specifies a course to queue into. \`mine\` indicates your personal queue. If \`into\` is not specified, the channel this command is used in is chosen.
**X** \`at <position>\` specifies the number in the queue the user should have.

\`!dq [@user ...]\`
**>** \`!dq\` removes a user from the queue
**X** \`@user ...\` specifies a user or users to dequeue. If none is provided, your user is chosen.

\`!r [@user ...]\`
**>** \`!r\` readies a user in the queue.
**X** \`@user ...\` specifies a user or users to ready. If none is provided, your user is chosen.

\`!nr [@user ...]\`
**>** \`!nr\` marks a user as *not ready* in the queue.
**X** \`@user ...\` specifies a user or users to unready. If none is provided, your user is chosen.`},

{ name: "Viewing the Queue", value: `\`!vq [-{c|e|h|ce|he}] [<@PT> || <@student> || course numbers ... || all || me [for <courses>]]\`
**>** \`!vq\` displays the queue.
**>** \`-c\`: prevent \`nr\` users from being compressed in queue output.
**>** \`-h\`: hides \`nr\` users in the queue output.
**>** \`-e\`: removes 10-person display limit.
**>** \`@PT\` will display a peer teacher's queue based on their accepted courses.
**>** \`@student\` will display a student's place in the queue.
**>** \`course numbers ...\` will display combined queue for all listed course numbers.
**>** \`me\` is an alias for a self mention and will display \`@PT\` or \`@student\` based on the user's designation.
**>** \`for\` will display the user's position based on a spliced queue. Valid with \`me\` or an @student mention.
**>** \`all\` is an alias for all course numbers.
`},


{ name: "Chatroom management", value: `\`!create [name]\`
**>** \`!create\` creates a room that times out after 20mins of inactivity.
**>** \`name\` specifies a name for the channel. If none is specified *unnamed* is used.

\`!sticky [name]\`
**X** \`!sticky\` creates a room that times out after 2hrs of inactivity.
**X** \`name\` specifies a name for the channel. If none is specified *unnamed* is used.

\`!end [now]\`
**>** \`!end\` archives a room. 
**>** \`now\` specifies that a room should skip the archive and be deleted immediately.

\`!topic <name>\`
**>** Renames a room set to *name*.

\`!lock\`
**X** \`!lock\` prevents students other than the ones currently present in a voice channel from joining.

\`!superlock\`
**X** \`!superlock\` prevents all non-moderator users other than those present in the channel from joining.

\`!unlock\`
**X** \`!unlock\` reverses the effects of \`!lock\` and \`!superlock\`.
`},

{ name: "Peer Teaching", value: `\`!online\`
**X** \`!online\` marks you as online.

\`!offline\`
**X** \`!offline\` marks you as offline.
`},

{ name: "Administrative commands", value: `\`!#ban @user\`
**X** \`!#ban\` bans a student.

\`!#dc <@student>\`
**X** \`!#dc\` disconnects a student from a voice channel.

\`!#kick <@student>\`
**X** \`!#kick\` kicks a student from the server.

\`!#move <@student> <#destination>\`
**X** \`!#move\` moves a student to the voice channel under #destination.

\`!#mute <@student>\`
**X** \`!#mute\` toggles server mute for a student.

\`!#unmute <@student>\`
**X** \`!#unmute\` removes server mute from a student.
`}

    )
    .setFooter("This embed will disappear in 5 minutes");
}

module.exports = {
    name: 'commands',
    description: 'lists all commands',
    
    async execute(message) {
        const commands = getEmbed();

        message.channel.send({embeds: [commands]}).then(reply => {
            setTimeout(() => { reply.delete(); }, 5*60*1000);
            setTimeout(() => { message.delete(); }, 5*60*1000);
        });

        return true;
    }
}