var assert = require('assert');

var regexQuote = require('regexp-quote');
var libphonenumber = require('node-phonenumber');

module.exports = function (phoneNumber, resp) {
    var phoneUtil = libphonenumber.PhoneNumberUtil.getInstance();
    
    /* Make sure phone number is displayed */
    Object.keys(phoneNumber).forEach(function (phoneNumberKey) {
        var inputValue = phoneNumber[phoneNumberKey];
        var reg = null;

        if (['_csrf'].indexOf(phoneNumberKey) !== -1) {
            return;
        }

        if (['number'].indexOf(phoneNumberKey) !== -1) {
            // Number is displayed using user national country format
            inputValue = phoneUtil.parse(phoneNumber.number, phoneNumber.country);
            inputValue = phoneUtil.format(inputValue, libphonenumber.PhoneNumberFormat.NATIONAL);
        }

        reg = new RegExp(regexQuote(inputValue));

        assert.ok(!!resp.match(reg));
    });
};