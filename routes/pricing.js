module.exports = function (app, express) {
    app.get('/pricing', function (req, res) {
        res.render('pricing');
    });
};