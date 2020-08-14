module.exports = {
    name: 'online',
    description: 'Removes the "Off the Clock" role',
    async execute(message) {
        message.channel.send('pong!');
        return true;
    }
}