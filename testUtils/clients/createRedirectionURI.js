var mongoose = require('mongoose');

var config = require('../../config');

var validRedirectionURI = require('../data/validRedirectionURI');

module.exports = function (csrfToken, clientID, request, cb) {
    var context = this;
    var redirectionURI = validRedirectionURI(csrfToken);

    if (context
        && context.redirectionURI
        && context.redirectionURI.response_type) {

        Object.keys(context.redirectionURI).forEach(function (k) {
            redirectionURI[k] = context.redirectionURI[k];
        });
    }

    request
        .post('/clients/' + clientID + '/redirection-uris')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send({
            redirect_uri: redirectionURI.redirect_uri,
            authorizations: redirectionURI.authorizations,
            response_type: redirectionURI.response_type,
            authorization_flags: redirectionURI.authorization_flags,
            _csrf: redirectionURI._csrf
        })
        .end(function (err, resp) {
            var redirectionURIURLReg = new RegExp('redirection-uris/(' 
                                                  + config.EVENID_MONGODB.OBJECT_ID_PATTERN 
                                                  + ')$');

            if (err) {
                return cb(err);
            }
            
            redirectionURI.id = resp.headers.location.match(redirectionURIURLReg)[1];

            cb(null, redirectionURI);
        });
};