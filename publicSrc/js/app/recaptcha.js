var $ = require('jquery');

module.exports = {
    load: function () {
        var $recaptcha = $('.g-recaptcha');
        var script = document.createElement('script');

        if (!$recaptcha.length) {
            return;
        }

        $recaptcha.removeClass('hidden');

        window.recaptchaOnLoadCallback = function () {
            var opts = $recaptcha.data();

            opts.callback = window.recaptchaOnSuccessCallback;

            // Hide `:before` content
            $recaptcha.addClass('loaded');

            // Recaptcha needs an empty container
            $recaptcha.html('');

            grecaptcha.render($recaptcha[0], opts);
        };

        // Submit form once captcha was resolved
        window.recaptchaOnSuccessCallback = function (userResp) {
            $('.success-ajax-loader-container').show();

            $recaptcha.parents('form').submit();
        };

        script.src = 'https://www.google.com/recaptcha/api.js?render=explicit&onload=recaptchaOnLoadCallback';
        script.async = true;

        $('body').append(script);
    }
};