var IsInput = require('./isInput');

module.exports = function (client, resp) {
    var isInput = IsInput(resp);

    /* Make sure client form is filled */

    Object.keys(client).forEach(function (clientKey) {
        var inputType =  'text';

        if (clientKey === 'client_website') {
            inputType = 'url';
        }

        if (clientKey === 'authorize_test_accounts') {
            inputType = 'checkbox';
        }

        if (['id', 'file_url', '_csrf'].indexOf(clientKey) !== -1) {
            return;
        }

        isInput(inputType, 
                clientKey, 
                client[clientKey], 
                clientKey === 'authorize_test_accounts' ? 'checked' : '');
    });
};