# whatsapp-groups-broadcast
Nodjes service to broadcast messages to multiple whatsapp groups

## Introduction
whatsapp-groups-broadcast is a nodejs service to send messages to multiple whatsapp groups and to send scheduled messages to groups.
### How it works
It uses whatsapp-web.js node module to esatablish a whatsapp web connection. A group is created for users who have previlage to send broadcast messages. Any message sent to this group will be sent to a list of whatsapp groups specified. Bot text messages and attachments (attachments broadcasting buggy since WhatsApp Web version v2.2049.10)  can be scheduled. Contacts and Live location shring is not supported.

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

with the whatsapp groups (The user of the whatsapp account must be a member of these groups)

3. Create a broadcast group and add users who have previlage to send bread broadcast messages.
4. edit sendmessage.js and update line

const bradcastchannelname = "Test Broadcast Group";

with the broadcast group created.

5. Update alertmaillist, transporter and mailoptions variables for email alerts about service.
6. Create a user for running as a daemon   
7. Make required changes to whatsapp-web-service.service and copy it to /ect/systemd/system/ and enable service
8. Start service

## Setting up scheduling and sending broadcast messages
whatsapp-groups-broadcast uses following command syntax for scheduling and sending broadcast messages. Messages start with !bot@ are special instuction messages. These messages are to be sent to the broadcast group setup in setp 3 in configuration.

### Commands

!bot@listmsgs - List scheduled messages with scheduled time.

!bot@listgrps - List the groups configured with the bot.

!bot@msg[{Time}] - Schedule a message at Time in YYYY-MM-DD HH:mm:ss format.
  
Enter message text afer !bot@msg[{Time}].
  
If group names are not specified using !bot@grpinc or !bot@grpexc, the message will be sent to all groups.

!bot@grpinc[{Groups the message to be sent}] - Groups name list should be in array format. Use !bot@listgrps to get the list of groups, copy it and edit.
  
!bot@grpexc[{Groups to be excluded when sending message}] - Groups name list should be in array format. Use !bot@listgrps to get the list of groups, copy it and edit.
  
Use !bot@grpinc or !bot@grpexc after !bot@msg[{Time}] for scheduled message.
  
If !bot@grpinc or !bot@grpexc is used without !bot@msg[{Time}], message will be sent immediatly to the groups specified according to the !bot@grpinc or !bot@grpexc list.

Use !bot@attach[{attachment id}] to attach a previously uploaded file to the broadcast group.

When an attachment is forwarded to broadcast group an info message with an id will be retunred. Use this id to attach this file to broadcast messages. (With latest versions of whatsapp web if you sent attachment directly to group the base64 string of the file will be broadcast to the groups. The workaround is to forward the attachment to the broadcast group) (attachments broadcasting buggy since WhatsApp Web version v2.2049.10) 
  
!bot@del[{id}] - To delete a scheduled message. Use !bot@listmsgs to find id. id is the the number before the first '|' of the response messages.

!bot@info - Used to sent information messages to Broadcast group.
  
!bot@help - Shows the help information message.

Any message sent to Broadcast group that does not start with a command will be broadcast to all groups.

## Examples
### Schedule a broadcast message
This message sent to Broadcast group will be sent at 2020-11-05 8 PM. (The text after !bot@msg[2020-11-05 20:00:00])

!bot@msg[2020-11-05 20:00:00]
This message will be deliverd at 2020-11-05 20:00:00

### Send messages to specific groups
This message sent to Broadcast group will be sent at 2020-11-05 8 PM to groups excluding the groups named YAWA and Test group. (The text after !bot@grpexc["YAWA","Test group"])

### Send scheduled messages to specific groups
#### Excluding groups
!bot@msg[2020-11-05 20:00:00]
!bot@grpexc["YAWA","Test group"]
This message will be deliverd at 2020-11-05 20:00:00 to groups other than YAMWA and Test group.

#### Including groups
This message will be delivered only to YAWA" and "Test group"
!bot@msg[2020-11-05 20:00:00]
!bot@grpinc["YAWA","Test group"]
This message will be deliverd at 2020-11-05 20:00:00 to AMWA and Test group.

#### Delete scheduled message
List scheduled messages using !bot@listmsgs. The result will be in {id}|{schedule time} {message text} format
Delete the a scheduled message using !bot@del[{id}]
