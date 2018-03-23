var $ = require('jquery');

var firstInputFocus = require('../app/firstInputFocus');

module.exports = {
    load: function () {
        var inputsSelector = 'input,select,textarea';
        var toggleSection = function ($sepToShow, $sectionToShow, action) {
            var $inputs = $sectionToShow.find(inputsSelector);

            if (action === 'hide') {
                if ($sepToShow) {
                    $sepToShow.addClass('hidden');
                }

                $sectionToShow.addClass('hidden');

                $inputs.attr('disabled', 'disabled');
            } else {
                $inputs.removeAttr('disabled');

                if ($sepToShow) {
                    $sepToShow.removeClass('hidden');
                }

                $sectionToShow.removeClass('hidden');
            }
        };

        // For selects which was displayed in authorize part
        $('select.field-to-authorize').on('change', function (e) {
            var $select = $(this);
            var $useAnother = $select.find('option[data-section-to-show]');

            var $sectionToShow = $('.' + $useAnother.data('section-to-show'));
            var $sepToShow = $('.' + $useAnother.data('sep-to-show'));

            var $inputs = $sectionToShow.find(inputsSelector);
            
            // User has selected `Use another`
            if ($useAnother.is(':selected')) {
                // Show empty input for email, phone number or address
                toggleSection(null, $sectionToShow, 'show');

                firstInputFocus.focus({
                    withoutScrolling: true
                });

                // At this point we have a select 
                // and an input with the same name.
                // Rename select in order to pass only field value
                $select.attr('name', '_' + $select.attr('name'));

                // Show separator if hidden
                if ($sepToShow.is(':hidden')) {
                    $sepToShow.removeClass('hidden');
                }
            } else { // User has switched from `Use another` to entity
                // Hide empty input for email, phone number or address
                toggleSection(null, $sectionToShow, 'hide');

                // Back to real name
                $select.attr('name', $select.attr('name').replace(/^_/, ''));

                // No visible field for this separator, hide it!
                if (!$sepToShow.next('.fields-to-show').find(':visible').length) {
                    $sepToShow.addClass('hidden');
                }
            }
        });
    
        // `Use as billing address` in authorize part
        $('.use_as_auth_billing_address').on('change', function (e) {
            var $checkbox = $(this);
            // Billing address select is in the next row
            var $row = $checkbox.parents('.authorizations-row')
                                .next('.authorizations-row');
            var $select = $row.find('select.field-to-authorize');

            // `Use as billing address` checked
            // hide next row
            if ($checkbox.is(':checked')) {
                $row.addClass('hidden');

                // Reset billing address to first address
                // In order to call change handler
                // and hide the billing address form
                $select.val($select.find('optgroup option:first').val()).change();
            } else {    
                $row.removeClass('hidden');
            }
        });

        // `Use as billing address` in fill part
        $('.use_as_billing_address').on('change', function (e) {
            var $checkbox = $(this);
            var $sepToShow = $('.billing-address-fields-sep');
            var $formToShow = $('.hidden-billing-address');
            var $inputs = $formToShow.find(inputsSelector);
            
            // `Use as billing address` checked
            // hide billing address form and separator
            if ($checkbox.is(':checked')) {
                toggleSection($sepToShow, $formToShow, 'hide');
            } else { // Show billing address form and separator
                toggleSection($sepToShow, $formToShow, 'show');
            }
        });

        // Prefil address full name with
        // filled first/last name
        if ($('#first-name').length) {
            $($('#last-name').length ? '#last-name' : '#first-name').on('blur', function (e) {
                var $input = $(this);
                // Empty full name inputs
                var $fullNameInputs = $("input[name$='full_name']").filter(function (el) {
                    return !$(this).val();
                });

                var firstName = $.trim($('#first-name').val());
                var lastName = $.trim($('#last-name').val());
                var fullName = firstName + ' ' + lastName;

                if (!$fullNameInputs.length
                    || !firstName) {
                    
                    return;
                }

                $fullNameInputs.val(fullName);
            });
        }
    }
};