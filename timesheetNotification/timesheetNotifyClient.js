// Require discord dependency and create the 'bot' object
const Discord = require('discord.js');
const bot = new Discord.Client({disableEveryone: false});

// Unique token that allows the bot to login to discord
const fs = require('fs');
const { exit } = require('process');
const token = fs.readFileSync("SecureKey", "utf-8");

// 743606275887333550 for lounge
// 746422329973932202 for queue
bot.on('ready', () => {
    // Ping console when bot is ready
    console.log('Notification Connected');
    if (fs.readFileSync('./timesheetNotification/doTimesheetNotify', 'utf-8') === "true") {
        fs.writeFileSync('./timesheetNotification/doTimesheetNotify', 'false', 'utf-8');

        bot.channels.fetch('743606275887333550').then(chan => {
            chan.send("@everyone timesheets due tonight at 5PM, be sure to get them in!").then(() => {
                exit();
            })
        });

    } else {
        fs.writeFileSync('./timesheetNotification/doTimesheetNotify', 'true', 'utf-8');
        exit();
    }
});

bot.login(token);
