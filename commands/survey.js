const logger = require('../custom_modules/logging.js');
const replies = require('../custom_modules/replies.js');
module.exports = {
    name: 'survey',
    description: 'Links a google survey for feedback',
    async execute(message) {

        // replies.timedReply(msg, "there are no active surveys at this time, thanks for checking though!", config['bot-alert-timeout'])
        // throw new CommandError(`!survey offline`, `${msg.author}`);

        message.channel.send('https://forms.gle/qHHuCk1Prjwsj7GY8').then(reply => {
			reply.delete({'timeout': 3600000});
            message.delete({'timeout': 3600000});
            message.channel.send("This message will disappear in 1 hour").then(reply => {
                reply.delete({'timeout': 3600000});
            })
		})
    }
}