module.exports = {
    name: 'ping',
    description: 'basic ping command',
    async execute(message, args, config) {
        message.channel.send('pong!');
        return true;
    }
}