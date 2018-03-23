var $ = require('jquery');

module.exports = {
    load: function (hideAlertSuccess) {
        // This event is fired when the alert has been closed 
        // (will wait for CSS transitions to complete).
        $('.alert').on('closed.bs.alert', function () {
            $('.alert-container').remove();
        });

        if (hideAlertSuccess) {
            // Hide success alert on load
            // after 5s
            window.setTimeout(function () {
                $('.alert-success').alert('close');
            }, 5000);
        }
    }
};