const { job } = require('cron');
const fs = require('fs');
const crypto = require("crypto");
const moment = require('moment');
const nodemailer = require('nodemailer');
const sqlite3 = require('sqlite3').verbose();

var CronJob = require('cron').CronJob;
const { Client, Location } = require('whatsapp-web.js');

const wamsgroupslist = '"Test group","Whatever","YAWA","Group, with comma"';  

//Variable to hold cron objects
var crontab = {};

let db = new sqlite3.Database('./cron.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the cron database.');
});

db.serialize(function () {
    db.run("CREATE TABLE IF NOT EXISTS scheduledtasks (id INTEGER PRIMARY KEY AUTOINCREMENT, " +
        "jobname TEXT, schedule TEXT, message TEXT, status TEXT, groupslist TEXT, " +
        "timestamp TEXT)");
});

//The broadcast group through which messages are sent.
const bradcastchannelname = "Test Broadcast Group";

//Emails for alerts.
const alertmaillist = 'user@mail.com,usr2@example.com';

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'outgoing@email.com',
        pass: 'StRong_Pa$$woRd'
    }
});

var mailoptions = {
    from: '"WhatsApp Bot" outgoing@email.com', // sender address
    //  to: 'to@email.com', // list of receivers
    //  subject: 'Subject of your email', // Subject line
    //  html: '<p>Your html here</p>'// plain text body
};

const SESSION_FILE_PATH = './session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}

const client = new Client({ puppeteer: { headless: true }, session: sessionCfg });

client.initialize();

client.on('auth_failure', msg => {
    // Fired if session restore was unsuccessfull
    console.error('AUTHENTICATION FAILURE', msg);
    send_alert_mails({
        to: alertmaillist,
        subject: 'WhatsApp bot AUTHENTICATION FAILURE',
        body: 'WhatsApp bot AUTHENTICATION FAILURE at ' + moment().toString() +
            ". Check logs for error message."
    });
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
    send_alert_mails({
        to: alertmaillist,
        subject: 'WhatsApp bot Client was logged out',
        body: 'WhatsApp bot Client was logged out at ' + moment().toString() +
            ". Reason: " + reason
    });
});

client.on('ready', function () {
    console.log('READY');
    var wagroupslist = JSON.parse("[" + wamsgroupslist + "]");
    //Start existing cron jobs.    
    db.each("SELECT * FROM scheduledtasks WHERE status != 'done'", function (err, row) {
        if (err) {
            console.log("Error reading from database " + err);
        } else {
            var jobname = row.jobname;
            var scheduledate = row.schedule;
            var schedulemsg = row.message;
            let msggroupslist = JSON.parse(row.groupslist);
            console.log("Starting job with name " + jobname);
            var dateobj = moment(scheduledate, 'YYYY-MM-DD HH:mm:ss').toDate();
            if (moment(scheduledate, "YYYY-MM-DD HH:mm:ss").isBefore(moment())) {
                console.log("Job " + jobname + " is scheduled to be executed in the past");
            } else {
                try {
                    global[jobname] = start_scheduled_job(dateobj, schedulemsg, msggroupslist, jobname);
                    crontab[jobname] = global[jobname];
                } catch (err) {
                    console.log("Failed to start scheduled job " + err);
                }
            }
        }
    });
});

client.on('message', async msg => {
//List of whats app groups to which messages are to be sent.  
    var wagroupslist = JSON.parse("[" + wamsgroupslist + "]");
    console.log("Message received. ID: " + msg['id']['id']);
    let chat = await msg.getChat();
    if (chat.isGroup) {
        if (chat.name == bradcastchannelname) {
            var message = msg.body;
            var chats = await client.getChats();
            if (check_if_process_message(message)) {
                process_message(wagroupslist, chats, message);
            } else {
                send_group_message(wagroupslist, chats, message);
            }
        }
    }
});

