var $ = require('jquery');

module.exports = {
    load: function () {
        if ($('body').hasClass('ie8')) {
            return;
        }
        
        $('.social-icon-font').tooltip();
    }
};