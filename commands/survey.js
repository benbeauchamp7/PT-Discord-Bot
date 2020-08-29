const logger = require('../logging.js');
module.exports = {
    name: 'survey',
    description: 'Links a google survey for feedback',
    async execute(message) {
        message.channel.send('https://docs.google.com/forms/d/e/1FAIpQLScBD2YuvAWCFR9Jf6gkS2z9bMgk9xDTkVfh_he_Nw8noJ92oQ/viewform \nThis message will disappear in 5 minutes').then(reply => {
			reply.delete({'timeout': 300000});
			message.delete({'timeout': 300000});
		})
    }
}