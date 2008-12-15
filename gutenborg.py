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

from user import User
import Queue

class Gutenborg:
	"""
	This class defines a copy of Gutenborg. It includes active users, dead users,
	documents, and some events for manipulating them.
	"""
	def __init__(self, name, tagline):
		self.active_users = [] 	# List of users
		self.dead_users = []
		self.name = name		# Server name
		self.tagline = tagline	# Server tagline
		self.documents = [] 	# List of documents
	
	def send_event(self, event):
		"""
		Sends an event to every active user
		"""
		print "Event:", event
		for u in self.active_users:
			try:
				u.add_event(event)
				print "(Added to " + u.name + "'s queue)"
			except Queue.Full:
				print "User " + u.name + "'s queue full! Disconnected."
				self.disconnect_user(u)
		
	def add_user(self, user):
		"""
		Creates a new user and adds him to the active user list.
		"""
		if user in self.active_users:
			# User is already logged in, do nothing.
			# TODO: User needs to know this!
			raise NameError, "User already exists"
		elif user in self.dead_users:
			# User is in the dead list. Put him on the active list.
			self.dead_users.remove(user)
			self.active_users.append(user)
			self.send_event("User is now online: " + str(user))
		else:
			# Not in the active list, not in the dead list...
			# Must be a new one!
			self.active_users.append(user)
			self.send_event("New user: " + str(user))
	
	def disconnect_user(self, user):
		"""
		Moves a user from the active list to the dead list. (Users
		are never actually deleted.)
		"""
		self.active_users.remove(user)
		self.dead_users.append(user)
		self.send_event("User disappeared: "+ str(user))
	
