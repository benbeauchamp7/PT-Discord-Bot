module.exports = {
    name: 'ping',
    description: 'basic ping command',
    execute(message, args, config) {
        message.channel.send('pong!');
    }
}