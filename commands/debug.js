// Just a general command you can configure to print out data into the discord channel
module.exports = {
    name: 'debug',
    description: 'debug command',
    async execute(message, args, options) {
        message.reply(options.cycle);
    }
}