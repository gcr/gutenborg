/*
* Document plugin (with text editor)
*
* Released under the GPLv2
*
*
* Browser compatability:
* Fx2: TODO  Fx3: Perfect  Ie6: TODO  Ie7: TODO  Op9: TODO  Ch: TODO
*/

jQuery.gbeditor = function (iframe, doc) {
    var iframe = $(iframe).get(0);
    return iframe._gbeditor || (iframe.gb_editor = new jQuery._gbeditor(iframe, doc));
}

jQuery._gbeditor = function(iframe, doc) {
    // Store editor object
    var ge = this;
    ge.doc = doc;
    ge.show = function() {
        // For combatability
        $(iframe).show();
    }
    ge.hide = function() {
        // More compatability
        $(iframe).hide();
    }
    ge.remove = function() {
        $(iframe).remove();
    }

    ge.reset = function(content) {
        // This clears everything and fills it with content.
        edbody = $("body", iframe.contentWindow.document);
        edbody.empty();
        //$("body", iframe.contentWindow.document).text(ge.doc.name); //TEST
        $("<h2></h2>").append("Hi").appendTo($(".docarea"));
        $(content).each(function(index, c) {
            newchunk = $("<span></span>").text(c.text);
            
            newchunk.css({"background-color": c.author.color});
            //alert(newchunk.html());
            newchunk.appendTo(edbody);
        });
        
    }



    // Initialization stuffs

    // Clear out our iframe
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write("<html><head>" +
    "<link href='design.css' rel='stylesheet' type='text/css' />" +
    "</head><body></body></html>");
    iframe.contentWindow.document.close();

    //iframe.contentWindow.document.designMode = "on";

    $(iframe.contentWindow.document).keypress(function(event) {
        // Prevent typing in that space
        // Compatability: Fx2: TODO; Fx3: Perfect; Ie6: TODO; Ie7:
        // TODO: Fix this working with nested elements
        // BUG: This function fails if you right-click and choose "paste"

        if ($(iframe.contentWindow.getSelection().anchorNode).parent().is(".notype") && event.charCode != 0) {
            // TODO: Instead of preventing tying, just split the chunks up
            //console.log("which: "+event.which+" keycode: "+event.keyCode+" charCode: "+event.charCode)
            event.preventDefault();
        }
    });
    
    
}