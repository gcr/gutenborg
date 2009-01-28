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


pagehandler = {};

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
};

pagehandler.drawLoginForm = function() {
    // Draws a new login form, assigns handlers.
    if (! session.logged_in) {
        var loginform = $("<div class='loginform'></div>").appendTo(".docarea");
        loginform.html("<b>You, sir are not logged in!</b> Please do so.<br />");
        loginform.append("<form id='loginform'>"
            + "<table><tr><td>User name:</td><td><input id='uname' type='text' /></td></tr>"
            + "<tr><td>Color:</td><td><div class='colorpicker' /><input type='text' id='ucolor' value='#FF0000'/></td></tr>"
            + "<tr><td colspan=2><input type='submit' value='Log in' /></td></tr></table>"
            + "</form>");
        // Assign a colorpicker
        var c = $.farbtastic(".colorpicker");
        c.linkTo("#ucolor");
        // Now that we got our form, what do we do with it?
        $("form", loginform).submit(function (event) {
            var uname = $("#uname").val();
            var ucolor = $("#ucolor").val();

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
};

pagehandler.drawUserList = function(users, cssclass, ulist) {
    // This function empties a user list. It then fills up the list
    // full of our users.
    ulist.empty();
    $.each(users, function(index, u) {
       var newitem = $("<li class='" + cssclass + "'></li>").text(u.name);
       $(newitem).appendTo(ulist);
    });
};

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
           });
       }
    });
};

pagehandler.drawNewUser = function(user, cssclass, ulist) {
    // Draws a new user at the bottom of a list
    var newitem = $("<li class='"+cssclass+"'></li>").text(user.name);
    $(newitem).appendTo(ulist).hide().fadeIn("slow");
};

pagehandler.removeUser = function(user, list) {
    // Removes a user from a user list.
    list.find("li").each(function(index, u){
        if ($(u).text() == user.name) {
            $(this).fadeOut("slow", function(){$(this).remove();});
        }
    });
};

pagehandler.drawNewDoc = function(doc, tlist) {
    // When we've been subscribed to a document, this function
    // draws the little document block at the bottom of our document
    // tabs.
    

    // Then, draw a new tab!
    var newitem = $("<div class='opentab'></div>").text(doc.name);
    $(newitem).insertAfter(tlist.find("h3")).hide().fadeIn("slow");

    // Bind a clicker.
    /*$(newitem).click(function() {
        pagehandler.setActive(doc);
        console.log(doc.name);
    });*/

    // Insert the doc tab (userlist) right after
    var doctab = $("<div class='doctab'>Users:</div>").insertAfter(newitem).hide();
    var ulist = $("<ul></ul>").appendTo(doctab);
    
    // Close button - note that even though I'm adding it to newitem directly
    // (which should only have the document text in it), this does NOT break
    // $(newitem).text, so getting documents by name should still work.
    var closebutton = $("<img style='margin-right: 16px; vertical-align: middle;' src='img/gtk-close.png' alt='Close'>").prependTo(newitem).click(function() {
        session.unsubscribeToDoc(doc.name);
    });

    // Build a new editor
    doc.jqedit = $("<div class='gb-editor'></div>").appendTo(".docarea");
    
    
    doc.jqdoctab = doctab; // Save the doctab
    doc.jqtab = newitem; // And also save the tab
    doc.jqulist = ulist; // And finally the user list.
    
    // Finally, set this to be our active tab.
    pagehandler.setActive(doc);
    
};

pagehandler.removeDoc = function(dname, tlist) {
    // Given a document name, we'll un-draw that document and its userlist.
    $(session.subscribed_docs[dname].jqdoctab).fadeOut("slow", function(){$(this).remove();});
    $(session.subscribed_docs[dname].jqtab).fadeOut("slow", function(){$(this).remove();});
    $(session.subscribed_docs[dname].jqedit).remove();
};

pagehandler.clearActive = function() {
    // This function hides all the tabs' user lists and sets them to inactive.
    $.each(session.subscribed_docs, function(dname, d){
        $(d.jqtab).removeClass("activetab");
        $(d.jqtab).addClass("opentab");
        $(d.jqdoctab).slideUp("medium");
        $(d.jqtab).find("img").hide();
        // Rebind our click handler.
        $(d.jqtab).click(function() {
            pagehandler.setActive(session.subscribed_docs[dname]);
        });
        // And make it non-editable
        d.disable_editing();
        // Now, hide our document itself
        $(d.jqedit).hide();
    });
};

pagehandler.setActive = function(d, tlist) {
    // This function sets the tab to active.

    // First, clear any other active tabs
    pagehandler.clearActive();
    // Then, make it active
    $(d.jqtab).removeClass("opentab");
    $(d.jqtab).addClass("activetab");
    $(d.jqdoctab).slideDown("medium");
    $(d.jqtab).find("img").show();
    // Now, make sure we can't click it no more.
    $(d.jqtab).unbind("click"); // Makes it so we can't click on this one'
    //$(tab).unbind("mouseover").unbind("mouseout"); // Unbinds hover- TODO: Doesn't work in IE6
    //$(tab).removeClass("hover");
    
    // Make it editable
    d.enable_editing();
    
    // Finally, show our document itself
    $(d.jqedit).show();
};
