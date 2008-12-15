//      session.js
//      
//      Copyright 2008 Michael James Wilber <michael@northbound>
//      
//      This program is free software; you can redistribute it and/or modify
//      it under the terms of the GNU General Public License as published by
//      the Free Software Foundation; either version 2 of the License, or
//      (at your option) any later version.
//      
//      This program is distributed in the hope that it will be useful,
//      but WITHOUT ANY WARRANTY; without even the implied warranty of
//      MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//      GNU General Public License for more details.
//      
//      You should have received a copy of the GNU General Public License
//      along with this program; if not, write to the Free Software
//      Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston,
//      MA 02110-1301, USA.

// This script handles things like logging in, waiting for messages, etc.

session = new Object();

session.init = function() {
    // Starts up the session. Should be done again
    // if we log in.
    session.getServerInfo();
    pagehandler.init();
    if (! session.logged_in) {
        // If we're not logged in, we want a login from.
        pagehandler.drawLoginForm();
    }
    session.waitForEvents();
}

session.getServerInfo = function() {
    // Asks the server for information, stores it in the session object
    
    // This is an asynchronous request.
    data = $.ajax({
          url: "info",
          async: false, // Magic here
          cache: false,
          dataType: 'json',
          success: function(data) {
            session.servername = data['name'];
            session.servertag = data['tag'];
            session.active_users = data['active_users'];
            session.dead_users = data['dead_users'];
            if (data['myuser']) {
                // Are we logged in?
                session.logged_in = true;
                session.myname = data['myuser'];
            } else {
                // No we are not!
                session.logged_in = false;
                session.myname = '';
            }
        }
     });
}

session.waitForEvents = function() {
    // Waits for events. Uses AJAX long polling.
    if (session.logged_in) {
        $.getJSON("wait", function(response){
            $.each(response, function(i, event) {
                session.handleEvent(event);
            });
            session.waitForEvents();
        });
    }
}

session.handleEvent = function(event) {
    // When we get an event, this function describes what to do with it.
    // TODO: Gotta change this up.
    $("<div class='response'></div>").appendTo(".responseholder").hide().text(event).fadeIn();
}
session.sendEvent = function(event) {
    // Sends a new event to all users.
    if (session.logged_in) {
        $.getJSON("new", {message: event});
    }
}

session.login = function(name, color){
    // This method logs us in and then resets the session.
    $.get("login", {"name": name, "color": color}, function() {
        session.init();
    });
}
