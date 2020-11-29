const readline = require('readline');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));

module.exports = {
    // queue maps courses to {user, time} objects
	saveQueue: function(queue) {

        // Clear the file
        fs.writeFile(config['queue-file-path'], '', (error) => {
			if (error) {
				console.log(">> The file could not be opened <<");
				console.log(error)
			}
        });
        
        // Go through all courses
        for (let [course, objList] of queue) {
            // Write to the file in the form 'course,user,time'
            for (let i = 0; i < objList.length; i++) {

                let o = objList[i];
                let rdyStr = o.ready || o.ready === undefined ? true : false

                fs.appendFile(config['queue-file-path'], `${course},${o.user},${o.time.toString()},${rdyStr}\n`, (error) => {
                    if (error) {
                        console.log(">> The file could not be opened <<");
                    }
                });
            }
        }
    },

    loadQueue: function() {

        // Instantiate queue with lists
        let queue = new Map();
        for (course of config['course-channels']) {
            queue.set(course, []);
        }


        // Make sure the file exists
        if (fs.existsSync(config['queue-file-path'])) {

            const readInterface = readline.createInterface({
                input: fs.createReadStream(config['queue-file-path']),
                output: null,
                console: false
            });

            readInterface.on('line', (line) => {
                let data = line.split(',');
                if (!queue.has(data[0])) {
                    queue.set(data[0], []);
                }

                queue.get(data[0]).push( {user: data[1], time: parseInt(data[2], 10), ready: data[3] === 'true' || data[3] === undefined ? true : false} );
            });
        }
        return queue;
    }
}