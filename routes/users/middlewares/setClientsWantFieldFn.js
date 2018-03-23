module.exports = function (req, res, next) {
    /* `authorizations` is an array of UserAuthorization entity */
    res.locals.clientsWantField = function (authorizations, field, fieldID) {
        for (var i = 0, j = authorizations.length; i < j; ++i) {
            var authorization = authorizations[i];
            
            if (!fieldID && authorization.scope.indexOf(field) !== -1
                || fieldID && authorization.entities[field].indexOf(fieldID) !== -1) {
                
                return true;
            }
        }

        return false;
    };

    next();
};