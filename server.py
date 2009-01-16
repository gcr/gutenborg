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
from document import Document

class Root:
    def __init__(self, name, tagline):
        self.gb = Gutenborg(name, tagline)
        
        # Some server test things.
        self.DocTest = Document(self.gb, "Doc1", "")
        self.DocTwo = Document(self.gb, "Test Document 2", "")
        self.gb.add_document(self.DocTest)
        self.gb.add_document(self.DocTwo)
        self.u = User(self.gb, "Becca", "#00aaaa")
        self.DocTest.subscribe_user(self.u)
        self.DocTest.new_chunk(self.u, "Testing", 0)
        self.DocTest.new_chunk(self.u, "Testing2", 1)
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
        assert self.is_logged_in(), "User not logged in, no need to logout."
        self.gb.disconnect_user(cherrypy.session['user'], "logout")
        del cherrypy.session['user']
        raise cherrypy.HTTPRedirect("/")
    logout.exposed = True
    
    def info(self, **args):
        # TODO: We must make this an event!
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
        response['documents'] = []
        for u in self.gb.active_users[:]:
            response['active_users'].append(u.get_state())
        for u in self.gb.dead_users[:]:
            response['dead_users'].append(u.get_state())
        for d in self.gb.documents[:]:
            response['documents'].append(d.name)
        
        # Are we logged in?
        if self.is_logged_in():
            response['logged_in_username'] = cherrypy.session['user'].name
        return json.write(response)
    info.exposed = True
    
    def wait(self, **args):
        """
        Sends the events of a logged-in user
        """
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

    def subscribe_document(self, **args):
        """
        Subscribes a user to a document. A subscribed user will begin to
        receive updates of that document's status.
        """
        cherrypy.session.acquire_lock()
        assert self.is_logged_in(), "User is not logged in"
        assert "doc_name" in args, "Document name required"

        user = cherrypy.session['user']
        # Get our document object
        d = self.gb.get_document_by_name(args['doc_name'])
        d.subscribe_user(user);
    subscribe_document.exposed = True

    def unsubscribe_document(self, **args):
        """
        Causes a user to leave the document.
        """
        cherrypy.session.acquire_lock()
        assert self.is_logged_in(), "User is not logged in"
        assert "doc_name" in args, "Document name required"

        user = cherrypy.session['user']
        # Get our document object
        d = self.gb.get_document_by_name(args['doc_name'])
        d.unsubscribe_user(user);
    unsubscribe_document.exposed = True

    def resync_doc(self, **args):
        """
        Sends the entire document state as a resync_doc event to the user
        """
        cherrypy.session.acquire_lock()
        assert self.is_logged_in(), "User is not logged in"
        assert "doc_name" in args, "Document name required"
        
        user = cherrypy.session['user']
        # Get our document object
        d = self.gb.get_document_by_name(args['doc_name'])
        d.resync(user);
    resync_doc.exposed = True
    # CONSIDERED HARMFUL! Use resync_doc() instead.
    #def get_document_state(self, **args):
    #    """
    #    Gets the document's contents and userlist. Note that the requester does not need
    #    to be logged in.
    #    """
    #    assert "doc_name" in args, "Document name required"
    #    d = self.gb.get_document_by_name(args['doc_name'])
    #    return json.write(d.get_state())
    #get_document_state.exposed = True

    def new_chunk(self, **args):
        """
        Adds a new chunk by the user into a certain document.
        """
        cherrypy.session.acquire_lock()
        assert self.is_logged_in(), "User is not logged in"
        assert "doc_name" in args and "p" in args and "t" in args, "Bad request- please supply document name, position, and text."
        d = self.gb.get_document_by_name(args['doc_name'])
        assert d.is_subscribed(cherrypy.session['user']), "You must be subscribed to this document to do that."

        d.new_chunk(cherrypy.session['user'], args['t'], int(args['p']))
    new_chunk.exposed = True

    def replace_chunk(self, **args):
        """
        Replaces a chunk with the specified text.
        """
        cherrypy.session.acquire_lock()
        assert self.is_logged_in(), "User is not logged in"
        assert "doc_name" in args and "p" in args and "t" in args, "Bad request- please supply document name, position, and text."
        d = self.gb.get_document_by_name(args['doc_name'])
        assert d.is_subscribed(cherrypy.session['user']), "You must be subscribed to this document to do that."

        d.replace_chunk(cherrypy.session['user'], args['t'], int(args['p']))
    replace_chunk.exposed = True

    def remove_chunk(self, **args):
        """
        Totally deletes a chunk.
        """
        cherrypy.session.acquire_lock()
        assert self.is_logged_in(), "User is not logged in"
        assert "doc_name" in args and "p" in args, "Bad request- please supply document name, position, and text."
        d = self.gb.get_document_by_name(args['doc_name'])
        assert d.is_subscribed(cherrypy.session['user']), "You must be subscribed to this document to do that."
        d.remove_chunk(cherrypy.session['user'], int(args['p']))
    remove_chunk.exposed = True

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

