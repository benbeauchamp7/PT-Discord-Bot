### Uses

* Create a welcome message with `!welcome`
* Enroll students in courses in #course-enrollment to unlock course-specific general chats
* Easily create student chat room sets by using `!create` or joining the "Click to create a new room" channel
* Deleted student rooms are archived for a configurable amount of time
* Manage course specific queues using a set of queueing commands, allowing for merges across multiple classes

### Commands

`!clear archives`
> Deletes all archives from the "Archived Student Rooms" category (requires elevation)

`!clear student Rooms`
> Deletes all student-created Rooms (requires elevation)

`!enroll`
> Creates the role assignment message (for hiding/unhiding course specific text channels, requires elevation)

`!create [name]`
> Creates a student meeting room, consisting of a category, text channel, and voice channel with the name given.
> A name may be rejected if part of the name is found in the banned title words list found in the config.json file

`!end`
> Ends a student meeting room immediately, archiving the text log if "do-archive-deletions" is set to true in the config.json file (can only be used in student created rooms)

`!topic [name]`
> Renames a student meeting room. A name may be rejected if part of the name is found in the banned title words list found in the config.json file

`!q` & `!enqueue`
> When used in a general course chat, adds the member who used the command to that course's queue.
> Elevated users can use `!q <@username>` (where <@username> is a discord mention) to add another user to the queue

`!dq` & `!dequeue`
> Removes the using member from the queue they are in
> Elevated users can use `!dq <@username>` to remove another user from the queue system

`!vq [course numbers || @username]` & `!viewqueue [course numbers || @username]`
> Allows a user to view the queue system
> `!vq` alone lists all the members in the queue for the channel the the command is used in
> `!vq 121 221 315` will list the first (configurable) 10 people in a queue made up of all 3 courses. The earliest joiners will be listed first
> `!vq @student_username` will get the user's current spot in line for the channel it's used in
> `!vq @PT_username` will display the queue related to the courses that peer teacher is registered for. For example, a PT's queue for 121 and 221 would be the same as using !vq 121 221
