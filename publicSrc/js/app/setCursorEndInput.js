// Set cursor at the end of the input
module.exports = function ($input) {
    // For new browsers.
    // Kudos to:
    // http://stackoverflow.com/questions/19568041/set-focus-and-cursor-to-end-of-text-input-field-string-w-jquery
    if ($input.attr('type')
        && $input.attr('type')
                 .match(/text|password|search|tel|url/)
        && $input.length
        && $input[0].setSelectionRange) {
        
        $input[0].setSelectionRange($input.val().length * 2, 
                                    $input.val().length * 2);
    } else {
        // For old browsers.
        // Kudos to:
        // http://stackoverflow.com/questions/511088/use-javascript-to-place-cursor-at-end-of-text-in-text-input-element
        $input.one('focus', function (e) {
            $input.val($input.val());
        });
    }

    // Enable method chaining
    return $input;
};