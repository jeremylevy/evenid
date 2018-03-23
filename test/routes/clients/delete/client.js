var assert = require('assert');

var mongoose = require('mongoose');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var createClient = require('../../../../testUtils/clients/create');

var isInvalidRequestResponse = require('../../../../testUtils/validators/isInvalidRequestResponse');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

describe('DELETE /clients/:client_id', function () {
    before(function (done) {
        getLoggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;
            user = resp.user;

            makeARequest = function (clientID, userPassword, csrfToken, 
                                     statusCode, request, cb) {
                
                request
                    .delete('/clients/' + clientID)
                    // Body parser middleware need it in order to populate req.body
                    .set('Content-Type', 'application/x-www-form-urlencoded')
                    .send({
                        user_password: userPassword,
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
        var clientID = mongoose.Types.ObjectId().toString();

        getUnloggedRequest(function (err, resp) {
            var request = resp.request;
            var csrfToken = resp.csrfToken;

            if (err) {
                return done(err);
            }

            makeARequest(clientID, user.password,
                         csrfToken, 302, request, function (err, resp) {
                
                if (err) {
                    return done(err);
                }

                assert.strictEqual(resp.headers.location, '/login');

                request.get('/login').end(function (err, resp) {
                    if (err) {
                        return done(err);
                    }
                    
                    assert.ok(!!resp.text.match(/You must log in to see this page/));

                    done();
                });
            });
        });
    });

    it('redirects to client page if invalid client ID', function (done) {
        var clientID = mongoose.Types.ObjectId().toString();

        makeARequest(clientID, user.password,
                     csrfToken, 302, request, function (err, resp) {
            
            if (err) {
                return done(err);
            }

            assert.strictEqual(resp.headers.location, '/clients/' + clientID);

            request.get(resp.headers.location).expect(403, function (err, resp) {
                assert.ok(!!resp.text.match(/You are not authorized to access this resource/));

                done();
            });
        });
    });

    it('redirects to client page if invalid user password', function (done) {
        createClient(csrfToken, request, function (err, client) {
            if (err) {
                return done(err);
            }

            makeARequest(client.id, 'bar',
                         csrfToken, 302, request, function (err, resp) {
                
                if (err) {
                    return done(err);
                }

                assert.strictEqual(resp.headers.location, '/clients/' + client.id);

                request.get(resp.headers.location).end(function (err, resp) {
                    if (err) {
                        return done(err);
                    }

                    isInvalidRequestResponse(resp.text);

                    // Password is checked using AJAX
                    // So password error will not be displayed

                    done();
                });
            });
        });
    });

    it('redirects to client creation page and display success '
       + 'notification when successful client deletion', function (done) {

        createClient(csrfToken, request, function (err, client) {
            if (err) {
                return done(err);
            }

            makeARequest(client.id, user.password,
                         csrfToken, 302, request, function (err, resp) {
                
                if (err) {
                    return done(err);
                }

                assert.strictEqual(resp.headers.location, '/clients');

                request.get(resp.headers.location).end(function (err, resp) {
                    assert.ok(!!resp.text.match(/The client has been successfully deleted/));

                    // Make sure client is not displayed anymore on page
                    assert.ok(!resp.text.match(new RegExp(client.id)));

                    done();
                });
            });
        });
    });
});