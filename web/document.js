//      document.js
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

// This script handles subscribed documents and what to do with them.

function gbDocument(docname) {
    // Save our document
    doc = this
    // This creates a new document then subscribes us to it.
    doc.name = docname;
    doc.jqulist = $("<br />"); // The jQuery user list reference
    doc.jqedit = $("<div class='gb-editor'></div>"); // Our jQuery text editor
    doc.users = [];
    doc.content = [];
    
    doc.resync = function() {
        // Asks the server to resync us.
        $.get("resync_doc", {"doc_name":doc.name});
    }

    doc.parse_resync_event = function(data) {
        // What happens when the server sends us a resync event?
        // TODO: Draw the document chunks
        doc.users = data.users; // Copy users
        doc.content = data.content;
        pagehandler.drawUserList(doc.users, "user", doc.jqulist); // Draw ulist
        doc.reset(doc.content);
    }

    doc.reset = function(content) {
        // This clears everything and fills it with content.
        doc.jqedit.empty();
        
        $(content).each(function(index, c) {
            newchunk = $("<span></span>").text(c.text);

            newchunk.css({"background-color": c.author.color});
            //alert(newchunk.html());
            doc.jqedit.append(newchunk);
        });
        doc.jqedit.attr("contentEditable", true);
    }

    doc.subscribed_user = function(u) {
        // This gets called when we have another user coming up.
        // TODO: Make sure this function applies colors to the document correctly!
        // Only add the user if there isn't one already.
        var match = false;
        $.each(doc.users, function(index, user) {
            if (u.name == user.name) {match = true;}
        });
        if (!match) {
            // If we haven't found one, add him!
            doc.users.push(u);
            pagehandler.drawNewUser(u, "user", doc.jqulist);
        }
    }

    doc.unsubscribed_user = function(leavingUser) {
        // This function removes users from the user list. It does not touch the
        // document.

        var numUsers = doc.users.length;
        for (var i=0; i<numUsers; i++) {
            u = doc.users[i];
            if (u.name == leavingUser.name) {
                numUsers--; // Decrease the number of users left to search
                doc.users.splice(i,1); // Remove this user
                pagehandler.removeUser(leavingUser, doc.jqulist); // Un-draw this user
            }
        }
    }

    doc.destroy = function() {
        // We've been destroyed! Best clean up our actions.
        pagehandler.removeDoc(doc.name, $(".tablist"));
        // Returns undefined so we can erase it.
        return undefined;
    }
}