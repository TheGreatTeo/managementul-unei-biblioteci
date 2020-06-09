module.exports = {
    startRoute: function(app) {
        app.get('/', function(req, res) {
            res.redirect('/welcome');
        });
    },

};