var assert = require('assert');

var isValidClientSecret = require('../../../libs/validators/isValidClientSecret');

describe('models.validators.isValidClientSecret', function () {
    it('returns `false` when passing '
       + 'non-string value as client secret', function () {
        
        [null, undefined, {}, 9, []].forEach(function (v) {
            assert.strictEqual(isValidClientSecret(v), false);
        });
    });

    it('returns `false` when passing invalid client secret', function () {
        ['bar', 'foo', ''].forEach(function (v) {
            assert.strictEqual(isValidClientSecret(v), false);
        });
    });

    it('returns `true` when passing valid client secret', function () {
        assert.strictEqual(isValidClientSecret('034e38fcafd01c52242d406625d9d33eaea35263'),
                           true);
    });
});