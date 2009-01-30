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
        self.history = []
        # History should be stored as a list of events like this:
        # [ {"operation": "insert" or "remove"
        # "begin": number, "end": number, "pos": number, and/or
        # "text": string } ]
        
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

    def send_event(self, event, excepted=None):
        """
        Sends an event to every subscribed user except "Excepted"
        """
        print "[[" + self.name + "]] " + repr(event)
        # Send the document name along with it
        event["doc_name"] = self.name
        for u in self.subscribed_users:
            if u != excepted:
                u.add_event(event)

    def subscribe_user(self, user):
        """
        Adds a user to the document's subscribed users list.
        """
        if self.is_subscribed(user):
            # raise NameError, "This user is already subscribed to that document."
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
        r['sstate'] = len(self.history);
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
            # We also need to send the user's state because they need to know
            # how many changes they've made. Seems like a decision to make
            # here rather than in self.get_state.
            e['cstate'] = len([h for h in self.history if h["user"] == user])
            # And away she goes!
            user.add_event(e)

    def insert(self, user, pos, text, sstate):
        """
        Inserts text into the document at pos
        """
        # MANY THANKS TO Infinote for help with these transformations:
        # http://gobby.0x539.de/trac/wiki/Infinote/Protocol
        
        # First, reach back in time and see what we should do
        # Think of this like a "git rebase"- we want to rebase
        # the NEW changes on top of the changes the person
        # didn't know about so they don't have to worry about it.
        # This has the side-effect of sending events with slightly different
        # parameters than what you requested.
        
        # For every operation in our history
        # after our state that we did not write:
        hist = [h for h in self.history if h["user"] != user][sstate:]
        # This is the number of changes we think they made.
        # It's up to them to transform our event if we haven't gotten
        # their changes yet.
        our_cstate = len(self.history) - len(hist)
        for e in hist:
            if (e['operation'] == "insert"):
                # We gotta account for stuff that was inserted before our
                # latest characters
                if (e['pos'] <= pos):
                    # The old stuff should push our new stuff forward.
                    # Add the text length to the position
                    pos += len(e['text'])
            elif (e['operation'] == "delete"):
                # Deleted text should be accounted for
                if (pos >= e['end']):
                    # Our new inserted text should be shifted to the left
                    pos -= (e['end'] - e['begin'])
                elif (pos >= e['begin']):
                    # Right between what they deleted. Ha ha.
                    # Our inserted text should be placed right at the
                    # beginning of where they deleted
                    pos = e['begin']
        
        # BY THIS POINT: Our changes should be applicable to the new
        # version of the document. Silly client for not knowing better...
            
        # Then, take our new "pos" and help it along
        self.content = self.content[:pos] + text + self.content[pos:]
        
        # Remember what we're doing
        self.history.append({
            "operation": "insert",
            "user": user,
            "text": text,
            "pos": pos
        });
        # And send the event to everyone
        self.send_event({
            "type": "insert",
            "user": user.get_state(),
            "text": text,
            "pos": pos,
            "cstate": our_cstate
        }, user)

    def remove(self, user, begin, end, sstate):
        """
        Removes text from the document from begin to end
        """
        # First, reach back in time and rebase our delete on top of any
        # other operations that took place without the client knowing about
        # them.
        # For every operation in our history
        # after our state that we did not write:
        hist = [h for h in self.history if h["user"] != user][sstate:]
        our_cstate = len(self.history) - len(hist)
        for e in hist:
            if (e['operation'] == "insert"):
                if (e['pos'] <= begin):
                    # They inserted stuff before our delete. We should fix
                    # that by shifting our beginning and ending to the right.
                    begin += len(e['text'])
                    end += len(e['text'])
                elif (e['pos'] > begin and e['pos'] < end):
                    # They inserted stuff that we're about to delete without
                    # knowing.
                    # FIXME! THIS BREAKS CONCURRENCY BAD.
                    # TODO: Split into three operations:
                    # Delete the first part
                    # Let the second (inserted text) part live
                    # Delete the third part
                    # For now, just shift our ending up so we can delete it
                    end += len(e['text'])
            elif (e['operation'] == "delete"):
                if (begin >= e['end']):
                    # They deleted stuff before us! Oh dear.
                    # Shift everything to the left.
                    begin -= (e['end'] - e['begin'])
                    end -= (e['end'] - e['begin'])
                    
                elif (e['begin'] <= begin and e['end'] >= end):
                    # Their beginning is before ours
                    # and their end is after ours
                    # We shouldn't delete anything at all.
                    end = e['begin']
                elif (e['begin'] <= begin and e['end'] < end):
                    # Theirs overlaps us! Old beginning is
                    # before ours and old end is before ours.
                    # Start deleting at the old beginning
                    begin = e['begin']
                    # And continue until this difference
                    end -= (e['end'] - begin)
                    
                elif (e['begin'] > begin and e['end'] >= end):
                    # Theirs overlaps us! Old beginning is
                    # after ours and old end is after ours too.
                    
                    # Start deleting at our beginning
                    # And continue to our end minus their beginning.
                    end -= (end - e['begin'])
                elif (e['begin'] > begin and e['end'] < end):
                    # Their beginning is after ours and their
                    # end is before ours
                    
                    # Start deleting at our position
                    # And shift our end to the left
                    end -= (e['end'] - e['begin'])
                    
                    
                
        self.content = self.content[:begin] + self.content[end:]
        # Remember what we're doing
        self.history.append({
            "operation": "remove",
            "user": user,
            "begin": begin,
            "end": end
        });
        # And send it to everyone
        self.send_event({
            "type": "remove",
            "user": user.get_state(),
            "begin": begin,
            "end": end,
            "cstate": our_cstate
        }, user)
        
