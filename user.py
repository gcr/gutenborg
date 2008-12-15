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

import Queue
import json
import time

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
		self.queue = Queue.Queue(15)
		self.name = newname
		self.color = newcolor
		self.gutenborg = newgutenborg
		self.lastime = time.time()
	
	def __str__(self):
		return "<(User) Name: " + self.name + ", Color: " + self.color + ">"
	
	def __eq__(self, u):
		""" Returns true if one user is equal to another  (this only
		depends on the username)"""
		if self.name.lower() == u.name.lower():
			return True
		else:
			return False
			
	def get_events(self):
		"""
		Returns the events in the event queue or waits for a new one.
		
		If the queue isn't empty, return all the queue objects
		and immediately stop.
		If the queue *is* empty, wait until something interesting
		happens.
		Events are returned as a simple JSON list of Event objects.
		"""
		if (self.queue.empty()):
			try:
				# Wait for 10 seconds
				value = self.queue.get(True, 10)
				self.queue.task_done()
				return json.write([value])
			except Queue.Empty:
				# We didn't get anything in ten seconds, return
				# an empty list.
				return json.write([])
		else:
			# The queue is NOT empty. Return everything and
			# then stop.
			values = []
			while not self.queue.empty():
				values.append(self.queue.get(False))
			return json.write(values)
	
	def add_event(self, event):
		"""
		Addse the event to the user's event queue.
		"""
		try:
			self.queue.put(event, False)
		except Queue.Full:
			# Uh oh! Are we full? Oh dear! Better commit suicide!
			self.gutenborg.disconnect_user(self)
			self.gutenborg.send_event("** " + user.name + "'s queue overflowed! Presumed dead.")
	
	def change_name(self, newname):
		"""
		Changes this user's name.
		"""
		self.name = newname
		self.gutenborg.send_event("User " + self.name + " changed his name")
	
	def change_color(self, newcolor):
		"""
		Changes this user's color.
		"""
		self.color = newcolor
		self.gutenborg.send_event("User " + self.name + " changed his color")
	
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
			self.gutenborg.disconnect_user(self)
			self.gutenborg.send_event("** " + self.name + " hasn't gotten anything for " + str(gracetime) + " seconds. Presumed dead.")
