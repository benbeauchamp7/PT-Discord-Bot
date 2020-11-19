const logger = require('../custom_modules/logging.js');
module.exports = {
    name: 'survey',
    description: 'Links a google survey for feedback',
    async execute(message) {
        message.channel.send('https://forms.gle/ZhiFS4AkzWxY1tzR7').then(reply => {
			reply.delete({'timeout': 3600000});
            message.delete({'timeout': 3600000});
            message.channel.send("This message will disappear in 1 hour").then(reply => {
                reply.delete({'timeout': 3600000});
            })
		})
    }
}