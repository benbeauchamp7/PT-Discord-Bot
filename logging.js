var fs = require('fs');

// Formatting function (placeholder)
function ph(num) {
	if (num.toString().length < 2) {
		return '0' + num.toString();
	} else {
		return num.toString()
	}
}

module.exports = {
	getTime: function() {
		const now = new Date();
		return `${ph(now.getDate())}/${ph(now.getMonth())}/${ph(now.getFullYear())} ${ph(now.getHours())}:${ph(now.getMinutes())}:${ph(now.getSeconds())}`
	},

	getFilename: function() {
		const now = new Date();
		return `${ph(now.getMonth())}-${ph(now.getDate())}-${ph(now.getFullYear())}.log`
	},

	getErrFilename: function() {
		const now = new Date();
		return `ERROR ${ph(now.getMonth())}-${ph(now.getDate())}-${ph(now.getFullYear())}_${ph(now.getHours())}-${ph(now.getMinutes())}-${ph(now.getSeconds())}.log`
	},

	log: function(message, user) {
		console.log(`${this.getTime()} [${user}]: ${message}`)
		fs.appendFile(`./logs/${this.getFilename()}`, `${this.getTime()} [${user}]: ${message}\n`, (error) => {
			if (error) {
				console.log(">> The file could not be opened <<");
				console.log(error)
			}
		})
	},

	logError: function(err) {
		console.log(`>> ERROR <<\n${err}`)
		fs.appendFile(`./logs/${this.getErrFilename()}`, `${err}\n${err.stack}`, (error) => {
			if (error) {
				console.log(">> The file could not be opened <<");
				console.log(error)
			}
		});
	}
}