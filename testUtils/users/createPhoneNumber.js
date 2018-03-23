var mongoose = require('mongoose');

var config = require('../../config');

var validPhoneNumber = require('../data/validPhoneNumber');

module.exports = function (csrfToken, userID, request, cb) {
    var phoneNumber = validPhoneNumber.call(this, csrfToken);

    request
        .post('/users/' + userID + '/phone-numbers')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(phoneNumber)
        .end(function (err, resp) {
            var phoneNumberURLReg = new RegExp('phone-numbers/(' + config.EVENID_MONGODB.OBJECT_ID_PATTERN + ')$');

            if (err) {
                return cb(err);
            }
            
            phoneNumber.id = resp.headers.location.match(phoneNumberURLReg)[1];

            cb(null, phoneNumber);
        });
};