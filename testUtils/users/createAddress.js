var mongoose = require('mongoose');

var config = require('../../config');

var validAddress = require('../data/validAddress');

module.exports = function (csrfToken, userID, request, cb) {
    var address = validAddress(csrfToken);

    request
        .post('/users/' + userID + '/addresses')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(address)
        .end(function (err, resp) {
            var addressURLReg = new RegExp('addresses/(' + config.EVENID_MONGODB.OBJECT_ID_PATTERN + ')$');

            if (err) {
                return cb(err);
            }
            
            address.id = resp.headers.location.match(addressURLReg)[1];

            cb(null, address);
        });
};