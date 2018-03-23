var checkIfUserIs = require('../../users/middlewares/checkIfUserIs');

var uploadParamsForProfilPhoto = require('../../users/middlewares/uploadParamsForProfilPhoto');

// During Oauth authorize, 
// upload form is displayed in iframe
// because embedding form in form 
// is not allowed in HTML5
module.exports = function (app, express) {
    app.get('/oauth/authorize/profil-photo', checkIfUserIs('logged'), function (req, res, next) {
        // `uploadParamsForProfilPhoto` middleware needs this
        res.locals.user = req.session.login.user;
    
        next();
    }, uploadParamsForProfilPhoto, function (req, res, next) {
        res.locals.imgSize = 200;

        res.render('oauth/authorize/profilPhoto');
    });
};