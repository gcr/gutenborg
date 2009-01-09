/*
* Document plugin (with text editor)
*
* Released under the GPLv2
*
*
* Browser compatability:
* Fx2: TODO  Fx3: Perfect  Ie6: TODO  Ie7: TODO  Op9: TODO  Ch: TODO
*/

jQuery.fn.document = function(server, documentnumber, nick) {

    $(this).each( function(){
        var singleiframe = this;
        enableDesignMode(singleiframe);
    });
    
    function enableDesignMode(iframe) {
        // This function makes a single iframe editable.
        iframe.contentWindow.document.open();
        iframe.contentWindow.document.write("<html><head>" + 
        "<link href='design.css' rel='stylesheet' type='text/css' />" +
        "</head><body></body></html>");
        iframe.contentWindow.document.close();
        
        iframe.contentWindow.document.designMode = "on";
        //$("body", iframe.contentWindow.document).attr("contentEditable", true);
        // This is not the way to do it.
        $("body", iframe.contentWindow.document).text("Editable Text ");
        $("body", iframe.contentWindow.document).append("<span class='notype'>Non-editable text</span>");
        $("body", iframe.contentWindow.document).append(" Editable Text");
        
        //$(".notype", iframe.contentWindow.document).attr("contentEditable", false);
        // Doesn't work for some browsers.

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

}