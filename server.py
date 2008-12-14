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

class Root:
	def __init__(self):
		self.list = []
		self.queue = Queue.Queue(8)
	
	def index(self, **args):
		raise cherrypy.InternalRedirect("ajax.htm")
	index.exposed = True
	
	def messages(self, **args):
		"""Gets a list of all the messages"""
		cherrypy.response.headers['Content-Type'] = 'text/x-json'
		# cherrypy.response.headers[''] = 'None'
		return json.write({"items": self.list})
	messages.exposed = True
	
	def wait(self, **args):
		"""Waits for a new message"""
		print "Wait method called"
		cherrypy.response.headers['Content-Type'] = 'text/x-json'
		def returnqueue():
			"""This function returns all the new messages.
			If the queue isn't empty, return all the queue objects
			and immediately stop.
			If the queue *is* empty, wait until something interesting
			happens."""
			if (self.queue.empty()):
				try:
					# Wait for 10 seconds
					value = self.queue.get(True, 10)
					self.queue.task_done()
					return json.write({"items": [value]})
				except Queue.Empty:
					# We didn't get anything in ten seconds
					return "{}"
			else:
				# The queue is NOT empty. Return everything and
				# then stop.
				values = []
				while not self.queue.empty():
					values.append(self.queue.get(False))
				return json.write({"items": values})
				
		return returnqueue()
	wait.exposed = True
	
	def new(self, **args):
		if args.has_key('message'):
			self.list.append(args['message'])
			self.queue.put(args['message'], False)
			print "New message"
	new.exposed = True

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
print repr(pageroot.list)
