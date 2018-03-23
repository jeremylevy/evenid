var assert = require('assert');

var mongoose = require('mongoose');

var getLoggedRequest = require('../getLoggedRequest');
var getUnloggedRequest = require('../getUnloggedRequest');

var assertValidResp = function (done) {
    return function (err, resp) {
        if (err) {
            return done(err);
        }
        
        assert.ok(!!resp.text.match(/(?=.*<[^>]*html)(?=.*<[^>]*body)/));

        done();
    };
};

module.exports = function (page) {
    var unloggedRequest = null;
    var loggedRequest = null;

    var makeARequest = null;

    describe('GET ' + page, function () {
        before(function (done) {
            getUnloggedRequest(function (err, resp) {
                if (err) {
                    return done(err);
                }

                unloggedRequest = resp.request;

                getLoggedRequest(function (err, resp) {
                    if (err) {
                        return done(err);
                    }

                    loggedRequest = resp.request;

                    makeARequest = function (statusCode, request, cb) {
                        request
                            .get(page)
                            .expect(statusCode, function (err, resp) {
                                if (err) {
                                    return cb(err);
                                }

                                cb(null, resp);
                            });
                    };

                    done();
                });
            });
        });

        it('works for unlogged users', function (done) {
            makeARequest(200, unloggedRequest, assertValidResp(done));
        });

        it('works for logged users', function (done) {
            makeARequest(200, loggedRequest, assertValidResp(done));
        });
    });
};