var mongoose = require('mongoose');

var config = require('../../config');

var validClient = require('../data/validClient');

module.exports = function (csrfToken, request, cb) {
    var client = validClient(csrfToken);

    request
        .post('/clients')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send({
            client_name: client.client_name,
            client_description: client.client_description, 
            file_url: client.file_url,
            client_website: client.client_website,
            client_facebook_username: client.client_facebook_username,
            client_twitter_username: client.client_twitter_username,
            client_instagram_username: client.client_instagram_username,
            authorize_test_accounts: client.authorize_test_accounts,
            _csrf: client._csrf,
        })
        .end(function (err, resp) {
            var clientURLReg = new RegExp('clients/(' 
                                          + config.EVENID_MONGODB.OBJECT_ID_PATTERN 
                                          + ')$');

            if (err) {
                return cb(err);
            }

            client.id = resp.headers.location.match(clientURLReg)[1];

            cb(null, client);
        });
};