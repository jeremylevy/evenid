var assert = require('assert');

var config = require('../../../../config');

var setUnauthenticatedTokens = require('../../../../routes/users/callbacks/setUnauthenticatedTokens');

var validTokens = {
    token_type: 'Bearer',
    access_token: '9dd421f6bbcb9ac5a6b300ac5721977202bbc7ac',
    refresh_token: '9dd421f6bbcb9ac5a6b300ac5721977202bbc7ac',
    expires_in: 3600
};

var validReq = {
    session: {}
};

describe('routes.users.callbacks.setUnauthenticatedTokens', function () {
    
    it('throws an exception when passing invalid req', function () {
        [null, undefined, {}, 9, [], '', function () {}].forEach(function (v) {
            assert.throws(function () {
                setUnauthenticatedTokens(v, validTokens);
            }, assert.AssertionError);
        });
    });

    it('throws an exception when passing invalid tokens', function () {
        [null, undefined, {}, 9, [], '', function () {}, {
            access_token: 'bar',
            refresh_token: 'bar'
        }].forEach(function (v) {
            assert.throws(function () {
                setUnauthenticatedTokens(validReq, v);
            }, assert.AssertionError);
        });
    });

    it('sets unauthenticated tokens in session', function () {
        
        var cookieMethodIsCalled = false;

        var req = {
            session: {}
        };

        setUnauthenticatedTokens(req, validTokens);

        assert.deepEqual(req.session.unauthenticated_tokens, validTokens);
    });
});