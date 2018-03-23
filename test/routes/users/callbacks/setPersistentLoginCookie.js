var assert = require('assert');

var config = require('../../../../config');

var setPersistentLoginCookie = require('../../../../routes/users/callbacks/setPersistentLoginCookie');

var validRefreshToken = '9dd421f6bbcb9ac5a6b300ac5721977202bbc7ac';

var validRes = {
    cookie: function () {}
};

describe('routes.users.callbacks.setPersistentLoginCookie', function () {
    
    it('throws an exception when passing invalid res', function () {
        [null, undefined, {}, 9, [], '', function () {}].forEach(function (v) {
            assert.throws(function () {
                setPersistentLoginCookie(v, validRefreshToken);
            }, assert.AssertionError);
        });
    });

    it('throws an exception when passing invalid refresh token', function () {
        [null, undefined, {}, 9, [], '', function () {}].forEach(function (v) {
            assert.throws(function () {
                setPersistentLoginCookie(validRes, v);
            }, assert.AssertionError);
        });
    });

    it('calls the `cookie()` method with the '
       + 'persistent login cookie options', function () {
        
        var cookieMethodIsCalled = false;

        var res = {
            cookie: function (name, value, opts) {
                assert.strictEqual(name, config.EVENID_PERSISTENT_LOGIN_COOKIE.name);
                
                assert.strictEqual(value, validRefreshToken);
                
                assert.deepEqual(opts, config.EVENID_PERSISTENT_LOGIN_COOKIE);

                cookieMethodIsCalled = true;
            }
        };

        setPersistentLoginCookie(res, validRefreshToken);

        assert.strictEqual(cookieMethodIsCalled, true);
    });
});