client.on('message_create', async msg => {
    // Fired on all message creations, including your own
    // do stuff here
    var wagroupslist = JSON.parse("[" + wamsgroupslist + "]");   
    console.log("Message created. ID: " + msg['id']['id']);
    if (msg.fromMe) {
        let chat = await msg.getChat();
        if (chat.isGroup) {
            if (chat.name == bradcastchannelname) {
                var message = msg.body;
                var chats = await client.getChats();
                if (check_if_process_message(message)) {
                    process_message(wagroupslist, chats, message);
                } else {
                    send_group_message(wagroupslist, chats, message);
                }
            }
        }
    }
});

client.on('message_ack', function (msg, ack) {
    //console.log(msg);
    if (msg.fromMe) {
        console.log("ACK: " + ack + ", ID: " + msg['id']['id']);
    }
});

var sendmessage = function (group, chats, message) {
    return new Promise(function (resolve, reject) {
        var groupname = group;
        var groupobj = chats.find(o => o.name === groupname);
        if (groupobj) {
            var groupid = groupobj['id']['_serialized'];
            console.log("Group id " + groupid);
            var msgpromise = groupobj.sendMessage(message);
            //var msgpromise = client.sendMessage(groupid, message);
            msgpromise.then(function (result) {
                //console.log(result);
                var chatid = result['id']['_serialized'];
                console.log('Message sent to group ' + groupname);
                resolve(chatid);
            }, function (err) {
                console.log(err);
                reject("Message sending failed");
            }).catch(function (err) {
                console.log(err);
                console.log('Message sending failed');
                send_alert_mails({
                    to: alertmaillist,
                    subject: 'WhatsApp bot Unable to send to group',
                    body: 'WhatsApp bot Unable to send to group ' + groupname + ' at '
                        + moment().toString() +
                        ". Check logs for error message."
                });
                reject('Message sending to group ' + groupname + ' failed');
            });
        } else {
            console.log('Group with name ' + groupname + " does not exist");
            send_alert_mails({
                to: alertmaillist,
                subject: 'WhatsApp bot Unable to find group',
                body: 'WhatsApp bot Unable to find group ' + groupname + ' at '
                    + moment().toString() +
                    ". Check logs for error message."
            });
            reject("Group not found");
        }
    });
}

var send_group_message = function (groupslist, chats, message) {
    return new Promise(function (resolve, reject) {
        for (let i = 0; i < groupslist.length; i++) {
            var group = groupslist[i];
            var result = sendmessage(group, chats, message);
            result.then(function (result) {
                resolve("Message sent to group " + group);
            }, function (err) {
                reject("Failed to sent to group " + group);
            }).catch(function (err) {
                reject("Failed to sent to group " + group);
            });
        }
    });
}

var send_alert_mails = async function (inputjson) {
    mailoptions['to'] = inputjson['to'];
    mailoptions['subject'] = inputjson['subject'];
    mailoptions['html'] = inputjson['body'];
    transporter.sendMail(mailoptions, function (err, info) {
        if (err)
            console.log(err)
        else
            console.log("Email status: " + info['response']);
    });
}

//0 0 5 * * *
var start_scheduled_job = function (schedule, message, groupslist, jobname) {
    var job = new CronJob(schedule, async function () {
        var timestamp = new Date();
        console.log("Sending message at " + timestamp);
        //var messagefile = messagesfolder + currentdate + '/message.txt';
        try {
            var chats = await client.getChats();
            send_group_message(groupslist, chats, message)
                .then(function () {
                    var statement = "UPDATE scheduledtasks SET status='done' WHERE jobname=?";
                    var params = [jobname];
                    db.run(statement, params, function (err, row) {
                        if (err) {
                            console.log("Error updating database " + err);
                        } else {
                            console.log("Cron job done");
                        }
                    });
                }).catch(function (err) {
                    console.log("Error sending group message");
                });
        } catch (err) {
            console.log('Can not read file ' + messagefile);
            send_alert_mails({
                to: alertmaillist,
                subject: 'WhatsApp bot Unable to read message file',
                body: 'WhatsApp bot Unable to read message file at ' + moment().toString() +
                    ". So no messages sent."
            });
        }
    }, null, true, 'Asia/Kolkata');
    return job;
}

