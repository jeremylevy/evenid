var $ = require('jquery');
var Lightbox = require('./classes/Lightbox');

module.exports = {
    load: function () {
        var lightbox = new Lightbox('.lightbox');

        $('[data-lightbox]').on('click', function (e) {
            var $link = $(this);
            var contentName = $link.data('lightbox-content-name');

            lightbox.open(contentName);

            return false;
        });
    }
}