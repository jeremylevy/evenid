var libphonenumber = require('node-phonenumber');

var IsInput = require('./isInput');
var IsSelect = require('./isSelect');

module.exports = function (phoneNumber, resp) {
    var phoneUtil = libphonenumber.PhoneNumberUtil.getInstance();

    var isInput = IsInput(resp);
    var isSelect = IsSelect(resp);

    /* Make sure phoneNumber form is filled */
    Object.keys(phoneNumber).forEach(function (phoneNumberKey) {
        var inputType = 'text';
        var inputValue = phoneNumber[phoneNumberKey];

        if (['country'].indexOf(phoneNumberKey) !== -1) {
            return isSelect(phoneNumberKey, phoneNumber[phoneNumberKey], 'selected');
        }

        if (['id', '_csrf'].indexOf(phoneNumberKey) !== -1) {
            return;
        }

        if (['number'].indexOf(phoneNumberKey) !== -1) {
            inputType = 'tel';

            // Number is displayed using user national country format
            inputValue = phoneUtil.parse(phoneNumber.number, phoneNumber.country);
            inputValue = phoneUtil.format(inputValue, libphonenumber.PhoneNumberFormat.NATIONAL);
        }
        
        isInput(inputType, 
                phoneNumberKey, 
                inputValue);
    });
};