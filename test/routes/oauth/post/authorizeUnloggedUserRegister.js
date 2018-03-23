var assert = require('assert');

var querystring = require('querystring');
var mongoose = require('mongoose');

var getUnloggedRequest = require('../../../../testUtils/getUnloggedRequest');

var oauthAuthorizeBeforeHook = require('../../../../testUtils/tests/oauthAuthorizeBeforeHook');
var authorizeOauthClientForUser = require('../../../../testUtils/tests/authorizeOauthClientForUser');

var IsInput = require('../../../../testUtils/validators/isInput');
var IsSelect = require('../../../../testUtils/validators/isSelect');

var isValidOauthAuthorizeSuccessRedirect = require('../../../../testUtils/validators/isValidOauthAuthorizeSuccessRedirect');

var beforeHookResp = null;
var request = null;
var csrfToken = null;
var user = null;
var client = null;
var redirectionURI = null;

var makeARequest = null;

describe('POST /oauth/authorize (Unlogged User) (Register)', function () {
    before(function (done) {
        oauthAuthorizeBeforeHook(function (err, resp) {
            if (err) {
                return done(err);
            }

            beforeHookResp = resp;
            user = resp.user;
            client = resp.client;
            redirectionURI = resp.redirectionURI;

            getUnloggedRequest(function (err, resp) {
                if (err) {
                    return done(err);
                }

                request = resp.request;
                csrfToken = resp.csrfToken;

                makeARequest = function (data, statusCode, cb) {
                    var context = this;
                    var _client = context.client || client;
                    var _redirectionURI = context.redirectionURI || redirectionURI;
                    var query = null;

                    if (err) {
                        return done(err);
                    }

                    query = {
                        client_id: _client.client_id.toString(),
                        redirect_uri: _redirectionURI.redirect_uri,
                        state: 'foo',
                        flow: 'registration'
                    };

                    // Request save session cookie sent,
                    // so make sure we start with logged out user
                    // for each tests.
                    request.post('/logout')
                           .set('Content-Type', 'application/x-www-form-urlencoded')
                           .send({_csrf: csrfToken}).end(function (err, res) {
                        
                        request
                            .post('/oauth/authorize?' + querystring.stringify(query))
                            // Body parser middleware need it in order to populate req.body
                            .set('Content-Type', 'application/x-www-form-urlencoded')
                            .send(data)
                            .expect(statusCode, function (err, res) {
                                if (err) {
                                    return cb(err);
                                }

                                cb(null, res);
                            });
                    });
                };

                done();
            });
        });
    });
    
    // First invalid login here. See below.
    it('displays invalid credentials error when user is '
       + 'already registered and invalid password', function (done) {

        makeARequest({
            email: user.email,
            password: mongoose.Types.ObjectId().toString(),
            _csrf: csrfToken
        }, 302, function (err, resp) {
            var isInput = null;
            
            if (err) {
                return done(err);
            }

            assert.ok(!!resp.headers.location.match(new RegExp('^/oauth/authorize\\?')));

            request.get(resp.headers.location).end(function (err, resp) {
                if (err) {
                    return done(err);
                }

                isInput = IsInput(resp.text);

                // Make sure email field was filled with passed email
                isInput('email', 'email', user.email);
                isInput('password', 'password', '');
                isInput('checkbox', 'persistent_login', '', 'checked');

                assert.ok(!!resp.text.match(/Your password is invalid./));
                assert.ok(!!resp.text.match(/The password previously used on sites and applications using EvenID/));

                done();
            });
        });
    });
    
    it('registers user and save valid '
       + 'timezone for unregistered user', function (done) {
        
        var timezone = 'Europe/Paris';
        
        makeARequest({
            email: 'bar' + mongoose.Types.ObjectId().toString() + '@evenid.com',
            password: mongoose.Types.ObjectId().toString(),
            timezone: timezone,
            _csrf: csrfToken
        }, 302, function (err, resp) {
            var isInput = null;
            
            if (err) {
                return done(err);
            }

            assert.ok(!!resp.headers.location.match(new RegExp('^/oauth/authorize\\?')));

            request.get(resp.headers.location).end(function (err, resp) {
                var isSelect = null;
                var selected = true;

                if (err) {
                    return done(err);
                }

                isSelect = IsSelect(resp.text);

                // Will be allowed to access to timezone
                assert.ok(!!resp.text.match(/will be allowed to access to/));

                isSelect('timezone', timezone, selected);

                done();
            });
        });
    });

    it('registers user but doesn\'t save invalid '
       + 'timezone for unregistered user', function (done) {
        
        makeARequest({
            email: 'bar' + mongoose.Types.ObjectId().toString() + '@evenid.com',
            password: mongoose.Types.ObjectId().toString(),
            timezone: 'bar',
            _csrf: csrfToken
        }, 302, function (err, resp) {
            var isInput = null;
            
            if (err) {
                return done(err);
            }

            assert.ok(!!resp.headers.location.match(new RegExp('^/oauth/authorize\\?')));

            request.get(resp.headers.location).end(function (err, resp) {
                var isSelect = null;
                var selected = false;

                if (err) {
                    return done(err);
                }

                isSelect = IsSelect(resp.text);
                
                assert.ok(!!resp.text.match(/needs additional information/));

                isSelect('timezone', '', selected);

                done();
            });
        });
    });
    
    it('registers user and displays authorizations '
       + 'form for unregistered user', function (done) {
        
        makeARequest({
            email: 'bar' + mongoose.Types.ObjectId().toString() + '@evenid.com',
            password: mongoose.Types.ObjectId().toString(),
            _csrf: csrfToken
        }, 302, function (err, resp) {
            var isInput = null;
            
            if (err) {
                return done(err);
            }

            assert.ok(!!resp.headers.location.match(new RegExp('^/oauth/authorize\\?')));

            request.get(resp.headers.location).end(function (err, resp) {
                if (err) {
                    return done(err);
                }

                assert.ok(!!resp.text.match(/needs additional information/));

                done();
            });
        });
    });
    
    it('logs user and displays authorizations '
       + 'form for registered user', function (done) {
        
        oauthAuthorizeBeforeHook(function (err, resp) {
            var user = resp && resp.user;

            if (err) {
                return done(err);
            }

            makeARequest({
                email: user.email,
                password: user.password,
                _csrf: csrfToken
            }, 302, function (err, resp) {
                var isInput = null;
                
                if (err) {
                    return done(err);
                }

                assert.ok(!!resp.headers.location.match(new RegExp('^/oauth/authorize\\?')));

                request.get(resp.headers.location).end(function (err, resp) {
                    if (err) {
                        return done(err);
                    }

                    assert.ok(!!resp.text.match(/needs additional information/));

                    done();
                });
            });
        });
    });

    it('redirects user to client when client only '
       + 'ask for email for registered users', function (done) {
        
        oauthAuthorizeBeforeHook.call({
            redirectionURI: {
                authorizations: ['emails'],
                authorization_flags: []
            }
        }, function (err, resp) {
            var client = resp && resp.client;
            var user = resp && resp.user;
            var redirectionURI = resp && resp.redirectionURI;

            if (err) {
                return done(err);
            }

            makeARequest.call({
                client: client,
                redirectionURI: redirectionURI
            }, {
                email: user.email,
                password: user.password,
                _csrf: csrfToken
            }, 302, function (err, resp) {
                var isInput = null;
                
                if (err) {
                    return done(err);
                }

                isValidOauthAuthorizeSuccessRedirect('code', 
                                                     redirectionURI.redirect_uri, 
                                                     resp.headers.location);

                done();
            });
        });
    });

    it('redirects user to client when client only '
       + 'ask for email for unregistered users', function (done) {
        
        oauthAuthorizeBeforeHook.call({
            redirectionURI: {
                authorizations: ['emails'],
                authorization_flags: []
            }
        }, function (err, resp) {
            var client = resp && resp.client;
            var user = resp && resp.user;
            var redirectionURI = resp && resp.redirectionURI;

            if (err) {
                return done(err);
            }

            makeARequest.call({
                client: client,
                redirectionURI: redirectionURI
            }, {
                email: 'bar' + mongoose.Types.ObjectId().toString() + '@evenid.com',
                password: mongoose.Types.ObjectId().toString(),
                _csrf: csrfToken
            }, 302, function (err, resp) {
                var isInput = null;
                
                if (err) {
                    return done(err);
                }

                isValidOauthAuthorizeSuccessRedirect('code', 
                                                     redirectionURI.redirect_uri, 
                                                     resp.headers.location);

                done();
            });
        });
    });

    it('redirects to login flow when user try to '
       + 'register to client for the second time', function (done) {
        
        // Get new user with new email in order to bypass
        // login max attempts security which was set to 1 in order
        // to enable testing of max attempts error in login POST test
        oauthAuthorizeBeforeHook(function (err, resp) {
            var beforeHookResp = resp;
            var user = resp && resp.user;

            if (err) {
                return done(err);
            }

            authorizeOauthClientForUser(beforeHookResp, function (err, resp) {
                var redirectionURI = beforeHookResp.redirectionURICode;

                if (err) {
                    return done(err);
                }

                makeARequest.call({
                    redirectionURI: redirectionURI,
                    client: beforeHookResp.client
                }, {
                    email: user.email,
                    password: user.password,
                    _csrf: csrfToken
                }, 302, function (err, resp) {
                    if (err) {
                        return done(err);
                    }

                    assert.ok(!!resp.headers.location.match(/flow=login/));

                    request.get(resp.headers.location).end(function (err, resp) {
                        if (err) {
                            return done(err);
                        }

                        assert.ok(!!resp.text.match(/You are already registered on/));

                        done();
                    });
                });
            });
        });
    });
});