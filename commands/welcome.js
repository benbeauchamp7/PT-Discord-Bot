const Discord = require('discord.js');

module.exports = {
    name: 'welcome',
    description: 'Welcome message',
    async execute(message) {

        if (!message.member.roles.cache.find(r => r.name === "Bot Manager")) { return false; }

        const embed = new Discord.MessageEmbed()
                .setColor('#0099ff')
                .setTitle('Welcome to the online Fish Bowl!')
                .addFields(
                    { name: 'Intros', value: 'This server is the online equivilent of Peer Teacher Central (PTC) located in HRBB 129, sometimes known as the "Fish Bowl".'},
                    { name: 'Enroll in your courses', value: 'To get started, visit the "course enrollment" channel to pick the course you are in. These will unlock general channels for you to chat in with other students or Peer Teachers.'},
                    { name: 'Creating rooms', value: `If you find yourself wanting to have a more focused discussion, you can create your own text/voice room set by clicking on "Click to create a new room" or by using the \`!create <topic>\` command in the "create-room" text channel. When you're done with the room, use \`!end\` to clean everything up. The text channel will be archived for a few days so that you can go back and check on any converstaions you had (be sure to save what you want to keep!). The rooms will also timeout if the text channel has been inactive and the voice channel is empty.`},
                    { name: 'Use your real name', value: "Second, be sure to use your *real name* (first and last) on the server! You can do this by using \`/nick <your name>\` in any channel you can type in."},
                    { name: "Queueing System", value: `You may also join a queue system for your course to ensure PTs are dispersed more fairly. The channel you use these commands in is important, as it will determine which PTs can come to help you. If you need help with a 221 project, you'd queue yourself in the "csce-221" channel. Then any 221 PTs will be able to find you in the order you joined.\n
Here are the commands you can use with the queue system.
> To join: \`!enqueue\` or \`!q\` in a general course text channel
> To leave: \`!dequeue\` or \`!dq\` in a course channel
> To view: \`!viewqueue\` or \`!vq\` in a course channel\n`},
                    { name: "\u200b", value: `The view command can also be used with arguments to see what order students joined the queue. For example, \`!vq 121 221 312\` will show students who joined first out of the three listed coursees.
Furthermore, you can also use \`!vq <PT mention>\` to see what order a specific peer teacher will follow when visiting students.
To see where you are in line, use \`!vq <Self mention>\`\n
After some time, inactive users will be removed from the queue- so be sure to stay with your computer while you wait!`},
                    { name: "Office Hours", value: "If you're looking for some 1-on-1 help, <#737074178871787552> has a link to a google Calendar where you can find out when your PTs will be online."},
                    { name: "Aggie Honor Code", value: `Lastly, the Aggie Honor Code applies here, which means:
> ***Don't share your code.*** Even if it's just with your project team- anybody can view the text channels in student rooms you create. If a Peer Teacher asks to see your code (their name will be in blue), you may send it to them with a private message.
> You are free to chat about assignments in any of the appropriate channels, provided you adhere to the professors discression of "fair discussion". When in doubt, don't talk about the assignment, we take this very seriously.`},
                    { name: "Wrapup", value: "And that's about all! Any issues or suggestions with bot commands can be DMed to any users with the <@&731673496656019457> role in maroon, or the server owner. PT BOT is home grown and hosted on a Raspberry Pi sitting on a desk in someone's bedroom, so be kind to it."}
                )

        message.channel.send(embed);

        return true;
        
        
    }
}