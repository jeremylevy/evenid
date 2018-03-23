var assert = require('assert');

var setUserInSession = require('../../../../routes/users/callbacks/setUserInSession');

describe('routes.users.callbacks.setUserInSession', function () {

    it('throws an exception when passing invalid req', function () {
        [null, undefined, {}, 9, [], '', function () {}, {
            session: {}
        }].forEach(function (v) {
            assert.throws(function () {
                setUserInSession(v, {});
            }, assert.AssertionError);
        });
    });

    it('sets user in session', function () {
        var user = {
            first_name: 'jeremy'
        };

        var req = {
            session: {
                login: {}
            }
        };

        setUserInSession(req, user);

        assert.deepEqual(req.session.login.user, user);
    });
});