const fs = require('fs');

// Formatting function (adds placeholder zero for logging)
function ph(num) {
	if (num.toString().length < 2) {
		return '0' + num.toString();
	} else {
		return num.toString()
	}
}

module.exports = {
	// Creates a date string that is formatted nicely
	getTime: function() {
		const now = new Date();
		return `${ph(now.getDate() + 1)}/${ph(now.getMonth())}/${ph(now.getFullYear())} ${ph(now.getHours())}:${ph(now.getMinutes())}:${ph(now.getSeconds())}`
	},

	// Creates a filename based on the current date
	getFilename: function() {
		const now = new Date();
		return `${ph(now.getMonth() + 1)}-${ph(now.getDate())}-${ph(now.getFullYear())}.log`
	},

	// Creates an Error filename based on the date and time
	getErrFilename: function() {
		const now = new Date();
		return `ERROR ${ph(now.getMonth() + 1)}-${ph(now.getDate())}-${ph(now.getFullYear())}_${ph(now.getHours())}-${ph(now.getMinutes())}-${ph(now.getSeconds())}.log`
	},

	// Writes a message to the end of a file
	log: function(message, user) {
		console.log(`${this.getTime()} [${user}]: ${message}`)
		fs.appendFile(`./logs/${this.getFilename()}`, `${this.getTime()} [${(user.charAt(0) === '#') ? `'${user}'` : user}]: ${message}\n`, (error) => {
			if (error) {
				console.log(">> The file could not be opened <<");
				console.log(error)
			}
		})
	},

	// Writes an error to disk
	logError: function(err) {
		console.log(`>> ERROR <<\n${err}`)
		fs.appendFile(`./logs/${this.getErrFilename()}`, `${err.stack}`, (error) => {
			if (error) {
				console.log(">> The file could not be opened <<");
				console.log(error)
			}
		});
	}
}