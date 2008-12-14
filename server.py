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
import Queue

from gutenborg import Gutenborg
from user import User

class Root:
	def __init__(self):
		self.gb = Gutenborg("Server name", "Server tagline")
		
		# Some server test things
		self.u = User(self.gb, "Mike", "Blue")
		self.me = User(self.gb, "Becca", "Red")
		self.gb.add_user(self.u)
		self.gb.add_user(self.me)
	
	def is_logged_in(self):
		""" Returns true if you're logged in, false otherwise """
		if 'user' in cherrypy.session:
			return True
		else:
			return False
	
	def login(self, **args):
		if 'name' in args and 'color' in args:
			cherrypy.session['user'] = User(self.gb, args['name'], args['color'])
			self.gb.add_user(cherrypy.session['user'])
			return "User added"
		else:
			return "Bad request"
	login.exposed = True
	
	def users(self, **args):
		return self.gb.get_active_user_list()
	
	def index(self, **args):
		cherrypy.session.acquire_lock()
		assert self.is_logged_in(), "User is not logged in"
		cherrypy.session.release_lock()
		return "User name: " + cherrypy.session['user'].name
	index.exposed = True
	
	

cherrypy.config.update({
'server.socket_port': 8000,
'server.thread_pool': 32, # Max connected users
'tools.sessions.on': True,
'tools.sessions.locking': 'explicit',
'tools.staticdir.root': "/home/michael/Projects/collab"
})

conf = {'/': {
'tools.staticdir.on': True,
'tools.staticdir.dir': 'web',
'response.stream' : True
}}
pageroot = Root()
cherrypy.quickstart(pageroot, '/', conf)

