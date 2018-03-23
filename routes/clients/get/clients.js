var checkIfUserIs = require('../../users/middlewares/checkIfUserIs');
var uploadParamsForLogo = require('../middlewares/uploadParamsForLogo');

module.exports = function (app, express) {
    app.get('/clients', 
            checkIfUserIs('logged'),
            uploadParamsForLogo,
            function (req, res) {
                res.render('clients/create');
            });
};