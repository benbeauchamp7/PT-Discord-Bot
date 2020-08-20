const logger = require('./logging.js');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));

module.exports = {
    name: 'offline',
    description: 'Adds the "Off the Clock" role',
    async execute(message) {
        if (message.member.roles.cache.find(r => ["Off the Clock", "Peer Teacher", "Professor"].includes(r.name))) {
            message.guild.member(message.author).roles.add("743870484898250753"); // Add off the clock
            message.guild.member(message.author).roles.remove("731672600367071273"); // Remove PT
            
            message.channel.send(`Adios ${message.author}!`).then(reply => {
                reply.delete({'timeout': config['bot-alert-timeout']});
                message.delete({'timeout': config['bot-alert-timeout']});
            });

            logger.log("!offline", `${message.author.name}`)

            return true;
        }

        return false;
    }
}