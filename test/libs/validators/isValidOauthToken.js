var assert = require('assert');

var isValidOauthToken = require('../../../libs/validators/isValidOauthToken');

describe('models.validators.isValidOauthToken', function () {
    it('returns `false` when passing '
       + 'non-string value as Oauth token', function () {
        
        [null, undefined, {}, 9, []].forEach(function (v) {
            assert.strictEqual(isValidOauthToken(v), false);
        });
    });

    it('returns `false` when passing invalid Oauth token', function () {
        ['bar', 'foo', ''].forEach(function (v) {
            assert.strictEqual(isValidOauthToken(v), false);
        });
    });

    it('returns `true` when passing valid Oauth token', function () {
        assert.strictEqual(isValidOauthToken('034e38fcafd01c52242d406625d9d33eaea35263'),
                           true);
    });
});