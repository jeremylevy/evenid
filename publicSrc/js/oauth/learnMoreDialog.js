var $ = require('jquery');

module.exports = {
    load: function () {
        // Handle click on close btn
        $('.learn-more-main-ads-container .close-btn').on('click', function (e) {
            $('.learn-more-main-ads-container').remove();
        });
    }
}