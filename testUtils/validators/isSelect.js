var assert = require('assert');
var regexQuote = require('regexp-quote');

module.exports = function (resp) {
    return function (name, value, selected) {
        var inputReg = null;

        name = regexQuote(name);
        value = regexQuote(value);

        if (value) {
            value = '<option(?=[^>]*value="' + value +'")'
                    + (selected ? '(?=[^>]*selected)' : '')
                    + '.*</select>';
        }

        inputReg = new RegExp('<select'
                                + '(?=[^>]*name="' + name + '")[^>]*>.*'
                                + value
                              );

        assert.ok(!!resp.match(inputReg));
    };
};