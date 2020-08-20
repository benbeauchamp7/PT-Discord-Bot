var fs = require('fs');

module.exports = {
	getTime: function() {
		const now = new Date();
		return `${now.getDate()}/${now.getMonth()}/${now.getFullYear()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`
	},

	getFilename: function() {
		const now = new Date();
		return `${now.getDate()}-${now.getMonth()}-${now.getFullYear()}.log`
	},

	getErrFilename: function() {
		const now = new Date();
		return `ERROR ${now.getDate()}-${now.getMonth()}-${now.getFullYear()}_${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}.log`
	},

	log: function(message, user) {
		fs.appendFile(`./logs/${this.getFilename()}`, `${this.getTime()} [${user}]: ${message}\n`, () => {
			console.log(">> The file could not be opened <<");
		})
	},

	logError: function(err) {
		fs.appendFile(`./logs/${this.getErrFilename()}`, `${err}`, () => {
			console.log(">> The file could not be opened <<");
		});
	}
}