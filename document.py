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
        self.content = [] # Stored like this: [{"text": String, "author": User}, ...]
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
        event instead.
        """
        r = {}
        r['users'] = []
        for u in self.subscribed_users:
            r['users'].append(u.get_state())
        r['content'] = []
        for chunk in self.content:
            r['content'].append({"text": chunk['text'], "author":chunk['author'].get_state()})
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

    def new_chunk(self, user, text, position):
        """
        Appends the text to the chunk at the position'th place
        """
        if position > len(self.content):
            # Uh oh! They're out of sync. Best force a resync.
            self.resync(user)
            return False
        # Insert the text
        self.content.insert(position, {"author":user, "text":text})
        # Let everyone know
        self.send_event({"type": "new_chunk", "author": user.get_state(), "position": position, "text": text})

    def replace_chunk(self, user, text, position):
        """
        Replaces the position'th chunk's text and author with the specified text
        and author. Note to client: This can change the author, so be prepared
        for that!
        """
        if position >= len(self.content):
            # Uh oh! They're out of sync! Best force a resync.
            self.resync(user)
            return False
        # Replace the chunk
        self.content[position] = {"author":user, "text":text}
        # Let everyone know
        self.send_event({"type": "replace_chunk", "author": user.get_state(), "position": position, "text": text})

    def remove_chunk(self, user, position):
        """
        Poof's the chunk so it no longer exists.
        """
        # Delete the chunk
        del self.content[position]
        # Let everyone know
        self.send_event({"type": "remove_chunk", "position": position})

    def split_chunk(self, position, offset):
        """
        Splits the position'th chunk at OFFSET into two chunks.
        """
        text = self.content[position]['text'];
        user = self.content[position]['author'];
        before = {"author": user, "text": text[:offset]}
        after = {"author": user, "text": text[offset:]}

        del self.content[position]
        self.content.insert(position, after)
        self.content.insert(position, before)
        self.send_event({"type": "split_chunk", "position": position, "offset": offset})


