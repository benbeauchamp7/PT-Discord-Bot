const readline = require('readline');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
const logging = require("./logging.js")

const AWS = require('aws-sdk');
const s3ID = process.env.AWS_ACCESS_KEY_ID;
const s3KEY = process.env.AWS_SECRET_ACCESS_KEY;
const s3Bname = process.env.S3_BUCKET_NAME;

const s3 = new AWS.S3({
    accessKeyId: s3ID,
    secretAccessKey: s3KEY
});

function parseTime(time) {
    if (isNaN(time)) { return time; }
    return parseInt(time, 10);
}

module.exports = {
    // queue maps courses to {user, time} objects
	saveQueue: function(queue) {

        // Clear the file
        fs.writeFileSync(config['queue-file-path'], '', (error) => {
			if (error) {
				console.log(">> The file could not be opened <<");
				logging.logError(error);
			}
        });
        
        // Go through all courses
        for (let [course, objList] of queue) {
            // Write to the file in the form 'course,user,time'
            for (let i = 0; i < objList.length; i++) {

                let o = objList[i];
                let rdyStr = o.ready || o.ready === undefined ? true : false

                fs.appendFileSync(config['queue-file-path'], `${course},${o.user},${o.time.toString()},${rdyStr},${o.readyTime.toString()}\n`, (error) => {
                    if (error) {
                        console.log(">> The file could not be opened <<");
                        logging.logError(error);
                    } else {
                        logging.log("queue saved", "#system");
                    }
                });
            }
        }
    },

    // Just uploads the queue file to s3
    uploadQueue: async function() {
        logging.log("uploading queue", "#system");
        
        const content = fs.readFileSync(config['queue-file-path']);
        const params = {
            Bucket: s3Bname,
            Key: config['queue-file-path'],
            Body: content
        };
        
        return s3.upload(params, function(err, data) {
            if (err) {
                console.log(">> The file could not saved to S3 <<");
                logging.logError(err);
            } else {
                logging.log("queue uploaded", "#system");
            }
        }).promise();
    },

    loadQueueLocalOnly: function() {

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

                queue.get(data[0]).push({
                    user: data[1], 
                    time: parseTime(data[2]), 
                    ready: data[3] === 'true' || data[3] === undefined ? true : false,
                    readyTime: data[4] === undefined ? 0 : parseTime(data[4])
                });
            });
        }
        return queue;
    },

    loadQueue: async function() {

        // Instantiate queue with lists
        let queue = new Map();
        for (course of config['course-channels']) {
            queue.set(course, []);
        }

        // Snag file from S3
        const params = {
            Bucket: s3Bname,
            Key: config['queue-file-path'],
        };

        // Read the file
        const promise = s3.getObject(params).promise().then(data => {

            fs.writeFileSync(config['queue-file-path'], data.Body);

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

                // Populate the queue with the student
                queue.get(data[0]).push({
                    user: data[1], 
                    time: parseTime(data[2]), 
                    ready: data[3] === 'true' || data[3] === undefined ? true : false,
                    readyTime: data[4] === undefined ? 0 : parseTime(data[4])
                });
            });

            return queue;

        }).catch((err) => {
            console.log(">> The file could not loaded from S3 <<");
            logging.logError(err);
        });

        return await promise;
    },

    saveLogs: async function() {
        let promises = [];
        let items = fs.readdirSync("logs/");
            
        for (let i = 0; i < items.length; i++) {
            let d = new Date();
            d.setDate(d.getDate() - 1); // Yesterday

            // Save 3 kinds of files. Today's logs, yesterday's logs, and any recorded errors
            if (items[i] == logging.getFilename() || 
                items[i] == logging.getVariableFilename(d) ||
                items[i].startsWith("ERROR")) {


                // Load up the file into RAM
                const content = fs.readFileSync("./logs/" + items[i]);
                const params = {
                    Bucket: s3Bname,
                    Key: "logs/" + items[i],
                    Body: content
                };
                
                // And send it off
                promises.push( s3.upload(params, function(err, data) {
                    if (err) {
                        console.log(">> The file could not saved to S3 <<");
                        logging.logError(err);
                    } else {
                        logging.log(items[i] + " uploaded", "#system");
                    }
                }).promise() );
            }
        }

        return promises;
    },

    loadLog: function() {
        // Get ready to grab today's log from s3
        const todayLog = "logs/" + logging.getFilename();
        const params = {
            Bucket: s3Bname,
            Key: todayLog,
        };

        // Read the file
        s3.getObject(params).promise().then(data => {

            fs.writeFileSync(todayLog, data.Body);

        }).catch((err) => {
            console.log(todayLog + " could not be loaded from s3");
            logging.logError(err);
        });
    }
}