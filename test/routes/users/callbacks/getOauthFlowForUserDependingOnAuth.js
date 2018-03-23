var assert = require('assert');

var config = require('../../../../config');

var getOauthFlowForUserDependingOnAuth = require('../../../../routes/users/callbacks/getOauthFlowForUserDependingOnAuth');

var clientID = '552e3d49acffab28962ccb35';

describe('routes.users.callbacks.getOauthFlowForUserDependingOnAuth', function () {
    
    it('throws an exception when passing invalid user', function () {
        [null, undefined, {}, 9, [], '', function () {}].forEach(function (v) {
            assert.throws(function () {
                getOauthFlowForUserDependingOnAuth(v);
            }, assert.AssertionError);
        });
    });

    it('throws an exception when passing invalid client ID', function () {
        [null, undefined, {}, 9, [], '', function () {}].forEach(function (v) {
            assert.throws(function () {
                getOauthFlowForUserDependingOnAuth({
                    authorized_clients: []
                }, v);
            }, assert.AssertionError);
        });
    });

    it('returns `registration` for non-authorized client', function () {
        assert.strictEqual(getOauthFlowForUserDependingOnAuth({
            authorized_clients: []
        }, clientID), 'registration');
    });

    it('returns `login` for authorized client', function () {
        assert.strictEqual(getOauthFlowForUserDependingOnAuth({
            authorized_clients: [{
                client_id: clientID
            }]
        }, clientID), 'login');
    });
});