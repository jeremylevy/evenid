var IsInput = require('./isInput');

module.exports = function (email, resp) {
    var isInput = IsInput(resp);

    /* Make sure email form is filled */
    Object.keys(email).forEach(function (emailKey) {
        var inputType = 'text';
        var emailValue = email[emailKey];

        if (['id', '_csrf'].indexOf(emailKey) !== -1) {
            return;
        }

        if (['email'].indexOf(emailKey) !== -1) {
            inputType = 'email';
        }

        if (['password'].indexOf(emailKey) !== -1) {
            inputType = 'password';
            // Password input is not prefilled
            emailValue = '';
        }

        isInput(inputType, 
                emailKey, 
                emailValue);
    });
};