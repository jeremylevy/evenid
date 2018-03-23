var $ = require('jquery');

var Cookie = require('./classes/Cookie');

module.exports = {
    load: function () {
        var cookieName = 'cookie_consent';
        var cookie = new Cookie(cookieName);

        var cookieValue = 'ok';
        // In days
        var cookieExpiresIn = 365 * 10;

        var $banner = $('.cookie-banner');
        var $closeBtn = $banner.find('.close-btn');

        // Make sure cookie banner was hidden
        $banner.hide();

        $closeBtn.on('click', function (e) {
            $banner.hide();
        });

        if (cookie.value() !== cookieValue){
            $banner.show();

            Cookie.create(cookieName, cookieValue, cookieExpiresIn);
        }
    }
};