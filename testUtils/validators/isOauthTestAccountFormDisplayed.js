var assert = require('assert');

var IsInput = require('./isInput');

module.exports = function (testAccount, resp, displayed) {
    var isInput = IsInput(resp.text);

    if (displayed) {
        isInput('hidden', 'use_test_account', 'true');

        if (testAccount.id) {
            isInput('hidden', 'test_account', testAccount.id);
        } else { // Make sure `test_account` input is not displayed
            assert.throws(function () {
                isInput('hidden', 'test_account', testAccount.id);
            }, assert.AssertError);
        }

        assert.ok(!!resp.text.match(/I just want to test/));

        return;
    }
    
    assert.ok(!resp.text.match(/name="use_test_account"/));
    assert.ok(!resp.text.match(/name="test_account"/));
    assert.ok(!resp.text.match(/I just want to test/));
};