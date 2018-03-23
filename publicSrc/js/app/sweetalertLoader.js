var $ = require('jquery');
var sweetAlert = require('sweetalert');

module.exports = {
    seeClientSecret: function (userPassword) {
        var $btn = this;

        if (!userPassword) {
            sweetAlert.showInputError($btn.data('empty-password-error-message'));
            
            return false;
        }

        $.ajax({
            url: '/clients/' + $btn.data('client-id') + '/client-secret',
            data: {
                user_password: userPassword
            },
            type: 'POST'
        })
        .done(function (data) {
            $btn.replaceWith('<p>' + data.client_secret + '</p>');
            
            sweetAlert({
                title: $btn.data('ajax-success-title'),
                text: $btn.data('ajax-success-message'),
                timer: 1400,
                showConfirmButton: false,
                type: 'success'
            });
        })
        .fail(function (data) {
            var err = data.responseJSON || {};

            if (err.type === 'invalid_request') {
                sweetAlert.showInputError(err.messages.user_password);

                return;
            }

            sweetAlert($btn.data('ajax-error-title'),
                       $btn.data('ajax-error-message'),
                       "error");
        });
    },

    checkUserPassword: function (userPassword) {
        var $btn = this;

        if (!userPassword) {
            sweetAlert.showInputError($btn.data('empty-password-error-message'));
            
            return false;
        }

        $.ajax({
            url: '/users/' + $btn.data('user-id') + '/check-password',
            data: {
                user_password: userPassword
            },
            type: 'POST'
        })
        .done(function (data) {
            var sweetAlertCloseFn = sweetAlert.close;

            // We hook the close function 
            // because we want to send form when sweetAlert was closed by timer
            // and it doesn't expose an `onClose` event
            sweetAlert.close = function () {
                var $form = $btn.parents('form').first();

                // Reset default function
                sweetAlert.close = sweetAlertCloseFn;

                // Keep the original context
                sweetAlertCloseFn.call(sweetAlert);

                // DELETE method needs user password
                $form.find('input[name="user_password"]')
                     .val(userPassword);

                // Submit delete form
                $form.submit();
            };

            sweetAlert({
                title: $btn.data('ajax-success-title'),
                text: $btn.data('ajax-success-message'),
                timer: 1400,
                showConfirmButton: false,
                type: 'success'
            });
        })
        .fail(function (data) {
            var err = data.responseJSON || {};

            if (err.type === 'invalid_request') {
                sweetAlert.showInputError(err.messages.user_password);

                return;
            }

            sweetAlert($btn.data('ajax-error-title'), 
                       $btn.data('ajax-error-message'), 
                       "error");
        });
    },

    load: function () {
        $(document).on('click.sweetalert', '[data-sweetalert="true"]', function (e) {
            var $btn = $(e.target);
            var btnData = $btn.data();

            // jQuery camelcase element data.
            // Capture first letter of sweetalert key
            // in order to lowercase it
            var keyReg = /^sweetalert([A-Z])/;
            var matches = null;
            var options = {};

            for (var key in btnData) {
                matches = keyReg.exec(key);

                // Make sure key is for sweetalert.
                if (!matches) {
                    continue;
                }

                // `matches[1]` contains last letter
                // `sweetalertFooBar` -> `fooBar`
                options[matches[1].toLowerCase()
                        + key.replace(keyReg, '')] = btnData[key];
            }

            if (!options.animation) {
                options.animation = 'slide-from-top';
            }

            sweetAlert(options, function (inputValueOrCancel) {
                // User has cancelled
                if (inputValueOrCancel === false) {
                    return;
                }

                if (options.callbackFunction) {
                    app.sweetAlertLoader[options.callbackFunction].call($btn, inputValueOrCancel);

                    return;
                }

                // Used in form?
                if ($btn.attr('type') !== 'submit') {
                    return;
                }

                // Submit form when user confirm
                $btn.parents('form')[0].submit();
            });

            // Cancel form submit
            if ($btn.attr('type') === 'submit') {
                return false;
            }

            return true;
        });
    }
};