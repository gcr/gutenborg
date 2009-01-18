#       gutenborg.py
#
#       Copyright 2008 Michael James Wilber <michael@northbound>
#
#       This program is free software; you can redistribute it and/or modify
#       it under the terms of the GNU General Public License as published by
#       the Free Software Foundation; either version 2 of the License, or
#       (at your option) any later version.
#
#       This program is distributed in the hope that it will be useful,
#       but WITHOUT ANY WARRANTY; without even the implied warranty of
#       MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#       GNU General Public License for more details.
#
#       You should have received a copy of the GNU General Public License
#       along with this program; if not, write to the Free Software
#       Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston,
#       MA 02110-1301, USA.

class Document:
    def __init__(self, gutenborg, name, author):
        """ Registers a new document """
        self.name = name
        self.gutenborg = gutenborg
        self.author = author
        self.next_id = 1 # We're storing unique chunk IDs here.
        self.seq_id = [] # Stored like this in document order: [chunk id, chunk id, ...]
        self.content = {} # Stored like this: {chunk id: {"text": String, "author": User}, ...}
        self.subscribed_users = []

    def __str__(self):
        return "<(Document) Name: " + self.name + ">"

    def __eq__(self, d):
        """ Returns true if one document is equal to another. (This only
        depends on the document name.) """
        if self.name.lower() == d.name.lower():
            return True
        else:
            return False

    def is_subscribed(self, user):
        """
        Returns true if the user is subscribed to yonder document, false
        if we don't know who he is
        """
        return user in self.subscribed_users

    def chunk_exists(self, id):
        """
        Returns true if we know about the chunk (it's in the document)
        """
        return id in self.seq_id

    def send_event(self, event):
        """
        Sends an event to every subscribed user
        """
        print "[[" + self.name + "]] " + repr(event)
        # Send the document name along with it
        event["doc_name"] = self.name
        for u in self.subscribed_users:
            u.add_event(event)

    def subscribe_user(self, user):
        """
        Adds a user to the document's subscribed users list.
        """
        if self.is_subscribed(user):
            #raise NameError, "This user is already subscribed to that document."
            # Might be best to resync them instead.
            self.resync(user)
            return False

        self.subscribed_users.append(user)
        self.send_event({"type": "subscribed_user", "user":user.get_state()})

    def unsubscribe_user(self, user):
        """
        Removes a user from the document's subscribed users list.
        """
        if self.is_subscribed(user):
            self.send_event({"type": "unsubscribed_user", "user":user.get_state()})
            self.subscribed_users.remove(user)

    def get_state(self):
        """
        Gets the contents of the document in an easily parsable form.
        DO NOT USE DIRECTLY unless you know what you're doing! Use the resync
        event instead. If you use this, your clients will get out of sync!
        """
        r = {}
        r['users'] = []
        for u in self.subscribed_users:
            r['users'].append(u.get_state())
            
        r['content'] = []
        for id in self.seq_id:
            r['content'].append({
                "text": self.content[id]['text'],
                "author": self.content[id]['author'].get_state(),
                "id": id
            })
        return r

    def resync(self, user):
        """
        Sends an event to the user with the state of the document
        """
        if self.is_subscribed(user):
        # Only do this if we're subscribed!
            e = self.get_state()
            # We could use self.send_event, but that would force EVERYONE to resync.
            # So, I'll just do it myself.
            # Send the document name too (a la self.send_event)
            e['doc_name'] = self.name
            # Send what type of event this is
            e['type'] = "resync_doc"
            # And away she goes!
            user.add_event(e)

    def new_chunk(self, user, text, id):
        """
        Appends the chunk to the chunk after ID. (Use 0 to specify the start
        of the document.)
        """
        if (self.chunk_exists(id) or id == 0):
            # Store the text in our object
            self.content[self.next_id] = {"author": user, "text": text}
            if (id == 0):
                # The user wanted this chunk to go at the beginning.
                self.seq_id.insert(0, self.next_id)
            else:
                # Insert it just after the chunk with ID id
                self.seq_id.insert(self.seq_id.index(id)+1, self.next_id)

            # Let everyone know
            self.send_event({"type": "new_chunk", "author": user.get_state(), "id": id, "new_id":self.next_id, "text": text})
            # And increment self.next_id
            self.next_id += 1

    def replace_chunk(self, user, text, id):
        """
        Replaces the chunk with ID's text and author with the specified text
        and author. Note to client: This can change the author, so be prepared
        for that! It will NOT, however, change the ID.
        """
        if self.chunk_exists(id):
            # Replace the chunk
            self.content[id] = {"author":user, "text":text}
            # Let everyone know
            self.send_event({"type": "replace_chunk", "author": user.get_state(), "id": id, "text": text})

    def remove_chunk(self, id):
        """
        Poof's the chunk with ID id so it no longer exists.
        """
        if self.chunk_exists(id):
            # Delete the chunk
            del self.content[id]
            self.seq_id.remove(id)
            # Let everyone know
            self.send_event({"type": "remove_chunk", "id": id})

    def split_chunk(self, newuser, id, offset, newtext):
        """
        Splits the chunk with ID id at offset into two chunks, and changes
        the chunk right in the middle to have the new text and author.
        Before:
        bob's chunk
        After:
        beginning of bob's chunk, Alice's chunk, end of bob's chunk
        """
        if self.chunk_exists(id):
            # Get what we need to know
            oldtext = self.content[id]['text'];
            olduser = self.content[id]['author'];
            before = {"author": olduser, "text": oldtext[:offset]}
            after = {"author": olduser, "text": oldtext[offset:]}
            center = {"author": newuser, "text": newtext}
            
            # Claim our ids
            bid = self.next_id
            aid = self.next_id + 1
            cid = self.next_id + 2
            self.next_id += 3
            
            # Add them to the dictionary
            self.content[bid] = before
            self.content[aid] = after
            self.content[cid] = center
            
            # and to our sequential list
            p = self.seq_id.index(id)
            self.seq_id.insert(p+1, aid)
            self.seq_id.insert(p, bid)
            self.seq_id[p] = cid # Store our center chunk
            
            # and lastly tell everyone about it.
            self.send_event({
                "type": "split_chunk",  # The event type
                "id":id,                # The id of the old chunk to split
                "aid":aid,              # The id of the chunk after offset
                "bid":bid,              # The id of the chunk before offset
                "cid":cid,              # The id of the new center chunk
                "offset": offset,       # The string position to split
                "text": newtext,        # The text that should go in the center
                "author": newuser.get_state() # The new author
            })
            # If you understood this function, you are awesome.
        
    def insert_in_chunk(self, id, offset, text):
        """
        Adds something to the part of the chunk with ID id
        """
        oldtext = self.content[id]['text']
        newtext = oldtext[:offset] + text + oldtext[offset:]
        self.content[id]['text'] = newtext
        self.send_event({
            "type": "insert_in_chunk",
            "id": id,
            "offset": offset,
            "text": text
        })
        
    def delete_in_chunk(self, id, begin, end):
        """
        Removes the part of chunk from begin to end
        """
        oldtext = self.content[id]['text']
        newtext = oldtext[:begin] + oldtext[end:]
        if (len(newtext) == 0):
            # This chunk is EMPTY! Delete it.
            self.remove_chunk(id)
        else:
            self.content[id]['text'] = newtext
            self.send_event({
                "type": "delete_in_chunk",
                "id": id,
                "begin": begin,
                "end": end
            })