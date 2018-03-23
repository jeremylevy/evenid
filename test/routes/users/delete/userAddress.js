var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var createAddress = require('../../../../testUtils/users/createAddress');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

describe('DELETE /users/:user_id/addresses/:adddress_id', function () {
    before(function (done) {
        getLoggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;
            user = resp.user;

            makeARequest = function (userID, addressID, csrfToken, 
                                     statusCode, request, cb) {
                
                request
                    .delete('/users/' + userID 
                            + '/addresses/' + addressID)
                    // Body parser middleware need 
                    // it in order to populate req.body
                    .set('Content-Type', 'application/x-www-form-urlencoded')
                    .send({
                        _csrf: csrfToken
                    })
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

    it('redirects to login page when user is unlogged', function (done) {
        // We don't need to create client because redirect to login page
        // occurs before the deletion
        var userID = mongoose.Types.ObjectId().toString();
        var addressID = mongoose.Types.ObjectId().toString();

        getUnloggedRequest(function (err, resp) {
            var request = resp.request;
            var csrfToken = resp.csrfToken;

            if (err) {
                return done(err);
            }

            makeARequest(userID, addressID, csrfToken, 
                         302, request, function (err, resp) {
                
                if (err) {
                    return done(err);
                }

                assert.strictEqual(resp.headers.location, '/login');

                request.get('/login')
                       .end(function (err, resp) {

                    if (err) {
                        return done(err);
                    }
                    
                    assert.ok(!!resp.text.match(/You must log in to see this page/));

                    done();
                });
            });
        });
    });

    it('redirects to user addresses page if error', function (done) {
        var userID = mongoose.Types.ObjectId().toString();
        var addressID = mongoose.Types.ObjectId().toString();
        var redirectURI = '/users/' + userID 
                        + '/addresses/' + addressID;

        makeARequest(userID, addressID, csrfToken,
                     302, request, function (err, resp) {
            
            if (err) {
                return done(err);
            }

            assert.strictEqual(resp.headers.location, redirectURI);

            request.get(resp.headers.location)
                   .expect(403, function (err, resp) {
                
                assert.ok(!!resp.text.match(/You are not authorized to access this resource/));

                done();
            });
        });
    });

    it('redirects to user addresses page and '
       + 'display success notification when '
       + 'successful user address deletion', function (done) {

        async.auto({
            createAddress: function (cb) {
                createAddress(csrfToken, user.id, request, function (err, address) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, address);
                });
            },

            deleteAddress: ['createAddress', function (cb, results) {
                var address = results.createAddress;

                makeARequest(user.id, address.id, csrfToken, 
                             302, request, function (err, resp) {
                    
                    if (err) {
                        return cb(err);
                    }

                    assert.strictEqual(resp.headers.location,
                                       '/users/' + user.id + '/addresses');

                    cb(null, resp);
                });
            }],

            checkRedirect: ['deleteAddress', function (cb, results) {
                var resp = results.deleteAddress;
                var address = results.createAddress;

                request.get(resp.headers.location)
                       .end(function (err, resp) {
                    
                    if (err) {
                        return cb(err);
                    }

                    assert.ok(!!resp.text.match(/The address has been successfully deleted/));

                    // Make sure address not displayed anymore on page
                    assert.ok(!resp.text.match(new RegExp(address.id)));

                    cb(null, resp);
                });
            }]
        }, function (err, results) {
            if (err) {
                return done(err);
            }

            done();
        });
    });
});