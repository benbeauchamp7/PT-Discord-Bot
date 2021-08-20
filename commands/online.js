const logger = require('../custom_modules/logging.js');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const CommandError = require('../custom_modules/commandError.js');

module.exports = {
    name: 'online',
    description: 'Removes the "Off the Clock" role',
    async execute(message) {
        if (message.member.roles.cache.find(r => ["Off the Clock", "Peer Teacher", "Professor"].includes(r.name))) {
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