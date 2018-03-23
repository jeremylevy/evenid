var Type = require('type-of-is');

var config = require('../../config');

module.exports = function (value) {
    if (!Type.is(value, String)) {
        return false;
    }

    if (value.match(new RegExp(config.EVENID_API
                                     .CLIENT_SECRETS
                                     .PATTERN))) {
        return true;
    }

    return false;
};