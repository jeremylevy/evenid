var mongoose = require('mongoose');

var config = require('../../config');

var validUser = require('../data/validUser');

module.exports = function (csrfToken, userID, request, cb) {
    var user = validUser(csrfToken);

    request
        .put('/users/' + userID)
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(user)
        .end(function (err, resp) {
            if (err) {
                return cb(err);
            }

            user.id = userID;

            cb(null, user);
        });
};