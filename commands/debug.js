module.exports = {
    name: 'debug',
    description: 'debug command',
    async execute(message, args, options) {
        message.reply(options.cycle);
    }
}