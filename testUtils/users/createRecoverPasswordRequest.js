var mongoose = require('mongoose');

var config = require('../../config');

module.exports = function (csrfToken, email, request, cb) {
    request
        .post('/recover-password')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send({
            email: email,
            _csrf: csrfToken
        })
        .end(function (err, resp) {
            var codeReg = new RegExp('code=(' 
                                    + config.EVENID_USER_RESET_PASSWORD_REQUESTS
                                            .CODE
                                            .PATTERN
                                    + ')');
            
            var code = resp && resp.headers.location.match(codeReg)[1];

            if (err) {
                return cb(err);
            }
            
            cb(null, code);
        });
};