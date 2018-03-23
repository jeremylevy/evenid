var mongoose = require('mongoose');

var config = require('../../config');

module.exports = function (csrfToken, userID, emailID, request, cb) {
    request
        .post('/users/' + userID + '/emails/' + emailID + '/validate')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send({
            _csrf: csrfToken
        })
        .end(function (err, resp) {
            var codeReg = new RegExp('code=(' 
                                    + config.EVENID_USER_VALIDATE_EMAIL_REQUESTS
                                            .CODE
                                            .PATTERN
                                    + ')');
            var code = resp.headers.location.match(codeReg)[1];

            if (err) {
                return cb(err);
            }

            cb(null, code);
        });
};