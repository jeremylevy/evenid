var mongoose = require('mongoose');

var config = require('../../config');

var validEmail = require('../data/validEmail');

module.exports = function (csrfToken, userID, userPassword, request, cb) {
    var email = validEmail(userPassword, csrfToken);

    request
        .post('/users/' + userID + '/emails')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(email)
        .end(function (err, resp) {
            var emailURLReg = new RegExp('emails/(' 
                                         + config.EVENID_MONGODB.OBJECT_ID_PATTERN 
                                         + ')$');

            if (err) {
                return cb(err);
            }
            
            email.id = resp.headers.location.match(emailURLReg)[1];

            cb(null, email);
        });
};