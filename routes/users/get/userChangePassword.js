var async = require('async');

var config = require('../../../config');

var _apiClient = require('../../../libs/apiClient');

var checkIfUserIs = require('../middlewares/checkIfUserIs');

var ApiError = require('../../../errors/types/ApiError');

module.exports = function (app, express) {
    var uriReg = new RegExp('^/users/(' 
                            + config.EVENID_MONGODB.OBJECT_ID_PATTERN
                            + ')/change-password$');

    app.get(uriReg, checkIfUserIs('logged'), function (req, res, next) {
        var userID = req.params[0];

        // Given that API was not called
        // we need to mock the error
        if (userID !== req.session.login.user.id) {
            return next(new ApiError('access_denied', {
                main: req.i18n.__('You are not authorized to access this resource.')
            }));
        }

        res.render('users/changePassword');
    });
};