var mongoose = require('mongoose');

var config = require('../../config');

var validNotificationHandler = require('../data/validNotificationHandler');

module.exports = function (csrfToken, clientID, request, cb) {
    var context = this;
    var notificationHandler = validNotificationHandler(csrfToken);

    request
        .post('/clients/' + clientID + '/notification-handlers')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send({
            url: notificationHandler.url,
            event_type: context.eventType || notificationHandler.event_type,
            _csrf: csrfToken
        })
        .end(function (err, resp) {
            var notificationHandlerURLReg = new RegExp('notification-handlers/('
                                                       + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                                                       + ')$');

            if (err) {
                return cb(err);
            }
            
            notificationHandler.id = resp.headers.location.match(notificationHandlerURLReg)[1];

            cb(null, notificationHandler);
        });
};