const logger = require('../custom_modules/logging.js');
module.exports = {
    name: 'ping',
    description: 'basic ping command',
    async execute(message) {
        message.channel.send('pong!');
        return true;
    }
}