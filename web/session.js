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
session.getServerInfo = function() {
    $.getJSON("info", function(data) {
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
    })
}
// Run that immediately.
session.getServerInfo();

session.handleEvent = function(event) {
    console.log(event);
}
session.waitForEvents = function() {
    if (session.logged_in) {
        $.getJSON("wait", function(response){
            $.each(response, function(i, event) {
                session.handleEvent(event);
            });
            session.waitForEvents();
        });
    }
}
session.sendEvent = function(event) {
    if (session.logged_in) {
        $.getJSON("new", {message: event});
    }
}
