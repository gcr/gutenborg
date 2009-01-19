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
    this.state = 0;
    //this.content = [];

    this.reset = function(content) {
        // Resets the entire editor
        
        // Save this document
        doc = this;
        
        this.disable_editing();

        // This clears everything and fills it with content.
        this.jqedit.empty();
        
        this.jqedit.empty(content);
        
        //this.enable_editing();
    }

    this.disable_editing = function() {
        this.jqedit.attr("contentEditable", false);
        this.jqedit.unbind("keypress");
        this.jqedit.unbind("keydown");
    }

    this.enable_editing = function() {
        this.jqedit.attr("contentEditable", true);
        // Save the document object
        doc = this;
        this.jqedit.keypress(function(event) {
            doc.keyevent(event);
        });

        // IE and chrome don't catch special keys like backspace and delete
        if ($.browser.msie || $.browser.safari) {
            this.jqedit.keydown(function(event) {
                // Detects Ctrl+V and stops it right here
                // V = key 86
                //alert(event.which + " " + event.ctrlKey);
                if (event.which == 86 && event.ctrlKey) {
                    event.preventDefault();
                    return false;
                }
                if (event.keyCode == 8 || event.keyCode == 46) {
                    doc.keyevent(event);
                }
            });
        }
    }

    this.keyevent = function(event) {
        // What to do when we get a keypress
        // See the flowchart here! http://www.gliffy.com/publish/1581922/
        // Do we have an arrow key?
        // event.keycode:
        // 37, 38, 39, 40 are arrow keys.
        // 35, 36 for home and end.
        // 12 for Opera's control key
        if (event.keyCode <= 40 && event.keyCode >= 35
            || event.keyCode == 12
            || (event.keyCode == 0 &&
                event.charCode == 0 &&
                event.which == 0)) {
            return true; // Arrow keys should still work.
        }
        
        // First, stop our event!
        event.preventDefault(); // Quick! Stop that man before he does something silly!
        // Save the offset
        var offset = this.get_start_offset();
        
        // First decision: Is it a cursor?
        if (this.is_cursor()) {
            // Get the node that the cursor is in
            var node = this.get_start_node();
            if (typeof node.attr("id") == 'undefined') {
                alert("TODO: Bug found! Your cursor is not inside a chunk."+
                      "Please click on the part of the document you want to edit.");
                return false;
            }
            // Next decision: Is it backspace or delete?
            if (event.keyCode == 8) {
                // It was backspace
                // Next decision: Are we at the start of a chunk?
                if (offset == 0) {
                    // Cursor, Backspace, At the start of a chunk
                    // END: Delete the character from the last chunk
                    var p = node.prev();
                    var id = p.attr("id");
                    if (id) {
                        t = p.text();
                        // Only if it exists
                        this.delete_in_chunk(id, t.length-1, t.length);
                        return false;
                    } else {return false;}
                } else {
                    // Cursor, Backspace, Not at the start of a chunk
                    var id = node.attr("id");
                    this.delete_in_chunk(id, offset-1, offset);
                    return false;
                }
            } else if (event.keyCode == 46) {
                // It was delete
                // Next decision: Are we at the end of a chunk?
                if (offset == node.text().length) {
                    // Cursor, Delete, At the end of a chunk
                    // END: Delete the beginning character from the
                    // next chunk if it exists
                    var n = node.next();
                    var id = n.attr("id");
                    if (id) {
                        // Only if it exists
                        this.delete_in_chunk(id, 0, 1);
                        return false;
                    }
                } else {
                    // Cursor, Delete, Not at the end of a chunk
                    // END: Delete the character from this chunk
                    // Cursor, Backspace, Not at the start of a chunk
                    var id = node.attr("id");
                    this.delete_in_chunk(id, offset, offset+1);
                    return false;
                }
            } else {
                // Neither backspace nor delete
                // Next decision: Do we own the chunk?
                if ((node).attr("author") == session.myname) {
                    // Cursor, normal character, we own the node
                    // END: Insert the character into the node
                    var c = String.fromCharCode(event.which);
                    var id = node.attr("id");
                    this.insert_in_chunk(id, offset, c);
                    return false;
                } else {
                    // Cursor, normal character, we do not own the node
                    // END: Split the chunk in two, make the new chunk
                    // have the new text
                    var c = String.fromCharCode(event.which);
                    var id = node.attr("id");
                    this.split_chunk(id, offset, c);
                    return false;
                }
            }
        } else {
            // Is a selection, not just a cursor.
            alert("TODO: Handle selections");
        }
        alert("Boom");
    }

    this.get_selection = function() {
        // Returns the browser's internal selection object
        var userSelection;
        if (window.getSelection) {
            userSelection = window.getSelection();
        }
        else if (document.selection) { // should come last; Opera!
            userSelection = document.selection;
        }
        return userSelection;
    }

    this.get_range = function() {
        // Gets a range object from the selection.
        // Lovingly copied from TinyMCE
        var s = this.get_selection();
        return s.rangeCount > 0 ? s.getRangeAt(0) : (s.createRange ? s.createRange() : window.document.createRange());
    }

    this.get_start_node = function() {
        // Returns the DOM element of the node the cursor is in.
        // Thanks to TinyMCE for this code! HUGS AND SWEETUMS.
        var range = this.get_range(), e;
        if ($.browser.msie) {
				if (range.item)
					return range.item(0);
				range = range.duplicate();
				range.collapse(1);
				e = range.parentElement();
                /*
				if (e && e.nodeName == 'BODY')
					return e.firstChild;
                    */
			} else {
                e = range.startContainer;
			}
            var c = $(e).closest(".chunk");
            // TODO: What if we're not inside a chunk?
            return c
    }

    this.get_start_offset = function () {
        // Get the number of characters before the start of the selection.
        // Thanks, TinyMCE
        var range = this.get_range();
        if ($.browser.msie) {
            // IE support
            // Text selection
            c = -0xFFFFFF; // ooooh, magic
            tr = document.body.createTextRange(); // New blank range
            
            begin = range.duplicate(); // Copy our old range (used for finding start node)
            begin.collapse(1); // Collapse our copy to just a cursor

            tr.moveToElementText(begin.parentElement()); // Makes our range encompass the element in the beginning
            tr.collapse(); // Collapse our fake range to the left of the cursor
            bp = Math.abs(tr.move('character', c)); // Moves our stinkin' cursor to the beginning of the page.
            
            // Confused yet? Me too.
            // The idea is: if we know how many characters from the beginning of the page
            // to the start of the element and we know how many characters from
            // the beginning of the page is to the cursor, then we know how many
            // characters from the element to the selection.

            // So let's find that second value.
            tr = range.duplicate(); // Copy our old range (re-uses variables here)
            tr.collapse(); // Collapse it to just a cursor
            sp = Math.abs(tr.move('character', c)); // Move this to the beginning of the document
            return sp - bp; // And return our value.
        } else {
            // blindingly simple ;)
            return range.startOffset;
        }
    }
    
    this.set_cursor_offset = function(node, offset) {
        // This function, given a node and an offset, sets the cursor to there.
        // TODO: Test in IE and Chrome please.
        node = $(node).get(0).firstChild;
        r = this.get_range();
        if ($.browser.msie) {
            r.moveToElementText(node);
            r.collapse();
            r.move('character', offset);
        } else {
            //console.log(node);
            //console.log(offset);
            r.setStart(node, offset);
            r.setEnd(node, offset);
        }
    }
    
    this.is_cursor = function() {
        // Returns true if we have just a cursor, false if it's a selection
        // Lovingly copied from TinyMCE

        var r = this.get_range(), s = this.get_selection();
			if (!r || r.item) {
                return false;
            }
			return r.boundingWidth == 0 || r.collapsed;
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

    //////////////////////////////////////////
    // Events from the server
    
    this.parse_resync_event = function(data) {
        // What happens when the server sends us a resync event?
        this.users = data.users; // Copy users
        pagehandler.drawUserList(this.users, "user", this.jqulist); // Draw ulist
        this.reset(data.content);
    }
    this.parse_insert_event = function(event) {
        alert("Insert, position: " + event.pos + ", text: " + event.text);
        this.state++;
    }
    this.parse_delete_event = function(event) {
        alert("Delete, begin: " + event.begin + ", end: " + event.end);
        this.state++;
    }
    
    
    //////////////////////////////////////////
    // Requests to the server
    
    this.resync = function() {
        this.disable_editing();
        // Asks the server to resync us.
        $.get("resync_doc", {"doc_name":this.name});
    }
    
    this.del = function(id, begin, end) {
        $.get("remove", {
            "doc_name": this.name,
            "begin": begin,
            "end": end,
            "s": this.state
        })
    }
    this.ins = function(id, offset, text) {
        $.get("insert", {
            "doc_name": this.name,
            "pos": offset,
            "t": text
        })
    }
    
    
    this.destroy = function() {
        // We've been destroyed! Best clean up our actions.
        pagehandler.removeDoc(this.name, $(".tablist"));
    }
    
}