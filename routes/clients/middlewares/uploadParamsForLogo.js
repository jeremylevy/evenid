var config = require('../../../config');

var isLoggedIn = require('../../users/callbacks/isLoggedIn');

module.exports = function (req, res, next) {
    // Set during update
    // Not set during create
    var client = res.locals.client;
    
    var uploadPolicyParams = {
        entity: 'client'
    };
    var maxFileSize = config.EVENID_PHOTOS
                            .MAX_FILE_SIZES
                            .CLIENT_LOGOS;

    if (!isLoggedIn(req)) {
        throw new Error('User must be logged before accessing '
                        + '`uploadPolicyForProfilPhoto` middleware');
    }
    
    res.locals.uploadPolicyParams = JSON.stringify(uploadPolicyParams);
    res.locals.maxFileSize = maxFileSize;
    res.locals.imgFileURL = client ? client.logo : '';
    res.locals.allowedContentType = 'image/.+';
    res.locals.acceptableContentType = 'image/*';
    res.locals.URLToSaveFile = client ? '/clients/' + client.id + '/logos' : '';
    res.locals.fileTooBigError = req.i18n.__('Your logo is too big. (Max %d KB)', maxFileSize / 1024);
    res.locals.fileHasWrongTypeError = req.i18n.__('Your logo is not an image.');
    res.locals.chooseFileBtnText = client ? req.i18n.__('Change logo') : req.i18n.__('Add a logo');

    next();
};