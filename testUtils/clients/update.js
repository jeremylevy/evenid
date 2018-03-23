var validClient = require('../data/validClient');

module.exports = function (csrfToken, clientID, update, request, cb) {
    var client = validClient(csrfToken);

    Object.keys(update).forEach(function (key) {
        client[key] = update[key];
    });

    request
        .put('/clients/' + clientID)
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(client)
        .end(function (err, resp) {
            if (err) {
                return cb(err);
            }

            // Avoid displaying `This client has been updated`
            // during oauth authorize flow when use test account
            // button must be displayed but it is not due to notification
            request.get('/clients/' + clientID).end(function (err, resp) {
                if (err) {
                    return cb(err);
                }

                cb(null, client);
            });
        });
};