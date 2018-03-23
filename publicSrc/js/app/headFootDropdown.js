var $ = require('jquery');

module.exports = function (selector) {
    var timeout = null;
    var hiddenAnimState = 'hidden-animation-state';

    $(document).on('click', function (e) {
        var $container = $(selector);
        var $ul = $container.siblings('ul');

        // if the target of the click isn't the list
        if (!$ul.is(e.target) 
            // ... nor a descendant of the list
            && $ul.has(e.target).length === 0
            && $ul.is(':visible')) {
            
            // IE 8-9
            if ($('body').hasClass('ie')
                // IE 10
                || Function('/*@cc_on return document.documentMode===10@*/')()) {
                
                $ul.hide();
            } else {
                $ul.one('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd', function () {
                    $ul.removeClass(hiddenAnimState).hide();
                });

                $ul.addClass(hiddenAnimState);
            }
        }
    });

    $(selector).on('click', function (e) {
        var $ul = $(this).siblings('ul');

        if (selector.indexOf('.country-selector') !== -1) {
            $ul.css('top', - ($ul.outerHeight() + 23) + 4);
        }

        if ($ul.is(':visible')) {
            return;
        } 

        // IE 8-9
        if ($('body').hasClass('ie')
            // IE 10
            || Function('/*@cc_on return document.documentMode===10@*/')()) {
            
            $ul.show();
        } else {
            $ul.addClass(hiddenAnimState).show(); 

            if (timeout) {
                clearTimeout(timeout);
            }

            timeout = setTimeout(function () {
                return $ul.removeClass(hiddenAnimState);
            }, 100);
        }

        return false;
    });
};