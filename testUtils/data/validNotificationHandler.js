var mongoose = require('mongoose');

module.exports = function (csrfToken) {
    return {
        url: 'http://bar' + mongoose.Types.ObjectId().toString() + '.com',
        event_type: 'USER_DID_REVOKE_ACCESS',
        _csrf: csrfToken
    };
};