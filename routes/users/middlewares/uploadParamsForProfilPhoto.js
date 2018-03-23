var config = require('../../../config');

var isLoggedIn = require('../callbacks/isLoggedIn');

module.exports = function (req, res, next) {
    var user = res.locals.user;
    var maxFileSize = config.EVENID_PHOTOS
                            .MAX_FILE_SIZES
                            .USER_PROFIL_PHOTOS;

    if (!isLoggedIn(req)) {
        throw new Error('User must be logged '
                        + 'before accessing '
                        + '`uploadPolicyForProfilPhoto` middleware');
    }

    if (!user) {
        throw new Error('User must be set in response '
                        + 'locals object before accessing '
                        + '`uploadPolicyForProfilPhoto` middleware');
    }

    if (!user.id) {
        throw new Error('User set in response '
                        + 'locals object must '
                        + 'have an `id` property');
    }

    if (!user.profil_photo) {
        throw new Error('User set in response locals '
                        + 'object must have a `profil_photo` '
                        + 'property');
    }
    
    res.locals.uploadPolicyParams = JSON.stringify({
        entity: 'user'
    });

    res.locals.maxFileSize = maxFileSize;
    res.locals.imgFileURL = user.profil_photo;
    res.locals.allowedContentType = 'image/.+';
    res.locals.acceptableContentType = 'image/*';
    res.locals.URLToSaveFile = '/users/' + user.id + '/profil-photos';
    res.locals.fileTooBigError = req.i18n.__('Your profil photo is too big. (Max %d MB)', (maxFileSize / 1024) / 1024);
    res.locals.fileHasWrongTypeError = req.i18n.__('Your profil photo is not an image.');
    res.locals.chooseFileBtnText = req.i18n.__('Change profil photo');

    next();
};