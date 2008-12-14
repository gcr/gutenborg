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
	def __init__(self, name, tagline):
		self.gb = Gutenborg(name, tagline)
		
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
		# TODO: Actually, we gotta see if another user
		# with the same name but a different computer
		# is logged in. This functionality is already in the gutenborg class.
		cherrypy.session.acquire_lock()
		if self.is_logged_in():
			# Can't be logged in more than once
			return "User already logged in!"
			
		if 'name' in args and 'color' in args:
			cherrypy.session['user'] = User(self.gb, args['name'], args['color'])
			self.gb.add_user(cherrypy.session['user'])
			return "User added"
		else:
			return "Bad request"
	login.exposed = True
	
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
			response['active_users'].append({"name": u.name, "color": u.color})
		for u in self.gb.dead_users[:]:
			response['dead_users'].append({"name": u.name, "color": u.color})
		
		# Are we logged in?
		if self.is_logged_in():
			response['myuser'] = cherrypy.session['user'].name
		return json.write(response)
	info.exposed = True
	
	def new(self, **args):
		cherrypy.session.acquire_lock()
		assert self.is_logged_in(), "User not logged in"
		assert 'message' in args, "No message sent"
		self.gb.send_event("User " + cherrypy.session['user'].name + " said: "
			+ args['message'] + ".")
		return "Message posted"
	new.exposed = True
	
	def wait(self, **args):
		assert self.is_logged_in(), "User is not logged in"
		cherrypy.session.acquire_lock()
		user = cherrypy.session['user']
		cherrypy.session.release_lock()
		return user.get_events()
		
	wait.exposed = True
	
	def index(self, **args):
		raise cherrypy.InternalRedirect("gb.htm")
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
pageroot = Root("Dev server", "Caution: May Explode")
cherrypy.quickstart(pageroot, '/', conf)

