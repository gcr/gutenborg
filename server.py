#!/usr/bin/env python
#       server.py
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

class Root:
	def __init__(self):
		self.list = []
	
	def index(self, **args):
		raise cherrypy.InternalRedirect("ajax.htm")
	index.exposed = True
	
	def messages(self, **args):
		cherrypy.response.headers['Content-Type'] = 'text/x-json'
		# cherrypy.response.headers[''] = 'None'
		return json.write({"items": self.list})
	messages.exposed = True
	
	def new(self, **args):
		if args.has_key('message'):
			self.list.append(args['message']);
	new.exposed = True

cherrypy.config.update({
'server.socket_port': 8000,
'server.thread_pool': 1,
'tools.sessions.on': True,
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
