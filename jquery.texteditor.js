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
        iframe.contentWindow.document.write("<html><body><br /></body></html>");
        iframe.contentWindow.document.close();
        
        iframe.contentWindow.document.designMode = "on";
        
        // Now that we have a nice editable iframe, let's add some handlers!
        $(iframe.contentWindow).keypress(function(event) {
            //alert(event.keyCode);
        });
    };

}