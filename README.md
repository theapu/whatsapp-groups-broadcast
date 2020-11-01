# whatsapp-groups-broadcast
Nodjes service to broadcast messages to multiple whatsapp group

## Introduction
whatsapp-groups-broadcast is a nodejs service to send messages to multiple whats app groups and to send schedule messages to groups.
### How it works
It uses whatsapp-web.js node module to esatablish a whatsapp web connection. A group is created for users who have previlage to send broadcast messages. Any message sent to this group will be sent to a list of whatsapp groups specified. Only text messages are supported. Attachments are not supported now.

## Installation
1. Install nodejs version 10+
2. Install google chrome (https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb)
3. clone whatsapp-groups-broadcast repository
4. run npm install in whatsapp-groups-broadcast directory

## Configuration
1. run node  whatsapp-web-auth.js
   scan barcode using whatsapp application in phone to enable whatsapp web access.
2. edit sendmessage.js and update line 

const wamsgroupslist = '"Test group","Whatever","YAWA","Group, with comma"';  

with the whatsapp groups

3. Create a broadcast group and add users who have previlage to send bread broadcast messages.
4. edit sendmessage.js and update line

const bradcastchannelname = "Test Broadcast Group";

with the broadcast group created.
5. Update alertmaillist, transporter and mailoptions variables for email alerts about service.
6. Create a user for running as a daemon   
7. Make required changes to whatsapp-web-service.service and copy it to /ect/systemd/system/ and enable service
8. Start service

## Setting up scheduling and sending broadcast messages
whatsapp-groups-broadcast uses following command syntax for scheduling and sending broadcast messages. These messages are to be sent to the broadcast group setup in setp 3 in configuration.

###Commands
!bot@listmsgs - List scheduled messages with scheduled time.

!bot@listgrps - List the groups configured with the bot.

!bot@msg[<Time>] - Schedule a message at Time in YYYY-MM-DD HH:mm:ss format.
  
Enter message text afer !bot@msg[<Time>].
  
If group names are not specified using !bot@grpinc or !bot@grpexc, the message will be sent to all groups.

!bot@grpinc[<Groups the message to be sent>] - Groups name list should be in array format. Use !bot@listgrps to get the list of groups, copy it and edit.
  
!bot@grpexc[<Groups to be excluded when sending message>] - Groups name list should be in array format. Use !bot@listgrps to get the list of groups, copy it and edit.
  
Use !bot@grpinc or !bot@grpexc after !bot@msg[<Time>] for scheduled message.
  
If !bot@grpinc or !bot@grpexc is used without !bot@msg[<Time>], message will be sent immediatly to the groups specified according to the !bot@grpinc or !bot@grpexc list.
  
!bot@del[<id>] - To delete a scheduled message. Use !bot@listmsgs to find id. id is the the number before the first '|' of the response messages.!bot@info - Used to sent information messages to Broadcast group.
  
!bot@help - Shows the help information message.

Any message sent to Broadcast group that does not start with a command will be broadcast to all groups
