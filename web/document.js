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
    this.jqdoctab = $("<br />"); // The jQuery doctab.
    this.jqulist = $("<br />"); // The jQuery user list reference inside the doctab.
    this.users = [];
    this.content = "";
    this.sstate = 0;
    this.shistory = []; // The list of server history
    this.dmp = new diff_match_patch();
    this.timer = 0;
    
    
    //this.content = [];

    this.reset = function(event) {
        // Resets the entire editor
        
        // Save this document
        var doc = this;
        
        this.disable_editing();

        // This clears everything and fills it with content.
        this.jqedit.empty();
        
        this.jqedit.text(event.content);
        this.content = event.content;
        
        this.sstate = event.sstate;
        
        // Fill up our history with an empty list
        this.history = [];
        if (event.cstate < 0) {
            this.history[event.cstate - 1] = undefined;
            // Little trick. ^_^
        }
        
        this.enable_editing();
    };

    this.disable_editing = function() {
        this.jqedit.attr("contentEditable", false);
        this.jqedit.unbind("keyup");
        this.timer = window.clearInterval(this.timer);
        //this.jqedit.unbind("keypress");
        //this.jqedit.unbind("keydown");
    };

    this.enable_editing = function() {
        this.jqedit.attr("contentEditable", true);
        // Save the document object
        var doc = this;
        
        // Fix enter
        this.jqedit.keydown(function(e) {
            if (e.which == 13) {
                // TODO: Ignore enter, but we should change it so that
                // it inserts a newline instead
                // TODO: Also get it to work with IE and Chrome
                e.preventDefault();
            }});
        //this.jqedit.keyup(function() {doc.scan_for_changes()});
        this.timer = window.setInterval(function() {
            doc.scan_for_changes();
        },1000); // Edit this line to change the timeout
    };

    this.scan_for_changes = function() {
        // Scans for changes
        //console.time("Changes");
        
        // First, define some constants
        var DIFF_DELETE = -1;
        var DIFF_INSERT = 1;
        var DIFF_EQUAL = 0;
        
        // Remembers the new text so we only need to get it once
        var newtext = this.jqedit.text();
        
        // Compares the diff
        var d = this.dmp.diff_main(this.content,newtext);
        
        // Go through each part of the diff and see what changed
        var pos = 0;
        for (var i=0; i<d.length; i++) {
            switch (d[i][0]) {
                case DIFF_EQUAL:
                    // No special handling req'd
                    pos += d[i][1].length;
                    break;
                case DIFF_INSERT:
                    // Ask the server to insert a bit of text there
                    this.send_ins(pos, d[i][1]);
                    pos += d[i][1].length;
                    break;
                case DIFF_DELETE:
                    // Ask the server to delete a bit of text there
                    this.send_del(pos, pos+d[i][1].length);
                    // do not increment "pos" because we dun do anything to it
                    break;
            }
            // And add the length of our text to pos so we can see where we are
        }
        //
        //console.log(newtext);
        //console.log(d);
        
        // Now saves the latest version that we know about back
        // to this.content
        this.content = newtext;
        //console.timeEnd("Changes");
    };
    
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
    };

    this.get_range = function() {
        // Gets a range object from the selection.
        // Lovingly copied from TinyMCE
        var s = this.get_selection();
        return s.rangeCount > 0 ? s.getRangeAt(0) : (s.createRange ? s.createRange() : window.document.createRange());
    };

    this.get_start_node = function() {
        // Returns the DOM element of the node the cursor is in.
        // Thanks to TinyMCE for this code! HUGS AND SWEETUMS.
        var range = this.get_range(), e;
        if ($.browser.msie) {
				if (range.item) {
					return range.item(0);
				}
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
            var c = $(e).closest(".gb-editor");
            // TODO: What if we're not inside a chunk?
            return c;
    };

    this.get_start_offset = function () {
        // Get the number of characters before the start of the selection.
        // Thanks, TinyMCE
        var range = this.get_range();
        if ($.browser.msie) {
            // IE support
            // Text selection
            var c = -0xFFFFFF; // ooooh, magic
            var tr = document.body.createTextRange(); // New blank range
            
            var begin = range.duplicate(); // Copy our old range (used for finding start node)
            begin.collapse(1); // Collapse our copy to just a cursor

            tr.moveToElementText(begin.parentElement()); // Makes our range encompass the element in the beginning
            tr.collapse(); // Collapse our fake range to the left of the cursor
            var bp = Math.abs(tr.move('character', c)); // Moves our stinkin' cursor to the beginning of the page.
            
            // Confused yet? Me too.
            // The idea is: if we know how many characters from the beginning of the page
            // to the start of the element and we know how many characters from
            // the beginning of the page is to the cursor, then we know how many
            // characters from the element to the selection.

            // So let's find that second value.
            tr = range.duplicate(); // Copy our old range (re-uses variables here)
            tr.collapse(); // Collapse it to just a cursor
            var sp = Math.abs(tr.move('character', c)); // Move this to the beginning of the document
            return sp - bp; // And return our value.
        } else {
            // blindingly simple ;)
            return range.startOffset;
        }
    };
    
    this.set_cursor_offset = function(node, offset) {
        // This function, given a node and an offset, sets the cursor to there.
        node = $(node).get(0);
        var r = this.get_range();
        if ($.browser.msie) {
			r.moveToElementText(this.jqedit.get(0));
			r.collapse(true);
			r.move('character', offset);
            
            // And after about two and a half hours of debugging and digging
            // through the TinyMCE, FCKEdit, and my own source code,
            // I finally find the single line of code that
            // ensures this function works in IE.
            
            // Now, for your amazement, I present to you the object
            // of my half-day-long search:
            r.select();
            // ^ BASK IN ITS AWESOMENESS
            
            // Surely I'm smarter than that.
            
        } else {
            // firefox prefers text nodes
            node = node.firstChild;
            //console.log(node);
            //console.log(offset);
            r.setStart(node, offset);
            r.setEnd(node, offset);
        }
    };
    
    this.is_cursor = function() {
        // Returns true if we have just a cursor, false if it's a selection
        // Lovingly copied from TinyMCE

        var r = this.get_range(), s = this.get_selection();
			if (!r || r.item) {
                return false;
            }
			return r.boundingWidth === 0 || r.collapsed;
    };
    
    
    //////////////////////////////////////////
    // Events from the server
    
    this.parse_subscribed_user = function(u) {
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
    };
    this.parse_unsubscribed_user = function(leavingUser) {
        // This function removes users from the user list. It does not touch the
        // document.

        var numUsers = this.users.length;
        for (var i=0; i<numUsers; i++) {
            var u = this.users[i];
            if (u.name == leavingUser.name) {
                numUsers--; // Decrease the number of users left to search
                this.users.splice(i,1); // Remove this user
                pagehandler.removeUser(leavingUser, this.jqulist); // Un-draw this user
            }
        }
    };
    
    this.parse_resync_event = function(data) {
        // What happens when the server sends us a resync event?
        this.users = data.users; // Copy users
        pagehandler.drawUserList(this.users, "user", this.jqulist); // Draw ulist
        this.reset(data);
    };
    
    this.parse_insert_event = function(event) {
        if (event.user.name != session.myname) {
            this.scan_for_changes();
            
            var curpos = this.get_start_offset();
            var oldtext = this.jqedit.text();
            var newtext = oldtext.slice(0, event.pos) + event.text + oldtext.slice(event.pos);
            this.content = newtext;
            this.jqedit.text(newtext);
            
            if (curpos >= event.pos) {
                // Need to change the position
                this.set_cursor_offset(this.jqedit, curpos + event.text.length);
            }
        }
        
        // Save state
        this.sstate++;
    };
    
    this.parse_delete_event = function(event) {
        this.scan_for_changes();
        
        var curpos = this.get_start_offset();
        var oldtext = this.jqedit.text();
        var newtext = oldtext.slice(0, event.begin) + oldtext.slice(event.end);
        this.content = newtext;
        this.jqedit.text(newtext);
        if (curpos >= event.end) {
            // Need to change the cursor)
            this.set_cursor_offset(this.jqedit, curpos - (event.end - event.begin));
        } else if (curpos >= event.begin) {
                this.set_cursor_offset(this.jqedit, event.begin);
        } else {
            this.set_cursor_offset(this.jqedit, curpos);
        }
        this.sstate++;
    };
    
    
    //////////////////////////////////////////
    // Requests to the server
    
    this.send_resync = function() {
        this.disable_editing();
        // Asks the server to resync us.
        $.get("resync_doc", {"doc_name":this.name});
    };
    
    this.send_del = function(begin, end) {
        // Add to our history
        this.history.push({
            op: "remove",
            begin: begin,
            end: end
        });
        // And notify the server
        $.get("remove", {
            "doc_name": this.name,
            "begin": begin,
            "end": end,
            "ss": this.sstate,
            "cs": this.cstate
        });
    };
    
    this.send_ins = function(offset, text) {
        // Add to our history
        this.history.push({
            op: "insert",
            pos: offset,
            t: text
        });
        $.get("insert", {
            "doc_name": this.name,
            "pos": offset,
            "t": text,
            "ss": this.sstate,
            "cs": this.cstate
        });
    };
    
    
    this.destroy = function() {
        // We've been destroyed! Best clean up our actions.
        this.timer = window.clearInterval(this.timer);
        pagehandler.removeDoc(this.name, $(".tablist"));
    };
    
}
