var assert = require('assert');
var regexQuote = require('regexp-quote');

module.exports = function (resp) {
    return function (type, name, value, otherAttributes) {
        var inputReg = null;

        type = regexQuote(type);
        name = regexQuote(name);
        value = regexQuote(value);
        otherAttributes = regexQuote(otherAttributes || '');

        if (value !== '') {
            value = '(?=[^>]*value="' + value + '")';
        }

        inputReg = new RegExp('<input(?=[^>]*type="' + type + '")'
                                + '(?=[^>]*name="' + name + '")'
                                + value
                                + '(?=[^>]*' + otherAttributes + ')');
        
        assert.ok(!!resp.match(inputReg));
    };
};