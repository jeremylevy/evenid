var $ = require('jquery');

module.exports = {
    load: function () {
        $.ajaxSetup({
            // Disable caching of XHR GET responses globally
            // (workaround for jQuery callbacks not firing if the response was cached)
            cache: false,

            // Send CSRF token with XHR requests
            beforeSend: function (xhr, settings) {
                if (!(/^http:.*/.test(settings.url) 
                    || /^https:.*/.test(settings.url))) {

                    // Only send the token to relative URLs i.e. locally.
                    xhr.setRequestHeader('X-CSRF-Token', $('input[name="_csrf"]').val());
                }
            }
        });
    }
};