const logger = require('./logging.js');
const Discord = require("discord.js");

module.exports = {
    name: 'ptinfo',
    description: 'Displays the pt welcome message',
    async execute(message) {
		if (!message.member.roles.cache.find(r => r.name === "Bot Manager")) { return false; }
		
		const welcome = new Discord.MessageEmbed()
                .setColor('#0099ff')
                .setTitle('Things to get started')
                .addFields(
					{ name: "Getting started", value: `Before starting, be sure you do a few things
• Use \`/nick\` to change your username to your full (first and last) name.
• Message <@335481074236915712> and let him know to mark you as a peer teacher. Doing this after students are in the server will make him nervous, so try to get it done as soon as possible.
• Get used to discord! Hop around in channels, use commands, and give the queue system a try.
• Feel free to message <@335481074236915712> with any questions, quality of life suggestions, or bug you've found and he'll try his best to get it sorted out.
					`},
					{ name: "Duties", value: `• Answer questions, provide resources, and check chatrooms to ask if students need help
• Use the queue system to keep PT rotations ordered. After students have been helped, remove them from the queue using \`!dq @user\`. Your spceific queue can be accessed by \`!vq @yourself\` where yourself is your username. This can only be done after you have enrolled in your courses in the #course-enrollment channel.
• When not working, use \`!offline\` in the teacher's lounge channel so that students know not to ask you questions. When comming back online, use \`!online\` to mark yourself as such.
• When possible, pin homework assignments in their repsective channels. This can be done by any PT (don't abuse it) so that everyone has quick access to assignments when helping students. These pinned messages should be files, and can be removed shortly after their due date or when they become irrelevant.
					`}
				)
		
		const commands = new Discord.MessageEmbed()
                .setColor('#0099ff')
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
> When used in a student create room, this command renames the room (in case of a topic change)
					`}
                )

        message.channel.send(welcome).then(() => {
			message.channel.send(commands);
		});

        return true;
    }
}