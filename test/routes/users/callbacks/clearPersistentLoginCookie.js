var assert = require('assert');

var config = require('../../../../config');

var clearPersistentLoginCookie = require('../../../../routes/users/callbacks/clearPersistentLoginCookie');

describe('routes.users.callbacks.clearPersistentLoginCookie', function () {
    
    it('throws an exception when passing invalid res', function () {
        [null, undefined, {}, 9, [], '', function () {}].forEach(function (v) {
            assert.throws(function () {
                clearPersistentLoginCookie(v);
            }, assert.AssertionError);
        });
    });

    it('calls the `clearCookie()` method with the '
       + 'persistent login cookie options', function () {
        
        var clearCookieMethodIsCalled = false;

        var res = {
            clearCookie: function (name, opts) {
                assert.strictEqual(name, config.EVENID_PERSISTENT_LOGIN_COOKIE.name);
                assert.deepEqual(opts, config.EVENID_PERSISTENT_LOGIN_COOKIE);

                clearCookieMethodIsCalled = true;
            }
        };

        clearPersistentLoginCookie(res);

        assert.strictEqual(clearCookieMethodIsCalled, true);
    });
});