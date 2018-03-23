var assert = require('assert');

var mongoose = require('mongoose');

var getLoggedRequest = require('../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../testUtils/getUnloggedRequest');

var unloggedRequest = null;
var loggedRequest = null;

var makeARequest = null;

var assertValidResp = function (done) {
    return function (err, resp) {
        if (err) {
            return done(err);
        }
        
        assert.ok(!!resp.text.match(/(?=.*Page not found!)/));

        done();
    };
};

describe('GET /whatever-will-cause-404', function () {
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

                makeARequest = function (request, cb) {
                    request
                        .get('/whatever-will-cause-404')
                        .expect(404, function (err, resp) {
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
        makeARequest(unloggedRequest, assertValidResp(done));
    });

    it('works for logged users', function (done) {
        makeARequest(loggedRequest, assertValidResp(done));
    });
});