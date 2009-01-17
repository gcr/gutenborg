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
    
    // This creates a new document then subscribes us to it.
    this.name = docname;
    this.jqedit = $("<div class='gb-editor'></div>"); // Our jQuery text editor
    this.jqtab = $("<br />"); // The jQuery tab with the name in it and such
    this.jqdoctab = $("<br />") // The jQuery doctab.
    this.jqulist = $("<br />"); // The jQuery user list reference inside the doctab.
    this.users = [];
    //this.content = [];

    this.get_user_by_name = function(n) {
        // Returns the user object with name n
        $.each(this.users, function(i, u) {
            if (u.name == n) {
                x = u;
            }
        });
        return x;
    }

    this.resync = function() {
        // Asks the server to resync us.
        $.get("resync_doc", {"doc_name":this.name});
    }

    this.parse_resync_event = function(data) {
        // What happens when the server sends us a resync event?
        this.users = data.users; // Copy users
        pagehandler.drawUserList(this.users, "user", this.jqulist); // Draw ulist
        this.reset(data.content);
    }

    this.reset = function(content) {
        // Save this document
        doc = this;
        
        this.disable_editing();

        // This clears everything and fills it with content.
        this.jqedit.empty();
        
        $.each(content, function(index, c) {
            newchunk = $("<span class='chunk'></span>").text(c.text);
            // Applies foreground and background colors
            
            doc.format_chunk(c.author, newchunk);
            //alert(newchunk.html());
            doc.jqedit.append(newchunk);
        });
        /*
        $(".chunk", this.jqedit).each(function (index, c) {
            alert($(c).attr("author"));
        });
        */
        this.enable_editing();
    }

    this.disable_editing = function() {
        this.jqedit.attr("contentEditable", false);
        this.jqedit.unbind("keypress");
    }

    this.enable_editing = function() {
        this.jqedit.attr("contentEditable", true);
        // Save the document object
        doc = this;
        this.jqedit.keypress(function(event) {
            // What to do when we got a key
            event.preventDefault();
            alert("Which:" + event.which +", letter: " +
                String.fromCharCode(event.charCode));
        });
    }

    this.get_range = function() {
        // Returns a range object
        var userSelection;
        if (window.getSelection) {
            userSelection = window.getSelection();
        }
        else if (document.selection) { // should come last; Opera!
            userSelection = document.selection.createRange();
        }
        return userSelection;
    }
    
    this.is_cursor = function() {
        // Returns true if we have just a cursor, false if it's a selection
        var range = this.get_range();
        if (typeof range.text != 'undefined') {
            // IE
            selectedText = range.text;
        } else {
            // Firefox
            selectedText = range.toString();
        }/*
        console.log(range);
        console.log(selectedText);
        console.log(selectedText.toString());*/
        return (selectedText.length == 0)
    }

    this.subscribed_user = function(u) {
        // This gets called when we have another user coming up.
        // TODO: Make sure this function applies colors to the document correctly!
        // Only add the user if there isn't one already.
        var match = false;
        $.each(this.users, function(index, user) {
            if (u.name == user.name) {match = true;}
        });
        if (!match) {
            // If we haven't found one, add him!
            this.users.push(u);
            pagehandler.drawNewUser(u, "user", this.jqulist);
        }
    }

    this.unsubscribed_user = function(leavingUser) {
        // This function removes users from the user list. It does not touch the
        // document.

        var numUsers = this.users.length;
        for (var i=0; i<numUsers; i++) {
            u = this.users[i];
            if (u.name == leavingUser.name) {
                numUsers--; // Decrease the number of users left to search
                this.users.splice(i,1); // Remove this user
                pagehandler.removeUser(leavingUser, this.jqulist); // Un-draw this user
            }
        }
    }

    this.format_chunk = function (author, chunk) {
        // Applies formatting and background colors.
        chunk.attr("author", author.name);
        // A couple functions copied from farbtastic.js, THANK YOU!
        unpack = function(color) {
            if (color.length == 7) {
                return [parseInt('0x' + color.substring(1, 3)) / 255,
                parseInt('0x' + color.substring(3, 5)) / 255,
                parseInt('0x' + color.substring(5, 7)) / 255];
            }
            else if (color.length == 4) {
                return [parseInt('0x' + color.substring(1, 2)) / 15,
                parseInt('0x' + color.substring(2, 3)) / 15,
                parseInt('0x' + color.substring(3, 4)) / 15];
            }
        }
        rgbToHsl = function (rgb) {
            var min, max, delta, h, s, l;
            var r = rgb[0], g = rgb[1], b = rgb[2];
            min = Math.min(r, Math.min(g, b));
            max = Math.max(r, Math.max(g, b));
            delta = max - min;
            l = (min + max) / 2;
            s = 0;
            if (l > 0 && l < 1) {
                s = delta / (l < 0.5 ? (2 * l) : (2 - 2 * l));
            }
            h = 0;
                if (delta > 0) {
                   if (max == r && max != g) h += (g - b) / delta;
                   if (max == g && max != b) h += (2 + (b - r) / delta);
                   if (max == b && max != r) h += (4 + (r - g) / delta);
                   h /= 6;
                }
            return [h, s, l];
        }

        // Now, find our color!
        brightness = rgbToHsl(unpack(author.color))[2];
        chunk.css({"background-color": author.color,
            "color": brightness > 0.5 ? '#000' : '#fff'});
    }

    this.parse_new_chunk = function(event) {
        // This gets called whenever an event for a new chunk comes in.
        var newchunk = $("<span class='chunk'></span>").text(event.text);
        // Get the position we want to insert at
        var pos = event.position - 1;
        // HACK: Are we at the beginning?
        if (pos == -1) {
            // If so, add it at the very beginning.
            newchunk.prependTo(this.jqedit);
        } else {
            // If not, insert it after the specified chunk.
            newchunk.insertAfter(this.jqedit.find(".chunk").eq(pos));
        }

        // Clean up the colors
        this.format_chunk(event.author, newchunk);
    }

    this.parse_replace_chunk = function(event) {
        // This gets called whenever an event to replace my chunk comes in.
        var chunk_to_replace = this.jqedit.find(".chunk").eq(event.position);
        chunk_to_replace.text(event.text);
        this.format_chunk(event.author, chunk_to_replace);
    }

    this.parse_remove_chunk = function(event) {
        // This gets called whenever an event to remove my chunk comes in.
        var chunk_to_remove = this.jqedit.find(".chunk").eq(event.position);
        chunk_to_remove.remove();
    }

    this.parse_split_chunk = function(event) {
        // Splits the event.position'th chunk at offset.
        var chunk_to_split = this.jqedit.find(".chunk").eq(event.position);
        var text = chunk_to_split.text();
        var before = $("<span class='chunk'></span>").text(text.slice(0, event.offset));
        var after = $("<span class='chunk'></span>").text(text.slice(event.offset));
        var uname = chunk_to_split.attr("author");
        var u = this.get_user_by_name(uname);

        this.format_chunk(u, before);
        this.format_chunk(u, after);

        after.insertAfter(chunk_to_split);
        before.insertBefore(chunk_to_split);
        chunk_to_split.remove();
    }

    this.destroy = function() {
        // We've been destroyed! Best clean up our actions.
        pagehandler.removeDoc(this.name, $(".tablist"));
    }
}