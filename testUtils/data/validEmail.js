var mongoose = require('mongoose');

module.exports = function (userPassword, csrfToken) {
    return {
        email: 'bar' + mongoose.Types.ObjectId().toString() + '@evenid.com',
        password: userPassword,
        _csrf: csrfToken
    };
};