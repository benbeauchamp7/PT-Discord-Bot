const logger = require('../custom_modules/logging.js');
const Discord = require("discord.js");
const { SlashCommandBuilder } = require('@discordjs/builders');

function getCommands() {
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
}

function getHelp() {
    return new Discord.MessageEmbed()
        .setColor('#500000')
        .setTitle('Commands you can use')
        .addFields(
{ name: "Getting Started", value: `1. Use /nick to set your name to your first and last
2. Visit <#737169678677311578> to enroll in courses
3. Use \`!q\` in a csce channel to ask a peer teacher for help (don't jump straight into a voice chat with an unsuspecting PT)`},

{ name: "Queues", value: `\`!q\`
> Queues you into the channel you use it in
\`!dq\`
> Removes you from the queue
\`!vq\`
> Shows the queue for the current channel.
\`!r\`
> Marks you as **ready** to get help from a peer teacher
\`!nr\`
> Marks you as **not ready**. Use this if you go to class, or otherwise won't be available to join a PT's office hours.
`},

{ name: "Office Hours", value: `[A link to the website](https://engineering.tamu.edu/cse/academics/peer-teachers/current-peer-teachers.html)`},

{ name: "Comments or concerns?", value: `Be nice to the bot. If something goes wrong or if something is broken, DM <@335481074236915712> and he'll sort it out for ya`}
        )
        .setFooter("This embed will disappear in 15 minutes");
}

function getPTcommands() {
    return new Discord.MessageEmbed()
        .setColor('#500000')
        .setTitle('Commands you can use')
        .addFields(
        	{ name: "Queues", value: `\`!q\` & \`!enqueue\`
> Adds the member who used it to the queue related to the channel it was used in
> PTs can mention a user to queue up another student. Ie. using \`!q @Bob Ross\` in the 221 general chat would add Bob Ross to the 221 queue
\n\`!dq\` & \`!dequeue\`
> Removes a member from any queues they may be in
> PTs can mention a user to remove them from the queue. Ie. using \`!dq @Fred Rogers\` would remove Mr. Rogers from any queues he may be in
\n\`!vq\` & \`!viewqueue\`
> When used without arguments, lists the entire queue for the course the command is used in
> When used with course numbers, lists the first entries of a queue of the mentioned courses. Ie. \`!vq 121 221 315\` would list users who joined first out of those three courses
> When mentioning a student, will give their current spot in line.
> When mentioning a peer teacher, will list out the queue for that PT's courses (using the enrollment system). Ie. if Keanu PTd 121 and 312, using \`!vq @Keanu Reeves\` would output the same thing as \`!vq 121 312\``},
			{ name: "Chatroom management", value: `\`!create [name]\`
> When used in #create-room, creates a chatroom with the specified name.
\n\`!end\`
> When used in a student created room, immediately ends the room and archives it
\n\`!topic [name]\`
> When used in a temporary room, this command renames the room (in case of a topic change)
\n\`!lock\`
> When used in a temporary room, this command prevents students not in the corresponding voice channel from joining. In other words, it locks everyone else out (staff may still join the room).
\n\`!unlock\`
> When used in a temporary room, this command allows anyone to join the corresponding voice channel.
			`}
        )
}

module.exports = {
    name: 'help',
    description: 'basic ping command',
    slashes: [new SlashCommandBuilder()
        .setName('help')
        .setDescription('Displays an embed of commands')
        .addSubcommand(subcommand =>
            subcommand.setName('students')
                .setDescription('Display the student help embed'))
        .addSubcommand(subcommand =>
            subcommand.setName('peer-teacher')
                .setDescription('Display the Peer Teacher help embed'))
        .addSubcommand(subcommand =>
            subcommand.setName('full-help')
                .setDescription('Display the entire command embed'))
                
    ],

    permissions: {
        help: {
            permissions: [{
                id: '804540323367354388',
                type: 'ROLE',
                permission: true
            }]
        }
    },

    async executeInteraction(interaction) {
        const subcommand = interaction.options.getSubcommand();
        let embed;
        switch(subcommand) {
            case 'students': embed = getHelp(); break;
            case 'peer-teacher': embed = getPTcommands(); break;
            case 'full-help': embed = getCommands(); break;
        }

        await interaction.reply({embeds: [await embed], ephemeral: true});
        return true;
    },

    async execute(message) {
        const commands = getHelp();

        message.channel.send({embeds: [commands]}).then(reply => {
            setTimeout(() => { reply.delete(); }, 900000);
            setTimeout(() => { message.delete(); }, 900000);
        });

        return true;
    }
}