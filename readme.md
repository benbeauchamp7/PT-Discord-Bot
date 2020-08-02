### Features:
* Create grouped chat rooms on demand as students need them
* Simply click into the specified voice channel to create a new student meeting room
* Inactive chat rooms will automatically delete themselves after some time
* Deleted text rooms can be archived so students can come back and look at them
* Chat moderation based on a banned words list
* Cleaning tools for channel buildup

### Commands:
`!clear chat`
> Deletes the current channel, and puts a new one in its place
   
`!clear archives`
> Deletes all archives from the "Archived Student Rooms" category
   
`!clear student Rooms`
> Deletes all student-created Rooms

`!create [name]`
> Creates a student meeting room, consisting of a category, text channel, and voice channel with the name given.
> A name may be rejected if part of the name is found in the banned title words list found in the config.json file

`!end`
> Ends a student meeting room immediately, archiving the text log if "do-archive-deletions" is set to true in the config.json file

`!topic [name]`
> Renames a student meeting room. A name may be rejected if part of the name is found in the banned title words list found in the config.json file

`!enroll`
> Creates the role assignment message (for hiding/unhiding course specific text channels)