var IsInput = require('./isInput');
var IsSelect = require('./isSelect');

module.exports = function (user, resp) {
    var isInput = IsInput(resp);
    var isSelect = IsSelect(resp);

    /* Make sure user form is filled */
    Object.keys(user).forEach(function (userKey) {
        var inputType = 'text';

        if (['place_of_birth', 
             'nationality', 
             'timezone'].indexOf(userKey) !== -1
            || !!userKey.match(/^date_of_birth/)) {

            return isSelect(userKey, user[userKey], 'selected');
        }

        if (['id', 'email', 'password', '_csrf'].indexOf(userKey) !== -1) {
            return;
        }

        if (userKey === 'gender') {
            inputType = 'radio';
        }

        isInput(inputType, 
                userKey, 
                user[userKey], 
                ['gender', 'is_developer'].indexOf(userKey) !== -1 
                    ? 'checked' 
                    : '');
    });
};