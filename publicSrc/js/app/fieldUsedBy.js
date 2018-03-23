var $ = require('jquery');

module.exports = {
    load: function (usedBy) {
        var parentContext = document;
        var handleInputChange = function ($input) {
            return function (e) {
                var field = $input.data('field');
                var fieldID = $input.data('field-id');

                var firstValue = $input.data('first-value');
                var fieldValue = $input.val();
                
                var usedBySelector = '.used-by[data-field="' + field + '"]';
                var updatedOnSelector = '.updated-on[data-field="' + field + '"]';

                var $usedBy = null;
                var $updatedOn = null;

                var profilPhotoTimeout = null;

                var displayUsedBy = function () {
                    // During oauth authorize flow
                    // we display authorizations only 
                    // when user has updated field
                    if (usedBy.indexOf('oauthAuthorizeFlow') === 0) {
                        (usedBy === 'oauthAuthorizeFlowProfilPhoto' 
                            ? $('.profil-photo-row', parentContext)
                            : $input.parents('.authorizations-single-fields'))
                                    .find('.authorizations-list')
                                    .css('display', 'none');

                        return;
                    }

                    if (field === 'profil_photo') {
                        $updatedOn.parents('.authorizations-list')
                                  .fadeOut(800, function () {
                            
                            $usedBy.removeClass('hidden')
                                   .parents('.authorizations-list')
                                   .hide()
                                   .fadeIn(800);

                            $updatedOn.addClass('hidden');
                        });

                        return;
                    }

                    $updatedOn.addClass('hidden');

                    $usedBy.removeClass('hidden');
                };

                var displayUpdatedOn = function () {
                    // During oauth authorize flow
                    // we display authorizations only 
                    // when user has updated field
                    if (usedBy.indexOf('oauthAuthorizeFlow') === 0) {
                        (usedBy === 'oauthAuthorizeFlowProfilPhoto' 
                            ? $('.profil-photo-row', parentContext)
                                .find('.authorizations-list')
                                .fadeIn(100)
                                .css('display', 'inline-block')
                            : $input.parents('.authorizations-single-fields')
                                    .find('.authorizations-list')
                                    .css('display', 'inline-block'))
                              // We don't want authorized clients links
                              // to be opened in the same page
                              .find('a[href!="javascript:;"]')
                              .attr('target', function (i, val) {
                                return $(this).attr('href');
                              });
                    }

                    $usedBy.addClass('hidden');

                    if (field === 'profil_photo') {
                        $updatedOn.removeClass('hidden')
                                  .parents('.authorizations-list')
                                  .hide()
                                  .fadeIn(800);

                        $updatedOn.parents('.authorizations-list')
                                  .find('a')
                                  .off('click')
                                  .on('click', function (e) {
                            
                            window.clearTimeout(profilPhotoTimeout);
                        });

                        window.clearTimeout(profilPhotoTimeout);

                        profilPhotoTimeout = window.setTimeout(function () {
                            if (usedBy === 'oauthAuthorizeFlowProfilPhoto') {
                                $updatedOn.parents('.authorizations-list').fadeOut(800);

                                return;
                            }

                            displayUsedBy();
                        }, 6000);

                        return;
                    }

                    $updatedOn.removeClass('hidden');
                };

                if (fieldID) {
                    usedBySelector += '[data-field-id="' + fieldID + '"]';
                    updatedOnSelector += '[data-field-id="' + fieldID + '"]';
                }

                $usedBy = $(usedBySelector, parentContext);
                $updatedOn = $(updatedOnSelector, parentContext);

                // Empty field on load. Pass.
                if (!firstValue) {
                    return;
                }

                // Display `used by...`
                if (firstValue.toString() === fieldValue.toString()) {
                    displayUsedBy();
                } else { // Display `Updated on...`
                    displayUpdatedOn();
                }
            };
        };

        if (usedBy === 'oauthAuthorizeFlowProfilPhoto') {
            parentContext = window.parent.document;
        }

        // Iframe -> managed by parent
        if (usedBy !== 'oauthAuthorizeFlowProfilPhoto') {
            $('.other-authorized-clients').popover({
                trigger: 'click',
                html: true,
                content: function (el) {
                    var $link = $(this);

                    return $link.parents('.authorizations-list')
                                .next('.popover-content')
                                .html();
                }
            });

            // Click outside to close popover
            $('body').on('click', function (e) {
                $('[data-toggle="popover"]').each(function () {
                    // The 'is' for buttons that trigger popups
                    // The 'has' for icons within a button that triggers a popup
                    if (!$(this).is(e.target) 
                        && $(this).has(e.target).length === 0 
                        && $('.popover').has(e.target).length === 0) {

                        $(this).popover('hide');
                    }
                });
            });
        }

        // See http://stackoverflow.com/questions/574941/best-way-to-track-onchange-as-you-type-in-input-type-text
        // Use `keyup` not `keydown` because we 
        // want the updated input value (Fix IE bug)
        $('.used-by-field').on('change keyup paste input', function (e) {
            handleInputChange($(this))(e);
        });

        $(document).on('evenID.fileupload.success', function (e, $input) {
            handleInputChange($input)(e);
        });
    }
}