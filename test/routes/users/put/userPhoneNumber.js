var assert = require('assert');

var async = require('async');
var mongoose = require('mongoose');

var config = require('../../../../config');

var getLoggedRequest = require('../../../../testUtils/getLoggedRequest');
var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var createPhoneNumber = require('../../../../testUtils/users/createPhoneNumber');

var validPhoneNumber = require('../../../../testUtils/data/validPhoneNumber');

var IsSelect = require('../../../../testUtils/validators/isSelect');

var isValidUserPhoneNumberPage = require('../../../../testUtils/validators/isValidUserPhoneNumberPage');
var isInvalidRequestResponse = require('../../../../testUtils/validators/isInvalidRequestResponse');

var request = null;
var csrfToken = null;
var user = null;

var makeARequest = null;

describe('PUT /users/:user_id/phone-numbers/:phone_number_id', function () {
    before(function (done) {
        getLoggedRequest(function (err, resp) {
            if (err) {
                return done(err);
            }

            request = resp.request;
            csrfToken = resp.csrfToken;
            user = resp.user;

            makeARequest = function (userID, phoneNumberID, data, 
                                     statusCode, request, cb) {
                
                request
                    .put('/users/' 
                         + userID 
                         + '/phone-numbers/' 
                         + phoneNumberID)
                    // Body parser middleware need it in order to populate req.body
                    .set('Content-Type', 'application/x-www-form-urlencoded')
                    .send(data)
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
        // We don't need to create user because redirect to login page
        // occurs before the deletion
        var userID = mongoose.Types.ObjectId().toString();
        var phoneNumberID = mongoose.Types.ObjectId().toString();

        getUnloggedRequest(function (err, resp) {
            var request = resp.request;
            var csrfToken = resp.csrfToken;

            if (err) {
                return done(err);
            }

            makeARequest(userID, phoneNumberID, {
                _csrf: csrfToken
            }, 302, request, function (err, resp) {
                
                if (err) {
                    return done(err);
                }

                assert.strictEqual(resp.headers.location,
                                   '/login');

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

    it('displays errors when empty form data', function (done) {
        createPhoneNumber(csrfToken, user.id, 
                          request, function (err, phoneNumber) {
            
            if (err) {
                return done(err);
            }

            makeARequest(user.id, phoneNumber.id, {
                _csrf: csrfToken
            }, 302, request, function (err, resp) {
                
                if (err) {
                    return done(err);
                }

                assert.strictEqual(resp.headers.location,
                                   '/users/' 
                                   + user.id 
                                   + '/phone-numbers/' 
                                   + phoneNumber.id);

                request.get(resp.headers.location)
                       .end(function (err, resp) {
                    
                    if (err) {
                        return done(err);
                    }

                    isInvalidRequestResponse(resp.text);
                    
                    assert.ok(!!resp.text.match(/Number must be set/));
                    assert.ok(!!resp.text.match(/Country must be set/));

                    done();
                });
            });
        });
    });

    it('displays errors when invalid phone number', function (done) {
        createPhoneNumber(csrfToken, user.id, request, function (err, phoneNumber) {
            if (err) {
                return done(err);
            }

            phoneNumber.number = 'bar';

            makeARequest(user.id, phoneNumber.id, phoneNumber,
                         302, request, function (err, resp) {
                
                if (err) {
                    return done(err);
                }

                assert.strictEqual(resp.headers.location,
                                   '/users/' 
                                   + user.id 
                                   + '/phone-numbers/' 
                                   + phoneNumber.id);

                request.get(resp.headers.location)
                       .end(function (err, resp) {
                    
                    var isSelect = IsSelect(resp.text);
                    
                    if (err) {
                        return done(err);
                    }

                    isInvalidRequestResponse(resp.text);

                    assert.ok(!!resp.text.match(/Phone number is invalid for specified country/));

                    isSelect('country', phoneNumber.country, 'selected');

                    done();
                });
            });
        });
    });

    it('redirects to user\'s phone number '
       + 'page when valid form data', function (done) {
        
        createPhoneNumber(csrfToken, user.id,
                          request, function (err, phoneNumber) {
            
            if (err) {
                return done(err);
            }

            makeARequest(user.id, phoneNumber.id, phoneNumber,
                         302, request, function (err, resp) {
                
                if (err) {
                    return done(err);
                }

                assert.strictEqual(resp.headers.location,
                                   '/users/' 
                                   + user.id 
                                   + '/phone-numbers/'
                                   + phoneNumber.id);

                request.get(resp.headers.location)
                       .end(function (err, resp) {
                    
                    if (err) {
                        return done(err);
                    }

                    isValidUserPhoneNumberPage(phoneNumber, resp.text);

                    done();
                });
            });
        });
    });
});