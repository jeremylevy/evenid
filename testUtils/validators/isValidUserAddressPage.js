var IsInput = require('./isInput');
var IsSelect = require('./isSelect');

module.exports = function (address, resp) {
    var isInput = IsInput(resp);
    var isSelect = IsSelect(resp);

    /* Make sure address form is filled */
    Object.keys(address).forEach(function (addressKey) {
        var inputType = 'text';

        if (['country'].indexOf(addressKey) !== -1) {
            return isSelect(addressKey, address[addressKey], 'selected');
        }

        if (['id', '_csrf'].indexOf(addressKey) !== -1) {
            return;
        }

        if (['address_type'].indexOf(addressKey) !== -1) {
            inputType = 'radio';
        }
        
        isInput(inputType, 
                addressKey, 
                address[addressKey],
                ['address_type'].indexOf(addressKey) !== -1 
                    ? 'checked' 
                    : '');
    });
};