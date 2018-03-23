var assert = require('assert');

var config = require('../../../../config');

var setUserAsLogged = require('../../../../routes/users/callbacks/setUserAsLogged');

var validReq = {
    session: {}
};

var validRes = {
    cookie: function () {}
};

var validTokens = {
    refresh_token: '9dd421f6bbcb9ac5a6b300ac5721977202bbc7ac'
};

var validUser = {
    first_name: 'jeremy'
};

describe('routes.users.callbacks.setUserAsLogged', function () {
    it('throws an exception when passing invalid req', function () {
        [null, undefined, {}, 9, [], '', function () {}].forEach(function (v) {
            assert.throws(function () {
                setUserAsLogged(v, validRes, validTokens, {}, true);
            }, assert.AssertionError);
        });
    });

    it('throws an exception when passing invalid res', function () {
        [null, undefined, {}, 9, [], '', function () {}].forEach(function (v) {
            assert.throws(function () {
                setUserAsLogged(validReq, v, validTokens, {}, true);
            }, assert.AssertionError);
        });
    });

    it('throws an exception when passing invalid tokens', function () {
        [null, undefined, {}, 9, [], '', function () {}].forEach(function (v) {
            assert.throws(function () {
                setUserAsLogged(validReq, validRes, v, {}, true);
            }, assert.AssertionError);
        });
    });

    it('throws an exception when passing non-boolean value for `setPersistentLogin`', function () {
        [null, undefined, {}, 9, [], '', function () {}].forEach(function (v) {
            assert.throws(function () {
                setUserAsLogged(validReq, validRes, validTokens, {}, v);
            }, assert.AssertionError);
        });
    });

    it('sets login and user in session', function () {
        var req = {
            session: {}
        };

        setUserAsLogged(req, validRes, validTokens, validUser, false);

        assert.strictEqual(req.session.login.refresh_token,
                           validTokens.refresh_token);

        assert.deepEqual(req.session.login.user,
                         validUser);
    });

    it('sets persitent login cookie', function () {
        var cookieMethodIsCalled = false;

        var res = {
            cookie: function (name, value, opts) {
                assert.strictEqual(name, config.EVENID_PERSISTENT_LOGIN_COOKIE.name);
                
                assert.strictEqual(value, validTokens.refresh_token);
                
                assert.deepEqual(opts, config.EVENID_PERSISTENT_LOGIN_COOKIE);

                cookieMethodIsCalled = true;
            }
        };

        setUserAsLogged(validReq, res, validTokens, validUser, true);

        assert.strictEqual(cookieMethodIsCalled, true);
    });
});