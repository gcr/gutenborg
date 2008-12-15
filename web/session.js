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
    session.lastevent = 0; // This variable is used for history.
    // We can query the server to only show us our events after this history.
    
    session.getServerInfo(function() {
        // This is a callback. It should be executed after the server
        // information is gotten.
        pagehandler.init(); // Begin drawing the page
        session.waitForEvents();
    });
}

session.getServerInfo = function(callback) {
    // Asks the server for information, stores it in the session object,
    // then executes the callback.
    $.getJSON("info", function(data) {
        session.servername = data.name;
        session.servertag = data.tag;
        session.active_users = data.active_users;
        session.dead_users = data.dead_users;
        if (data.logged_in_username) {
            // Are we logged in?
            session.logged_in = true;
            session.myname = data.logged_in_username;
        } else {
            // No we are not!
            session.logged_in = false;
            session.myname = '';
        }
        // Now that we're done, closures *should* let us be able
        // to do this.
        callback();
     });
}

session.waitForEvents = function() {
    // Waits for events. Uses AJAX long polling.
    if (session.logged_in) {
        $.getJSON("wait", {last: session.lastevent},function(response){
            $.each(response, function(i, event) {
                session.lastevent++;
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
    // Sends a new event to all users. NOTE: This should be serialized.
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
