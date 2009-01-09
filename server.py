#!/usr/bin/env python
#       server.py - Simple web server
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

import cherrypy
import json
import sys
import os
from gutenborg import Gutenborg
from user import User

class Root:
    def __init__(self, name, tagline):
        self.gb = Gutenborg(name, tagline)
        
        # Some server test things. Don't need anymore.
#        self.u = User(self.gb, "Mike", "Blue")
#        self.me = User(self.gb, "Becca", "Red")
#        self.gb.add_user(self.u)
#        self.gb.add_user(self.me)
    def quit(self):
        sys.exit();
    quit.exposed = True

    def is_logged_in(self):
        """ Private method: Returns true if your session username is in
        the active user list, false if your session username is not in
        the active user list."""
        if 'user' in cherrypy.session and cherrypy.session['user'] in self.gb.active_users:
            return True
        else:
            return False
    
    def login(self, **args):
        """
        Creates a new user and adds them to the gutenborg object if
        they aren't already.
        """
        cherrypy.session.acquire_lock()
        
        assert not self.is_logged_in(), "This session already has a logged in user."
        assert 'name' in args and 'color' in args, "Bad request. Args: " + repr(args)
        cherrypy.session['user'] = User(self.gb, args['name'], args['color'])
        try:
            self.gb.add_user(cherrypy.session['user'])
        except NameError:
            del cherrypy.session['user']
            return "User could not be added because this user exists on another computer."
        return "User added"
    login.exposed = True
    
    def logout(self, **args):
        """
        Logs a user out
        """
        cherrypy.session.acquire_lock()
        assert self.is_logged_in(), "User not logged in"
        self.gb.disconnect_user(cherrypy.session['user'], "logout")
        del cherrypy.session['user']
        raise cherrypy.HTTPRedirect("/")
    logout.exposed = True
    
    def info(self, **args):
        """
        Returns a JSON object containing lots of server information
        """
        cherrypy.session.acquire_lock()
        cherrypy.response.headers['Content-Type'] = 'text/json'
        response = {}
        response['name'] = self.gb.name
        response['tag'] = self.gb.tagline
        response['active_users'] = []
        response['dead_users'] = []
        for u in self.gb.active_users[:]:
            response['active_users'].append(u.get_state())
        for u in self.gb.dead_users[:]:
            response['dead_users'].append(u.get_state())
        
        # Are we logged in?
        if self.is_logged_in():
            response['logged_in_username'] = cherrypy.session['user'].name
        return json.write(response)
    info.exposed = True
    
    def new(self, **args):
        # Sends a new text string event to every user
        cherrypy.session.acquire_lock()
        assert self.is_logged_in(), "User not logged in"
        assert 'message' in args, "No message sent"
        self.gb.send_event({"type": "message", "message": args['message'], "username" : cherrypy.session['user'].name})
        return "Message posted"
    new.exposed = True
    
    def wait(self, **args):
        cherrypy.session.acquire_lock()
        assert self.is_logged_in(), "User is not logged in"
        assert 'last' in args, "History required."
        
        user = cherrypy.session['user']
        cherrypy.session.release_lock()
        # Update the user's time so they don't timeout
        user.touch_time()
        # Timeout all the users
        self.gb.timeout_users(20)
        return user.get_events(int(args['last']))
        
    wait.exposed = True
    
    def index(self, **args):
        raise cherrypy.InternalRedirect("gb.htm")
    index.exposed = True
    
    

cherrypy.config.update({
'server.socket_port': 8000,
'server.thread_pool': 32, # Max connected users = this/2
'tools.sessions.on': True,
'tools.sessions.locking': 'explicit',
'tools.staticdir.root': os.getcwd()
})

conf = {'/': {
'tools.staticdir.on': True,
'tools.staticdir.dir': 'web',
'response.stream' : True
}}
pageroot = Root("Gutenborg development server", "Caution: May Explode")
cherrypy.quickstart(pageroot, '/', conf)

