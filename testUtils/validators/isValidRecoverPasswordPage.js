var IsInput = require('./isInput');

module.exports = function (email, resp) {
    var isInput = IsInput(resp);

    isInput('email', 'email', email);
    // Csrf is updated on each GET request
    // so don't check for value
    isInput('hidden', '_csrf', '');
};