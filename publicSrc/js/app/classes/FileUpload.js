var $ = require('jquery');
var sweetAlert = require('sweetalert');

module.exports = FileUpload;

function FileUpload (keepImgRatio, updateFile) {
    var openedInAnIframe = window.parent != window.self;

    this.parentContext = openedInAnIframe
        ? window.parent.document 
        : document;
    this.uploadInProgress = false;
    this.iframeWasRedirected = false;

    this.keepImgRatio = !!keepImgRatio;
    this.updateFile = !!updateFile;

    // We want sweetAlert attached
    // to main window not constrained
    // by iframe size
    if (openedInAnIframe) {
        sweetAlert = window.parent.sweetAlert;
    }
}

FileUpload.prototype.uploadPolicy = function ($form, cb) {
    var jqxhr = $.get('/upload-policy', $form.data('upload-policy-params'));

    jqxhr.done(function (data, textStatus, jqXHR) {
        var formAction = data.formAction;
        var uploadPolicy = data.uploadPolicy;

        $form.attr('action', formAction);

        // Don't be fooled by previous submits
        $('.upload-policy-container', $form).html('');

        for (var key in uploadPolicy) {
            $('.upload-policy-container', $form).append(
                '<input type="hidden" name="' + key + '" ' + 'value="' + uploadPolicy[key] + '" />'
            );
        }

        cb(null);
    });

    jqxhr.fail(function (jqXHR, textStatus, errorThrown) {
        cb(
            (jqXHR.responseJSON.messages 
             && jqXHR.responseJSON.messages.main)
            || errorThrown
        );
    });
};

FileUpload.prototype.load = function () {
    var self = this;

    $(function () {
        var onSubmit = function (e) {
            if (!self.uploadInProgress) {
                self.iframeWasRedirected = false;
            }

            return !self.uploadInProgress;
        };

        // Wait for upload before allow form submit
        $('.file-upload-form').on('submit', onSubmit);
        $('.file-upload-sibling-form', self.parentContext).on('submit', onSubmit);

        // Manage error with AWS S3
        $('#upload-target').on('load', function (e) {
            var unknownError = $('body').data('i18n').unknownError;

            // Fix bug when page load (IE 8)
            if (!self.uploadInProgress
                || self.iframeWasRedirected) {
                
                return;
            }

            self.resetUI(unknownError);
        });

        // When user select a file
        // we submit the form in an iframe
        $('#input-file').on('change', function (e) {
            var $this = $(this);
            // Access raw node with [0]
            var files = $this[0].files;
            var file = null;

            var $tooBigError = $('#file-too-big-error');
            var $wrongTypeError = $('#file-has-wrong-type-error');

            // Make sure user has selected a file
            if (!$this.val()) {
                return;
            }

            // Disable submit button for form
            $('.file-upload-sibling-form-submit-btn', self.parentContext).addClass('disabled');
            // And profil photo form
            $('#input-file-btn').addClass('disabled');

            // Show loader under upload button
            $('#input-file-loader').removeClass('hidden');

            // Disable input file
            $this.attr('disabled', 'disabled');

            // IE < 10 doesn't support it
            if (files && files[0]) {
                file = files[0];
            }

            // Wrong type
            if (file
                && !file.type.match('^' + $this.data('allowed-mime-type') + '$')) {
                
                sweetAlert($('body').data('i18n').error,
                           $wrongTypeError.text(),
                           'error');
                
                self.resetUI();

                return;
            }

            // Too big
            if (file
                && file.size > $this.data('max-file-size')) {
            
                sweetAlert($('body').data('i18n').error,
                           $tooBigError.text(),
                           'error');

                self.resetUI();

                return;
            }

            self.uploadPolicy($this.parents('form'), function (err) {
                if (err) {
                   return self.resetUI(err);
                }

                // Set correct mime type 
                // if we can access file
                if (file) {
                    $('input[name="Content-Type"]').val(file.type);
                }

                // We need to enable input file
                // in order to send it along with form
                $this.removeAttr('disabled');

                // iframe target
                $this.parents('form').submit();

                $this.attr('disabled', 'disabled');

                // Set this AFTER form was submited 
                // in order to pass onSubmit check
                self.uploadInProgress = true;
            });
        });
    });
};

FileUpload.prototype.reset = function (imgURL) {
    var self = this;
    var $imgContainer = $('#input-file-img-container');

    // Re-enable submit button for form
    $('.file-upload-sibling-form-submit-btn', self.parentContext).removeClass('disabled');
    // And profil photo form
    $('#input-file-btn').removeClass('disabled');

    // Hide loader under upload button
    $('#input-file-loader').addClass('hidden');

    // Re-enable input file
    $('#input-file').removeAttr('disabled');
    // If we don't clear input value, and user try to send
    // the same file, the `change` event will not be triggered.
    $('#input-file').val('');

    if (imgURL) {
        // We want original photo not resized
        $imgContainer.attr('href', imgURL.replace(/\/[0-9]+$/, ''));

        $imgContainer.attr('target', '_blank')
                     .removeClass('disabled');

        $imgContainer.find(self.keepImgRatio ? 'img' : 'i').fadeIn(800);

        // Display `has been updated on...`
        $(document).trigger('evenID.fileupload.success', [$('#input-file')]);
    }

    self.uploadInProgress = false;
};

FileUpload.prototype.resetUI = function (err, imgURL) {
    var self = this;
    var $imgContainer = $('#input-file-img-container');
    var uploadedImg = new Image();

    if (err) {
        self.reset();

        return sweetAlert($('body').data('i18n').error, err, 'error');
    }

    if (!imgURL) {
        self.reset();

        return;
    }

    uploadedImg.onload = function () {
        if (self.keepImgRatio) {
            $imgContainer.html('<img src="javascript:;" alt="" />')
                         .find('img')
                         .hide()
                         .attr('src' , imgURL);
        } else {
            $imgContainer.html('<i></i>');

            $imgContainer.find('i')
                         .hide()
                         .css({
                            'background-image': 'url(' + uploadedImg.src + ')',
                            'filter': "progid:DXImageTransform.Microsoft.AlphaImageLoader(src='" + uploadedImg.src + "', sizingMethod='scale')",
                            '-ms-filter': "progid:DXImageTransform.Microsoft.AlphaImageLoader(src='" + uploadedImg.src + "', sizingMethod='scale')",
                            'background-size': 'cover'
                         })
                         .addClass('centered-bg');
        }

        self.reset(imgURL);
    };

    uploadedImg.src = imgURL;
};

// Called by iframe
FileUpload.prototype.handleEnd = function (publicURL) {
    var self = this;

    var $urlForSave = $('#input-file-url');
    var jqxhr = null;

    self.iframeWasRedirected = true;

    // Update -> send file URL separately
    if (self.updateFile) { 
        jqxhr = $.post($urlForSave.val(), {
            url: publicURL
        });

        jqxhr.done(function (data, textStatus, jqXHR) {
            self.resetUI(null, publicURL);
        });

        jqxhr.fail(function (jqXHR, textStatus, errorThrown) {
            self.resetUI(
                (jqXHR.responseJSON.messages 
                 && jqXHR.responseJSON.messages.main)
                || errorThrown
            );
        });
    } else { // Create -> send file URL along form
        $urlForSave.val(publicURL);

        self.resetUI(null, publicURL);
    }
};