var supertest = require('supertest');

var async = require('async');
var mongoose = require('mongoose');

var config = require('../config');

var getUnloggedRequest = require('./getUnloggedRequest');

var app = require('../index');

module.exports = function (cb) {
    async.auto({
        loadRequest: function (cb) {
            getUnloggedRequest(function (err, resp) {
                if (err) {
                    return cb(err);
                }

                cb(null, resp);
            });
        },

        registrationUser: ['loadRequest', function (cb, results) {
            var request = results.loadRequest.request;
            var csrfToken = results.loadRequest.csrfToken;

            var userEmail = mongoose.Types.ObjectId().toString() + '@evenid.com';
            var userPassword = 'azerty';
            var userURLReg = new RegExp('users/(' + config.EVENID_MONGODB
                                                          .OBJECT_ID_PATTERN + ')$');

            request 
                .post('/register')
                // Body parser middleware need it in order to populate req.body
                .set('Content-Type', 'application/x-www-form-urlencoded')
                .send({
                    email: userEmail,
                    password: userPassword,
                    _csrf: csrfToken
                })
                .end(function (err, resp) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, {
                        id: resp.headers.location.match(userURLReg)[1],
                        email: userEmail,
                        password: userPassword
                    });
               });
        }]
    }, function (err, results) {
        var request = results.loadRequest.request;
        var csrfToken = results.loadRequest.csrfToken;
        var user = results.registrationUser;

        if (err) {
            return cb(err);
        }

        cb(null, {
            request: request,
            csrfToken: csrfToken,
            user: user
        });
    });
};