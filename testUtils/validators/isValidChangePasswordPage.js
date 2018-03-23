var IsInput = require('./isInput');

module.exports = function (resp) {
    var isInput = IsInput(resp);

    isInput('password', 'current_password', '');
    isInput('password', 'new_password', '');
};