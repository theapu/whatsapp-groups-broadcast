# whatsapp-groups-broadcast
Nodjes service to broadcast messages to multiple whatsapp group

Commands
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
