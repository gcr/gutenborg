#       user.py
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

import json
import time

from threading import Event

class User:
    """Represents a Gutenborg user"""
    def __init__(self, newgutenborg, newname, newcolor):
        """
        Creates a new user.
        
        newgutenborg is an object referring to the Gutenborg instance.
            Used to send other users events.
        newname is the user's name.
        newcolor is the user's color.
        """
        self.eventAdded = Event()
        self.name = newname
        self.color = newcolor
        self.gutenborg = newgutenborg
        self.lastime = time.time()
        self.history = []
    
    def __str__(self):
        return "<(User) Name: " + self.name + ", Color: " + self.color + ">"
    
    def __eq__(self, u):
        """ Returns true if one user is equal to another  (this only
        depends on the username)"""
        if self.name.lower() == u.name.lower():
            return True
        else:
            return False
            
    def get_events(self, last):
        """
        Returns the events in the event list since last
        or waits for a new one.
        
        If the list isn't empty, return all the event objects
        and immediately stop.
        If the list *is* empty, wait until something interesting
        happens.
        Events are returned as a simple JSON list of Event objects.
        """
        eventNum = len(self.history)
        if (eventNum < last):
            # Checking
            last = eventNum
        response = self.history[last:]
        if len(response) == 0:
            # We aren't returning anything! Better wait for something.
            # NOTE: To change the wait timeout, simply change this
            # value.
            self.eventAdded.wait(10)

            # If we have something, clear the event. If we don't,
            # we clear it anyway.
            self.eventAdded.clear()
            response.extend(self.history[last:])
        return json.dumps(response)
        
    
    def add_event(self, event):
        """
        Addse the event to the user's event queue.
        """
        # Add this event to our history
        self.history.append(event)
        # Make sure that everyone knows about it
        self.eventAdded.set()
    
    def change_name(self, newname):
        """
        Changes this user's name.
        """
        self.gutenborg.send_event({"type": "user_name_change", "oldname": self.name, "newname": newname})
        self.name = newname
    
    def change_color(self, newcolor):
        """
        Changes this user's color.
        """
        self.color = newcolor
        self.gutenborg.send_event({"type": "user_color_change", "name": self.name, "new_color": newcolor})
    
    def touch_time(self):
        """
        Touches the last time
        """
        self.lastime = time.time()
    
    def try_timeout(self, gracetime=60):
        now = time.time()
        if (now - self.lastime >= gracetime):
            # Was the last update more than gracetime time ago?
            # Commit suicide
            self.gutenborg.disconnect_user(self, "timeout")
            

    def get_state(self):
        """
        Returns a dict containing some common user attributes. Used for
        events and such. This is mostly for the benefit of the client.
        """
        return {"name": self.name, "color": self.color}
    
