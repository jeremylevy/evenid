var $ = require('jquery');

var Lightbox = require('./classes/Lightbox');

module.exports = {
    load: function () {
        var lightbox = new Lightbox('.lightbox');
        var selectors = [
            'body.credentials.registration',
            '.login-form',
            'input[name="email"]'
        ];

        var $form = $(selectors.slice(0, 2).join(' '));
        var $emailInput = $(selectors.join(' '));

        var $submitBtn = $form.find('button[type="submit"]');
        var $ajaxLoader = $form.find('.login-form-ajax-loader');

        var userIsNotRegistered = false;
        var pendingRequest = null;

        var lightboxWasDisplayed = false;
        var checkedEmails = [];

        $(document).on('evenID.lightbox.open', function (e, contentName) {
            if (contentName !== 'learn-more') {
                return;
            }

            lightboxWasDisplayed = true;
        });

        $emailInput.on('blur', function (e) {
            var email = $.trim($emailInput.val());

            if (lightboxWasDisplayed 
                || !email 
                || pendingRequest
                || $.inArray(email, checkedEmails) !== -1) {
                
                return;
            }

            pendingRequest = $.ajax({
                url: '/users/is-registered',
                data: {
                    email: email
                },
                type: 'POST'
            })
            .done(function (resp) {
                userIsNotRegistered = !resp.is_registered;

                // Display "The password previously used on 
                // sites and applications using EvenID"
                if (!userIsNotRegistered) {
                    $('label[for="password"]').first().addClass('hidden');
                    $('label[for="password"]').last().removeClass('hidden');
                } else {
                    // Display "A password (%d characters min.)"
                    $('label[for="password"]').last().addClass('hidden');
                    $('label[for="password"]').first().removeClass('hidden');
                }
            })
            .always(function () {
                checkedEmails.push(email);
                
                pendingRequest = null;

                $submitBtn.removeClass('disabled');
                $ajaxLoader.hide();
            });
        });

        $form.on('submit', function (e) {
            if (pendingRequest) {
                $submitBtn.addClass('disabled');
                $ajaxLoader.show();
                
                return false;
            }

            // Invalid form.
            // Let browser validators
            // do their job.
            if ($form[0].checkValidity
                && !$form[0].checkValidity()) {

                return true;
            }

            if (userIsNotRegistered
                && !lightboxWasDisplayed) {
                
                lightbox.onClose = function () {
                    lightboxWasDisplayed = true;

                    $submitBtn.addClass('disabled');
                    $ajaxLoader.show();

                    $form.submit();
                };

                lightbox.open('first-registration');

                return false;
            }

            return true;
        });
    }
}