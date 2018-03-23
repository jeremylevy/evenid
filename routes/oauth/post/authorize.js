var authorizePost = require('../middlewares/authorizePost');

module.exports = function (app, express) {
    app.post('/oauth/authorize', authorizePost);
};