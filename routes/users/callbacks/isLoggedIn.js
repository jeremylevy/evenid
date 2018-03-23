module.exports = function (req) {
    return !!(req 
                && req.session
                && req.session.login
                && req.session.login.access_token
                && req.session.login.user_id
                && req.session.login.user);
}