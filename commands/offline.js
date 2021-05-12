const logger = require('../custom_modules/logging.js');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const CommandError = require('../custom_modules/commandError.js');
const save = require('../custom_modules/save.js')

module.exports = {
    name: 'offline',
    description: 'Adds the "Off the Clock" role',
    async execute(message, args, options) {
        let queues = options.queues;
        if (message.member.roles.cache.find(r => ["Off the Clock", "Peer Teacher", "Professor"].includes(r.name))) {
            message.guild.member(message.author).roles.add("743870484898250753"); // Add off the clock
            message.guild.member(message.author).roles.remove("731672600367071273"); // Remove PT
            
            message.channel.send(`Adios ${message.author}!`).then(reply => {
                reply.delete({'timeout': config['bot-alert-timeout']});
                message.delete({'timeout': config['bot-alert-timeout']});
            });

            logger.log("!offline", `${message.author}`);

            // Reset the !offline user's personal queue
            if (queues.has(`<@${message.author.id}>`)) {
                queues.set(`<@${message.author.id}>`, []);
                save.saveQueue(queues);
            }

            return true;
        }

        throw new CommandError("!offline insufficient permission", `${message.author}`);
    }
}