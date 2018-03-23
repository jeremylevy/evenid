var assert = require('assert');

var ApiError = require('../../../errors/types/ApiError');

describe('errors.types.ApiError', function () {
    it('throws an exception when passing invalid error type', function () {
        [null, undefined, {}, 9, [], '', function () {}].forEach(function (v) {
            assert.throws(function () {
                new ApiError(v, {});
            }, assert.AssertionError);
        });
    });

    it('throws an exception when passing invalid error messages', function () {
        [9, [], function () {}].forEach(function (v) {
            assert.throws(function () {
                new ApiError('invalid_grant', v);
            }, assert.AssertionError);
        });
    });

    it('constructs the error', function () {
        var errType = 'invalid_grant';
        var errMessages = {
            bar: 'bar'
        };

        var err = new ApiError(errType, errMessages);

        assert.strictEqual(err.kind, errType);
        assert.deepEqual(err.messages, errMessages);

        assert.ok(err instanceof Error);
    });
});