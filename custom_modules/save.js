const readline = require('readline');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync("config.json", 'utf8'));

const AWS = require('aws-sdk');
const s3ID = process.env.AWS_ACCESS_KEY_ID;
const s3KEY = process.env.AWS_SECRET_ACCESS_KEY;
const s3Bname = process.env.S3_BUCKET_NAME;

const s3 = new AWS.S3({
    accessKeyId: s3ID,
    secretAccessKey: s3KEY
});

module.exports = {
    // queue maps courses to {user, time} objects
	saveQueue: function(queue) {

        // Clear the file
        fs.writeFileSync(config['queue-file-path'], '', (error) => {
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

                fs.appendFileSync(config['queue-file-path'], `${course},${o.user},${o.time.toString()},${rdyStr}\n`, (error) => {
                    if (error) {
                        console.log(">> The file could not be opened <<");
                    }
                });
            }
        }

        // Load file back into RAM
        const content = fs.readFileSync(config['queue-file-path']);
        const params = {
            Bucket: s3Bname,
            Key: config['queue-file-path'],
            Body: content
        };

        s3.upload(params, function(err, data) {
            if (err) {
                console.log(">> The file could not saved to S3 <<");
                console.log(err)
            };
        });

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

                queue.get(data[0]).push( {user: data[1], time: parseInt(data[2], 10), ready: data[3] === 'true' || data[3] === undefined ? true : false} );
            });

            return queue;

        }).catch((err) => {
            console.log(">> The file could not loaded from S3 <<");
            console.log(err)
        });

        return await promise;
    }
}