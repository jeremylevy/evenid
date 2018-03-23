var $ = require('jquery');

var headFootDropdown = require('./headFootDropdown');

module.exports = {
    load: function () {
        $('#mobile-left-menu').mmenu({
            navbar: {
                add: false
            }
        });

        // Manage the more dropdown
        headFootDropdown('.nav .more > a');
    }
};