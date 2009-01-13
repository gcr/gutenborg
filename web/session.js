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
        document.title = data.name; // Set the window title. Nice effect.
        session.servertag = data.tag;
        session.active_users = data.active_users;
        session.dead_users = data.dead_users;
        session.documents = data.documents;
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
    // Each event has its own session function, like this: session.new_user, etc.
    /*
     * EVENT LIST
     * user_name_change     TODO
     * user_color_change    TODO
     * message              TODO- Please remove
     * returning_user
     * new_user
     * disconnected_user
     * new_document         TODO
     * subscribed_user      TODO
     * unsubscribed_user    TODO
     */
    switch (event.type) {
        case "returning_user":
            session.returning_user(event.user);
            break;
        case "new_user":
            session.new_user(event.user);
            break;
        case "disconnected_user":
            session.disconnect_user(event.user);
            break;
        case "message":
            $("<div class='message'></div>").text(event.username + ": " + event.message).appendTo(".responseholder").hide().show("slow");
            break;
        default:
            alert("Unknown Event! Please see console.");
    }
}

session.sendEvent = function(event) {
    // Sends a new message event to all users. NOTE: This should be serialized.
    // TODO: Take it out! We're not doing messages anymore.'
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

session.subscribeToDoc = function(d) {
    $.get("subscribe_document", {"doc_name": d});
}

session.new_user = function(u) {
    // Only add the user if there isn't one already.
    var match = false;
    $.each(session.active_users, function(index, user) {
        if (u.name == user.name) {match = true;}
    });
    if (!match) {
        session.active_users.push(u);
        pagehandler.drawNewUser(u, "online");
    }
}

session.disconnect_user = function(leavingUser) {
    // This function removes users from the active list and puts them on the
    // dead list. Note that this only affects the client- no server-side
    // voodoo involved.
    
    var numUsers = session.active_users.length;
    for (var i=0; i<numUsers; i++) {
        u = session.active_users[i];
        if (u.name == leavingUser.name) {
            numUsers--; // Decrease the number of users left to search
            session.active_users.splice(i,1); // Remove this user
            pagehandler.removeUser(leavingUser, "online"); // Un-draw this user
            session.dead_users.push(leavingUser); // Add this user to the dead list
        }
    }
}

session.returning_user = function(returningUser) {
    // This function removes users from the dead list and puts them
    // on the active list. Note that this only affects the client.

    var numUsers = session.dead_users.length;
    for (var i=0; i<numUsers; i++) {
        u = session.dead_users[i];
        if (u.name == returningUser.name) {
            numUsers--; // Decrease the number of users left to search
            session.dead_users.splice(i,1); // Remove this user from the dead_list
            pagehandler.drawNewUser(returningUser, "online") // Un-draw this user
            session.active_users.push(returningUser); // Add this user to the active list
        }
    }
}