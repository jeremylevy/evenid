var $ = require('jquery');

var setCursorEndInput = require('./setCursorEndInput');

module.exports = {
    load: function () {
        // Check if input type attribute
        // could be changed
        var couldBeEnabled = (function () {            
            return !$('body').hasClass('ie8') 
                && !$('body').hasClass('ie9');
        })();

        var $toggleLinks = $('a.toggle-password-visibility');

        // If old browers, we add a text
        // input next to the password one
        // and we toggle the visibility
        // on click

        if (!couldBeEnabled) {
            $toggleLinks.each(function (index) {
                var $toggleLink = $(this);
                var $inputPassword = $('#' + $toggleLink.data('field-id'));
                var $inputText = null;
                var inputTextID = 'password-visibility-text-input-' + index;

                $inputText = $('<div />').append($inputPassword.clone()).html();
                $inputText = $inputText.replace(/type=[^\s\/]+/g, 'type="text"');
                $inputText = $($inputText);

                // We use `hidden` class
                // and not show/hide method
                // to avoid competing with
                // `jquery.placeholder` module.
                $inputText.addClass('hidden no-placeholder')
                          .attr('id', inputTextID)
                          .attr('disabled', 'disabled')
                          .insertAfter($inputPassword);

                $toggleLink.data('password-visibility-field-id', inputTextID);
            });
        }

        $toggleLinks.click(function (e) {
            var $toggleLink = $(this);
            var $inputPassword = $('#' + $toggleLink.data('field-id'));
            var $inputText = $('#' + $toggleLink.data('password-visibility-field-id'));
            var currentState = $toggleLink.data('current-state');

            if (currentState === 'view') {
                $toggleLink.text($toggleLink.data('hide-i18n'));
                $toggleLink.data('current-state', 'hide');
                
                if (!couldBeEnabled) {
                    $inputPassword.addClass('hidden')
                                  .attr('disabled', 'disabled');
                    
                    $inputText.val($inputPassword.val())
                              .removeClass('hidden')
                              .removeAttr('disabled');

                    setCursorEndInput($inputText).focus();
                } else {
                    $inputPassword.hideShowPassword(true);
                    setCursorEndInput($inputPassword).focus();
                }

                return false;
            }
            
            $toggleLink.text($toggleLink.data('view-i18n'));
            $toggleLink.data('current-state', 'view');
            
            if (!couldBeEnabled) {
                $inputText.addClass('hidden')
                          .attr('disabled', 'disabled');
                
                $inputPassword.val($inputText.val())
                              .removeClass('hidden')
                              .removeAttr('disabled');

                setCursorEndInput($inputPassword).focus();
            } else {
                $inputPassword.hideShowPassword(false);
                setCursorEndInput($inputPassword).focus();
            }

            return false;
        });
    }
};