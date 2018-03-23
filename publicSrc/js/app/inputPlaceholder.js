var $ = require('jquery');
var jqueryPlaceholder = require('jquery-placeholder');

module.exports = {
    load: function () {
        $('input, textarea').placeholder();
    }
};