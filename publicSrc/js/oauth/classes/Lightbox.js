var $ = require('jquery');

var firstInputFocus = require('../../app/firstInputFocus');

module.exports = Lightbox;

function Lightbox (lightboxSelector) {
    this.lightboxIsVisible = false;
    this.onClose = null;

    this.$lightbox = $(lightboxSelector);
    this.$lightboxContent = this.$lightbox.find('.lightbox-content');

    this.$lightboxMainContent = this.$lightbox.find('.main-wrapper-content');
    this.$lightboxBottomContent = this.$lightbox.find('.bottom');

    this.loadEvents();
};

Lightbox.prototype.loadEvents = function () {
    var self = this;

    // Close button at the bottom of 
    // the lightbox not set on load
    this.$lightbox.on('click', '.close-btn', function (e) {
        // Keep context
        self.close();
    });

    this.$lightbox.on('click', '.overlay', function (e) {
        // Keep context
        self.close();
    });

    // Close when esc was pressed
    $(document).on('keyup', function(e) {
        // Esc
        if (e.keyCode !== 27
            || !self.lightboxIsVisible) {

            return;
        }

        self.close();
    });

    return this;
};

Lightbox.prototype.open = function (contentName) {
    var windowHeight = $(window).height();
    var self = this;

    var lightboxTop = 0;

    var contentClassName = '.lightbox-';
    var $content = null;

    var $mainContent = null;
    var $bottomContent = null;

    contentClassName += contentName;

    $content = $(contentClassName);

    $mainContent = $content.find('.main');
    $bottomContent = $content.find('.bottom');

    $('html, body').addClass('no-scroll');

    this.$lightboxMainContent.html($mainContent.html());
    this.$lightboxBottomContent.html($bottomContent.html());

    this.$lightbox.show();

    // Make sure lightbox is smaller than window
    if ((parseInt(this.$lightboxContent.css('height'))
        + parseInt(this.$lightbox.css('padding-top'))
        + parseInt(this.$lightbox.css('padding-bottom'))) < windowHeight) {
        
        lightboxTop = (windowHeight / 2) - (parseInt(this.$lightboxContent.css('height')) / 2);
    
        lightboxTop /= 2;
        
        lightboxTop += 'px';

        this.$lightboxContent.css('top', lightboxTop);
    }

    // Display scroll briefly for webkit based browsers.
    // Users needs to be informed that this 
    // section is scrollable.
    this.$lightboxMainContent.scrollTop(1).scrollTop(0);

    this.lightboxIsVisible = true;

    $(document).trigger('evenID.lightbox.open', [contentName]);

    return this;
};

Lightbox.prototype.close = function () {
    this.$lightbox.hide();

    firstInputFocus.focus();

    this.$lightboxMainContent.html('');
    this.$lightboxBottomContent.html('');

    $('html, body').removeClass('no-scroll');

    this.lightboxIsVisible = false;

    if (this.onClose) {
        this.onClose();
    }

    return this;
};