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

    // Draws the userlist and the doclist
    //pagehandler.drawUserList(session.active_users,"online", $(".userlist"));
    pagehandler.drawAllDocs(session.document_list, $(".alldocs"));
    
    // This code was originally in session.init(). I decided to
    // move it here because even though it involves the choice of whether
    // a user is logged in, it seems more like a GUI issue.
    if (session.logged_in) {
            //pagehandler.drawMessageSubmitBox();
        } else {
            // If we're not logged in, we want a login from.
            pagehandler.drawLoginForm();
        }
}

pagehandler.drawLoginForm = function() {
    // Draws a new login form, assigns handlers.
    if (! session.logged_in) {
        loginform = $("<div class='loginform'></div>").appendTo(".docarea");
        loginform.html("<b>You, sir are not logged in!</b> Please do so.<br />");
        loginform.append("<form id='loginform'>"
            + "<table><tr><td>User name:</td><td><input id='uname' type='text' /></td></tr>"
            + "<tr><td>Color:</td><td><div class='colorpicker' /><input type='text' id='ucolor' value='#FF0000'/></td></tr>"
            + "<tr><td colspan=2><input type='submit' value='Log in' /></td></tr></table>"
            + "</form>");
        // Assign a colorpicker
        var c = $.farbtastic(".colorpicker")
        c.linkTo("#ucolor")
        // Now that we got our form, what do we do with it?
        $("form", loginform).submit(function (event) {
            uname = $("#uname").val();
            ucolor = $("#ucolor").val();

            if (uname != "" && ucolor.length == 7) {
                // Login with our session object
                session.login(uname, ucolor);
                // Clean up when we're done
                // We can access loginform because of closures.
                $(loginform).remove();
            }
            return false;
        });        
    }
}

pagehandler.drawUserList = function(users, cssclass, ulist) {
    // This function empties a user list. It then fills up the list
    // full of our users.
    ulist.empty();
    $.each(users, function(index, u) {
       var newitem = $("<li class='" + cssclass + "'></li>").text(u.name);
       $(newitem).appendTo(ulist);
    });
}

pagehandler.drawAllDocs = function(docs, adlist) {
    // This function empties the document list. It then fills up the list
    // full of possible documents.
    adlist.empty();
    $.each(docs, function(index, d) {
       var newitem = $("<li></li>").text(d);
       $(newitem).appendTo(adlist);
       
       // Add a click handler that subscribes to the document when
       // you click on it.
       if (session.logged_in) {
           $(newitem).click(function() {
               session.subscribeToDoc(d);
           })
       }
    });
}

pagehandler.drawNewUser = function(user, cssclass, ulist) {
    // Draws a new user at the bottom of a list
    var newitem = $("<li class='"+cssclass+"'></li>").text(user.name);
    $(newitem).appendTo(ulist).hide().fadeIn("slow");
}

pagehandler.removeUser = function(user, list) {
    // Removes a user from a user list.
    list.find("li").each(function(index, u){
        if ($(u).text() == user.name) {
            $(this).fadeOut("slow", function(){$(this).remove();});
        }
    });
}

pagehandler.drawNewDoc = function(doc, cssclass, tlist) {
    // When we've been subscribed to a document, this function
    // draws the little document block at the bottom of our document
    // tabs.

    // First, clear all the others
    pagehandler.clearAllActive(tlist);

    // Then, draw a new tab!
    var newitem = $("<div class='"+cssclass+"'></div>").text(doc.name);
    $(newitem).insertAfter(tlist.find("h3")).hide().fadeIn("slow");

    // Set this to be the Active Tab! (No need to call pagehandler.setActive here)
    $(newitem).addClass("active");

    // Bind a clicker.
    $(newitem).click(function() {
        pagehandler.setActive(newitem, tlist);
    });

    // Insert the doc tab (userlist) right after
    doctab = $("<div class='doctab'>Users:</div>").insertAfter(newitem);
    ulist = $("<ul></ul>").appendTo(doctab);
    
    // Close button - note that even though I'm adding it to newitem directly
    // (which should only have the document text in it), this does NOT break
    // $(newitem).text, so getting documents by name should still work.
    closebutton = $("<img style='margin-right: 16px; vertical-align: middle;' src='img/gtk-close.png' alt='Close'>").prependTo(newitem).click(function() {
        session.unsubscribeToDoc(doc.name)
    });

    // HACK: Change document's jqulist to this
    doc.jqulist = ulist;
}

pagehandler.removeDoc = function(dname, tlist) {
    // Given a document name, we'll un-draw that document and its userlist.
    // TODO! Make sure we find ALL active documents, not just those with
    // class=open
    tlist.find(".open").each(function(index, d){
        if ($(d).text() == dname) {
            // Remove the doctab
            $(this).next().fadeOut("slow", function(){$(this).remove();});
            // Remove this
            $(this).fadeOut("slow", function(){$(this).remove();});
        }
    });
}

pagehandler.clearAllActive = function(tlist) {
    // This function hides all the tabs' user lists and sets them to inactive.
    $(tlist).find(".active").each(function (i, tab){
        $(tab).removeClass("active");
        $(tab).next().slideUp("medium");
        $(tab).find("img").hide();
        
        // Rebind our click handler.
        $(tab).click(function() {
            pagehandler.setActive(tab, tlist);
        });
    });
}

pagehandler.setActive = function(tab, tlist) {
    // This function sets the tab to active.

    // First, clear any other active tabs
    pagehandler.clearAllActive(tlist);

    // Then, make it active
    $(tab).addClass("active");
    $(tab).next().slideDown("medium");
    $(tab).find("img").fadeIn("slow");
    
    // Now, make sure we can't click it no more.
    $(tab).unbind("click");
}