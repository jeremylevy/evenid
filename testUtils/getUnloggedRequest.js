var supertest = require('supertest');

var async = require('async');

var config = require('../config');

var app = require('../index');

module.exports = function (cb) {
    async.auto({
        loadRequest: function (cb) {
            app(function (err, _app) {
                if (err) {
                    return cb(err);
                }

                cb(null, supertest.agent(_app));
            });
        },

        getCSRFToken: ['loadRequest', function (cb, results) {
            var request = results.loadRequest;

            request
                .get('/register')
                .end(function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    request.saveCookies(resp);

                    cb(null, resp.text.match(/name="_csrf"[^>]+value="([^"]+)"/)[1]);
               });
        }]
    }, function (err, results) {
        var request = results.loadRequest;
        var csrfToken = results.getCSRFToken;

        if (err) {
            return cb(err);
        }

        cb(null, {
            request: request,
            csrfToken: csrfToken
        });
    });
};