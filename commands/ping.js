// It just pings to be sure the bot is alive
module.exports = {
    name: 'ping',
    description: 'basic ping command',
    async execute(message) {
        message.channel.send('pong!');
        return true;
    }
}