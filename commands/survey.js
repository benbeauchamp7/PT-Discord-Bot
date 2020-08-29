const logger = require('../logging.js');
module.exports = {
    name: 'survey',
    description: 'Links a google survey for feedback',
    async execute(message) {
        message.channel.send('This message will disappear in 5 minutes\n').then(reply => {
			reply.delete({'timeout': 300000});
			message.delete({'timeout': 300000});
		})
    }
}