var check_if_process_message = function (message) {
    var msg = message.trim();
    if (msg.startsWith('!bot@')) {
        return true;
    } else {
        return false;
    }
}

var process_message = function (groupslist, chats, message) {
    var msg = message.trim();
    //List schedules
    var regexlist = /^(\!bot\@listmsgs(\[(.+?)\])?)/igm;
    //List groups
    var regexgrplist = /^(\!bot\@listgrps)/igm;    
    //Delete schedule
    var regexdel = /^(\!bot\@del\[(.+?)\])/igm;
    //Schedule a message.    
    var regexschedule = /^(\!bot\@msg\[(.+?)\])/igm;
    //Groups list
    var regexinclude = /^(\!bot\@grpinc\[(.+?)\])/gm;
    var regexexclude = /^(\!bot\@grpexc\[(.+?)\])/gm;
    //Info
    var regexinfo = /^(\!bot\@info)/igm;
    //Help
    var regexhelp = /^(\!bot\@help)/igm;
    if (regexinfo.test(msg)) {
        console.log("Ignoring Info message.");
    } else if (regexhelp.test(msg)) {
        console.log("Displaying Help message.");
        var info = "!bot@info\nCommands\n" + 
        "!bot@listmsgs - List scheduled messages with scheduled time.\n" + 
        "!bot@listgrps - List the groups configured with the bot.\n" + 
        "!bot@msg[<Time>] - Schedule a message at Time in YYYY-MM-DD HH:mm:ss format.\n" + 
        "Enter message text afer !bot@msg[<Time>].\n" +
        "If group names are not specified using !bot@grpinc or !bot@grpexc, " + 
        "the message will be sent to all groups.\n" + 
        "!bot@grpinc[<Groups the message to be sent>] - Groups name list should be in array format. " +
        "Use !bot@listgrps to get the list of groups, copy it and edit.\n" + 
        "!bot@grpexc[<Groups to be excluded when sending message>] - Groups name list should be in array format. " +
        "Use !bot@listgrps to get the list of groups, copy it and edit.\n" + 
        "Use !bot@grpinc or !bot@grpexc after !bot@msg[<Time>] for scheduled message.\n" +
        "If !bot@grpinc or !bot@grpexc is used without !bot@msg[<Time>], message will be sent " +
        "immediatly to the groups specified according to the !bot@grpinc or !bot@grpexc list.\n" +
        "!bot@del[<id>] - To delete a scheduled message. Use !bot@listmsgs to find id. " + 
        "id is the the number before the first '|' of the response messages." +
        "!bot@info - Used to sent information messages to Broadcast group.\n" +
        "!bot@help - Shows the help information message.\n\n" + 
        "Any message sent to Broadcast group that does not start with a command " + 
        "will be broadcast to all groups";
        var result = sendmessage(bradcastchannelname, chats, info);
        result.then(function (result) {
            console.log("Info Message sent to group " + bradcastchannelname);
        }, function (err) {
            console.log("Failed to sent to group " + bradcastchannelname);
        }).catch(function (err) {
            console.log("Failed to sent to group " + bradcastchannelname);
        });                
    } else if (regexgrplist.test(msg)) {
        console.log("Listing groups.");
        var info = "!bot@info\n" + JSON.stringify(groupslist);
        var result = sendmessage(bradcastchannelname, chats, info);
        result.then(function (result) {
            console.log("Info Message sent to group " + bradcastchannelname);
        }, function (err) {
            console.log("Failed to sent to group " + bradcastchannelname);
        }).catch(function (err) {
            console.log("Failed to sent to group " + bradcastchannelname);
        });        
    } else if (regexlist.test(msg)) {
        var items = msg.match(regexlist);
        var item = items[0].replace(regexlist, '$3');
        if (item) {
            console.log("Looking for job with id " + item);
            var statement = "SELECT * from scheduledtasks WHERE id=?";
            db.each(statement, [item], function (err, row) {
                if (err) {
                    console.log("Error reading from database " + err);
                } else {
                    var id = row.id;
                    var scheduledate = row.schedule;
                    var message = row.message;
                    var info = '!bot@info\n';
                    info = info + id + '|' + scheduledate + '\n' + message;
                    var result = sendmessage(bradcastchannelname, chats, info);
                    result.then(function (result) {
                        console.log("Info Message sent to group " + bradcastchannelname);
                    }, function (err) {
                        console.log("Failed to sent to group " + bradcastchannelname);
                    }).catch(function (err) {
                        console.log("Failed to sent to group " + bradcastchannelname);
                    });
                }
            });
        } else {
            var statement = "SELECT * from scheduledtasks WHERE status != 'done'";
            db.each(statement, function (err, row) {
                if (err) {
                    console.log("Error reading from database " + err);
                } else {
                    var id = row.id;
                    var scheduledate = row.schedule;
                    var message = row.message;
                    if (moment(scheduledate, "YYYY-MM-DD HH:mm:ss").isBefore(moment())) {
                        console.log("Job id " + id + " is scheduled to be executed in the past");
                    } else {
                        var info = '!bot@info\n';
                        info = info + id + '|' + scheduledate + '\n' + message;
                        var result = sendmessage(bradcastchannelname, chats, info);
                        result.then(function (result) {
                            console.log("Info Message sent to group " + bradcastchannelname);
                        }, function (err) {
                            console.log("Failed to sent to group " + bradcastchannelname);
                        }).catch(function (err) {
                            console.log("Failed to sent to group " + bradcastchannelname);
                        });
                    }
                }
            });
        }
    } else if (regexdel.test(msg)) {
        var scheduleid = msg.match(regexdel);
        scheduleid = scheduleid[0].replace(regexdel, '$2');
        scheduleid = parseInt(scheduleid, 10);
        console.log("Looking for job with id " + scheduleid + " for deletion");
        var statement = "DELETE FROM scheduledtasks WHERE id = ?";
        db.run(statement, [scheduleid], function (err, row) {
            if (err) {
                console.log("Delete job creation failed " + err);
            } else {
                var info = "!bot@info\nDeleted Scheduld job with id " + scheduleid;
                var result = sendmessage(bradcastchannelname, chats, info);
                result.then(function (result) {
                    console.log("Info Message sent to group " + bradcastchannelname);
                }, function (err) {
                    console.log("Failed to sent to group " + bradcastchannelname);
                }).catch(function (err) {
                    console.log("Failed to sent to group " + bradcastchannelname);
                });
            }
        });
    } else if (regexschedule.test(msg)) {
        var scheduledate = msg.match(regexschedule);
        scheduledate = scheduledate[0].replace(regexschedule, '$2');
        var groupsinclude = msg.match(regexinclude);
        var groupsexclude = msg.match(regexexclude);
        //console.log(groupsinclude);
        let msggroupslist = groupslist;
        if (groupsinclude) {
            groupsinclude = groupsinclude[0].replace(regexinclude, '$2');
            msggroupslist = JSON.parse("[" + groupsinclude + "]");
        } else if (groupsexclude) {
            groupsexclude = groupsexclude[0].replace(regexexclude, '$2');
            var exculedarray = JSON.parse("[" + groupsexclude + "]");
            for (var i = 0; i < exculedarray.length; i++) {
                //console.log(exculedarray[i]);
                var index = msggroupslist.indexOf(exculedarray[i]);
                if (index > -1) {
                    msggroupslist.splice(index, 1);
                }
            }
        }
        console.log("Sending message to groups " + JSON.stringify(msggroupslist));
        var schedulemsg = msg.replace(regexschedule, '');
        schedulemsg = schedulemsg.replace(regexinclude, '');
        schedulemsg = schedulemsg.replace(regexexclude, '');
        schedulemsg = schedulemsg.trim();
        var timestamp = moment().toString();
        //console.log(scheduledate);
        //console.log(schedulemsg);
        var varname = crypto.randomBytes(5).toString('hex');
        var statement = "INSERT INTO scheduledtasks (jobname,schedule,message,status,groupslist,timestamp) " +
            "VALUES(?,?,?,?,?,?);";
        var params = [varname, scheduledate, schedulemsg, '', JSON.stringify(msggroupslist), timestamp];
        db.run(statement, params, function (err, row) {
            if (err) {
                console.log("Cron job creation failed " + err);
            } else {
                console.log("Cron job added");
                var dateobj = moment(scheduledate, 'YYYY-MM-DD HH:mm:ss').toDate();
                try {
                    global[varname] = start_scheduled_job(dateobj, schedulemsg, msggroupslist, varname);
                    crontab[varname] = global[varname];
                    var info = "!bot@info\nScheduld job added at " + scheduledate +
                        " with Jobname " + varname;
                    var result = sendmessage(bradcastchannelname, chats, info);
                    result.then(function (result) {
                        console.log("Info Message sent to group " + bradcastchannelname);
                    }, function (err) {
                        console.log("Failed to sent to group " + bradcastchannelname);
                    }).catch(function (err) {
                        console.log("Failed to sent to group " + bradcastchannelname);
                    });
                } catch (err) {
                    console.log("Failed to schedule job " + err);
                }
            }
        });
    } else if (regexinclude.test(msg) || regexexclude.test(msg)) {
        var groupsinclude = msg.match(regexinclude);
        var groupsexclude = msg.match(regexexclude);
        //console.log(groupsinclude);
        let msggroupslist = groupslist;
        if (groupsinclude) {
            groupsinclude = groupsinclude[0].replace(regexinclude, '$2');
            msggroupslist = JSON.parse("[" + groupsinclude + "]");
        } else if (groupsexclude) {
            groupsexclude = groupsexclude[0].replace(regexexclude, '$2');
            var exculedarray = JSON.parse("[" + groupsexclude + "]");
            for (var i = 0; i < exculedarray.length; i++) {
                //console.log(exculedarray[i]);
                var index = msggroupslist.indexOf(exculedarray[i]);
                if (index > -1) {
                    msggroupslist.splice(index, 1);
                }
            }
        }
        console.log("Sending message to groups " + JSON.stringify(msggroupslist));
        var schedulemsg = msg.replace(regexinclude, '');
        schedulemsg = schedulemsg.replace(regexexclude, '');
        schedulemsg = schedulemsg.trim();
        //console.log(scheduledate);
        //console.log(schedulemsg);
        try {
            send_group_message(msggroupslist, chats, schedulemsg);
            var info = "!bot@info\nBrodcasting message to " + msggroupslist;            
            var result = sendmessage(bradcastchannelname, chats, info);
            result.then(function (result) {
                console.log("Info Message sent to group " + bradcastchannelname);
            }, function (err) {
                console.log("Failed to sent to group " + bradcastchannelname);
            }).catch(function (err) {
                console.log("Failed to sent to group " + bradcastchannelname);
            });
        } catch (err) {
            console.log("Failed send message " + err);
        }
    } else {
        var info = "!bot@info\nCommand syntax not recognized. " + 
                   "Send !bot@help to view allowed commands";            
        var result = sendmessage(bradcastchannelname, chats, info);
        result.then(function (result) {
            console.log("Info Message sent to group " + bradcastchannelname);
        }, function (err) {
            console.log("Failed to sent to group " + bradcastchannelname);
        }).catch(function (err) {
            console.log("Failed to sent to group " + bradcastchannelname);
        });
    }
}