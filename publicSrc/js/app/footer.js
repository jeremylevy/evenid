var headFootDropdown = require('./headFootDropdown');

module.exports = {
    load: function () {
        // Manage the country dropdown
        headFootDropdown('.country-selector > .select');
    }
};