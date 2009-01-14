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
    this.jqulist = $("<br />"); // The jQuery user list reference

    this.resync = function(callback) {
        // Asks the server to resync us.
        $.get("resync_doc", {"doc_name":this.name});
    }

    this.parse_resync_event = function(data) {
        // What happens when the server sends us a resync event?
        //console.log(data);
    }


    // What we want to do the first time we start up
    this.resync();
    pagehandler.drawNewDoc(this, "open", $(".tablist"));
    pagehandler.drawNewUser({name:"Bob"},"user",this.jqulist);
    pagehandler.drawNewUser({name:"Jane"},"user",this.jqulist);
    pagehandler.removeUser({name:"Bob"}, this.jqulist);
}