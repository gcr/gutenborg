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

// This script handles UI, page layout, etc.


pagehandler = new Object();

pagehandler.init = function() {
    // Draws the page for the first time.
    $(".sname").text(session.servername);
    $(".stag").text(session.servertag);
}

pagehandler.drawLoginForm = function() {
    // Draws a new login form, assigns handlers.
    if (! session.logged_in) {
        loginform = $("<div class='.loginform'></div>").appendTo("body");
        loginform.html("<b>You are not logged in!</b><br />");
        loginform.append("<form id='loginform'>"
            + "<table><tr><td>User name:</td><td><input id='uname' type='text' /></td></tr>"
            + "<tr><td>Color:</td><td><input id='ucolor' type='text' /></td></tr>"
            + "<tr><td colspan=2><input type='submit' val='Log in' /></td></tr></table>"
            + "</form>");
            
        // Now that we got our form, what do we do with it?
        $("form", loginform).submit(function (event) {
            uname = $("#uname").val();
            ucolor = $("#ucolor").val();
            
            // Login with our session object
            session.login(uname, ucolor);
            // Clean up when we're done
            $(loginform).fadeOut("slow", function() {$(this).remove();});
            return false;
        });        
    }
}

pagehandler.drawMessageSubmitBox = function() {
    // This function draws a small message box where you can
    // say something if you'd like.
    boxform = $("<div class='messagesubmit'></div>").insertBefore(".responseholder");
    boxform.append("<form id='loginform'>"
            + "<input id='message' type='text' />"
            + "<input type='submit' val='Send' /></form>");
    $("form", boxform).submit(function(event) {
        message = $("#message").val();
        session.sendEvent(message);
        $("#message").val("");
        
        return false;
    });
}
