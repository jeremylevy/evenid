var $ = require('jquery');

var setCursorEndInput = require('./setCursorEndInput');

module.exports = {
    focus: function (opts) {
        var $errors = null;
        var scrollTop = 0;
        var $inputToFocusTo = null;
        var afterFocus = function (e) {
            setCursorEndInput($inputToFocusTo);

            // Keep scroll at the same level
            if (opts.withoutScrolling) {
                window.scrollTo(0, scrollTop);
                document.body.scrollTop = scrollTop;
            }
        };

        opts = opts || {};
        
        $errors = $('.error-wrapper');
        $inputToFocusTo = $('.input-to-focus-to');

        // Don't focus on mobile
        if ($('html').hasClass('mobile')
            || $('html').hasClass('tablet')) {
            
            return;
        }

        // Keep scroll at the same level
        if (opts.withoutScrolling) {
            scrollTop = $(document).scrollTop();
        }

        // If no errors, focus on first empty input
        if (!$errors.length) {
            if (!$inputToFocusTo.length) {
                $inputToFocusTo = $(':input:enabled:visible').filter(function () {
                    var tagName = $(this).prop('tagName').toLowerCase();
                    
                    return $(this).val() === ''
                        && (tagName === 'input' || tagName === 'textarea')
                        && $(this).attr('type') !== 'submit' 
                        && $(this).attr('type') !== 'file';
                
                }).first();
            }
        } else { // Else, focus on input which has triggered error
            $inputToFocusTo = $errors.first().prevAll('input,textarea').first();
        }

        // For old browsers
        $inputToFocusTo.one('focus', afterFocus);
        
        $inputToFocusTo.focus();

        // For recent browsers
        afterFocus();
    }
};