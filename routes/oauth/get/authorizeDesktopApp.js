var url = require('url');

var checkIfUserIs = require('../../users/middlewares/checkIfUserIs');

module.exports = function (app, express) {
    app.get('/oauth/authorize/desktop-app', 
            checkIfUserIs('logged'), 
            function (req, res, next) {

        var requestData = req.session.redirectToOauthDesktopAppData;
        var redirectTo = null;
        var clientName = null;

        if (!requestData) {
            res.sendStatus(403);

            return;
        }

        delete req.session.redirectToOauthDesktopAppData;

        // `true` to parse query string
        redirectTo = url.parse(requestData.redirectTo, true);
        clientName = requestData.clientName;
        
        res.render('oauth/authorize/desktopApp', {
            clientName: clientName,
            code: redirectTo.query.code,
            state: redirectTo.query.state,
            auto: !!redirectTo.path.match(/:auto/)
        });
    });
};