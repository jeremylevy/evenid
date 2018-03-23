var validRedirectionURI = require('../data/validRedirectionURI');

module.exports = function (csrfToken, clientID, redirectionURIID, update, request, cb) {
    var redirectionURI = validRedirectionURI(csrfToken);

    Object.keys(update).forEach(function (key) {
        redirectionURI[key] = update[key];
    });

    request
        .put('/clients/' + clientID + '/redirection-uris/' + redirectionURIID)
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(redirectionURI)
        .end(function (err, resp) {
            if (err) {
                return cb(err);
            }

            cb(null, redirectionURI);
        });
};