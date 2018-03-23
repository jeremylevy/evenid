var assert = require('assert');

var config = require('../../../../config');

var isLoggedIn = require('../../../../routes/users/callbacks/isLoggedIn');

describe('routes.users.callbacks.isLoggedIn', function () {

    it('returns `false` for invalid req values', function () {
        [null, undefined, {}, 9, [], '', function () {}].forEach(function (v) {
            assert.strictEqual(isLoggedIn(v), false);
        });
    });

    it('returns `false` when incomplete session login object', function () {
        [{session: {
            login: {
                access_token: true
            }
        }}, {session: {
            login: {
                access_token: true,
                user_id: true
            }
        }}, {session: {
            login: {
                user: true
            }
        }}].forEach(function (v) {
            assert.strictEqual(isLoggedIn(v), false);
        });
    });

    it('returns `true` when complete session login object', function () {
        assert.strictEqual(isLoggedIn({
            session: {
                login: {
                    access_token: true,
                    user_id: true,
                    user: true
                }
            }
        }), true);
    });
});