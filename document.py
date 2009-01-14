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
        self.subscribed_users.append(user)
        self.send_event({"type": "subscribed_user", "user":user.get_state()})

    def unsubscribe_user(self, user):
        """
        Removes a user from the document's subscribed users list.
        """
        if user in self.subscribed_users:
            self.send_event({"type": "unsubscribed_user", "user":user.get_state()})
            self.subscribed_user.remove(user)

    def new_chunk(self, user, text, position):
        """
        Appends the text to the chunk at the position'th place
        """
        self.content.insert(position, {"author":user, "text":text})

