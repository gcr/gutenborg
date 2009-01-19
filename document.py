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
        self.content = ""
        self.subscribed_users = []
        self.state = 0

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
        event instead. If you use this, your clients will get out of sync!
        """
        r = {}
        r['users'] = []
        for u in self.subscribed_users:
            r['users'].append(u.get_state())
            
        r['content'] = self.content;
        r['state'] = self.state;
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

    def insert(self, user, pos, text):
        """
        Inserts text into the document at pos
        """
        self.content = self.content[:pos] + text + self.content[pos:]
        # Increment the state
        self.state += 1
        self.send_event({"type": "insert", "text": text, "pos": pos})

    def remove(self, user, begin, end):
        """
        Removes text from the document from begin to end
        """
        self.content = self.content[:begin] + self.content[end:]
        # Increment the state
        self.state += 1
        self.send_event({"type": "remove", "begin": begin, "end": end})