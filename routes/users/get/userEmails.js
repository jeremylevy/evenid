var async = require('async');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var checkIfUserIs = require('../middlewares/checkIfUserIs');
var paginate = require('../middlewares/paginate');

module.exports = function (app, express) {
    var uriReg = new RegExp('^/users/(' 
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                            + ')/emails(?:/page/((?:[1-9]+[0-9]*)|last))?$');

    app.get(uriReg, checkIfUserIs('logged'), function (req, res, next) {
        var userID = req.params[0];
        var currentPage = req.params[1] || 1;
        
        var user = req.session.login.user;

        var apiClient = _apiClient(req, res,
                                   config.EVENID_APP.CLIENT_ID, 
                                   config.EVENID_APP.CLIENT_SECRET, 
                                   config.EVENID_API.ENDPOINT,
                                   req.session.login.access_token,
                                   req.session.login.refresh_token);

        async.auto({
            findEmails: function (cb) {
                apiClient.makeRequest('GET', '/users/' + userID + '/emails', 
                                      {}, function (err, emails) {

                    if (err) {
                        return cb(err);
                    }

                    cb(null, emails);
                });
            },

            findAuthorizations: function (cb) {
                apiClient.makeRequest('GET', '/users/' + userID + '/authorizations?entity=emails', 
                                      {}, function (err, authorizations) {
                    
                    if (err) {
                        return cb(err);
                    }

                    cb(null, authorizations);
                });
            }
        }, function (err, results) {
            var emails = results && results.findEmails;
            var authorizations = results && results.findAuthorizations;

            if (err) {
                return next(err);
            }

            res.locals.user = user;
            res.locals.authorizations = authorizations;
            res.locals.emails = emails;
            res.locals.maxEntityDisplayed = config.EVENID_USERS.MAX_ENTITIES_DISPLAYED.EMAILS;
            res.locals.currentPage = currentPage;
            res.locals.entityName = 'emails';

            next();
        });
    }, paginate, function (req, res, next) {
        res.render('users/emails');
    });
};