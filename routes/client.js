module.exports = {
    welcome: function(app, sesiune) {
        app.get('/welcome', function(req, res) {
            sesiune = req.session;
            if (sesiune.loggedin == true) {
                res.redirect('/index')
            } else {
                sesiune.mesajEroare = req.cookies['mesajEroareLogin'];
                res.render('welcome', { sesiune: sesiune, layout: 'layouts/welcomeLayout' });
            }
        });
    },
    login: function(app, sesiune, db, md5) {
        app.post('/login', function(req, res) {
            sesiune = req.session;
            var gasit = 0;
            var username = req.body.username;
            var password = md5(req.body.password);
            var values = [username, password];
            var sql = "SELECT * FROM client WHERE BINARY username = ? and BINARY parola = ?;";
            db.query(sql, values, function(err, results, fields) {
                if (err) throw err;
                if (results.length > 0) {
                    sesiune.loggedin = true;
                    sesiune.username = req.body.username;
                    sesiune.id_client = results[0].id_client;
                    gasit = 1;
                    res.redirect('/index');
                } else {
                    sql = "SELECT * FROM administrator WHERE BINARY username = ? AND BINARY parola = ?"
                    db.query(sql, values, function(err, results, fields) {
                        if (err) throw err;
                        if (results.length > 0) {
                            sesiune.loggedin = true;
                            sesiune.username = req.body.username;
                            sesiune.admin = true;
                            sesiune.id_administrator = results.id_administrator;
                            gasit = 1;
                            res.redirect('/index');
                        } else {
                            res.cookie('mesajEroareLogin', 'Invalid login, please try again!', { maxAge: 1000, httpOnly: true });
                            res.redirect('/welcome');
                        }
                    });
                }
            });
        });
    },
    index: function(app, sesiune) {
        app.get('/index', function(req, res) {
            sesiune = req.session;
            res.render('index', { sesiune: sesiune, layout: 'layouts/basicLayout' });
        });
    },
    signup: function(app, sesiune, db) {
        app.post('/signup', function(req, res) {
            sesiune = req.session;

            var username = req.body.username;
            var password = md5(req.body.password);
            var email = req.body.email;
            var number = req.body.number;
            var date = req.body.date;
            var nume = req.body.nume;
            var prenume = req.body.prenume;
            var values = [
                [nume, prenume, date, number, email, username, password]
            ];
            var check = "SELECT * FROM client WHERE BINARY username = ?";
            var sql = "INSERT INTO client (nume,prenume,data_nastere,nr_telefon,email,username,parola) VALUES ?";
            db.query(check, [username], function(err, results) {
                if (err) throw err;
                if (results.length > 0) {
                    res.cookie('mesajEroareRegister', 'Username already existing!', { maxAge: 1000, httpOnly: true });
                    res.redirect('/register');
                } else {
                    db.query(sql, [values], function(err, results) {
                        if (err) throw err;
                        res.redirect('/welcome');
                    })
                }
            });
        });
    },
    register: function(app, sesiune) {
        app.get('/register', function(req, res) {
            sesiune = req.session;
            sesiune.mesajEroare = req.cookies['mesajEroareRegister'];
            res.render('register', { sesiune: sesiune, layout: "layouts/welcomeLayout" });
        });
    },
    logout: function(app, sesiune) {
        app.get('/logout', function(req, res) {
            sesiune = req.session;
            if (sesiune.loggedin == false) {
                res.redirect('/welcome');
            }
            req.session.destroy((err) => {
                if (err) {
                    return console.log(err);
                }
                sesiune.loggedin = false;
                res.redirect('/welcome');
            })
        });
    },
    books: function(app, sesiune, dateFormat) {
        app.get('/books', function(req, res) {
            sesiune = req.session;
            var today = dateFormat(new Date(), "yyyy-mm-dd");
            sesiune.today = today;
            sesiune.mesajEroareBooks = req.cookies['mesajEroareBooks'];
            res.render('books', { sesiune: sesiune, layout: 'layouts/basicLayout' });
        });
    },
    cautare: function(app, sesiune, functions, db) {
        app.post('/cautare', function(req, res) {
            sesiune = req.session;
            var titlu = req.body.titlu;
            var autor = req.body.autor;
            var categorie = req.body.categorie;
            var editura = req.body.editura;
            var isbn = req.body.isbn;
            var an_aparitie = req.body.an_aparitie;

            var sql = "SELECT id_carte,titlu,autor,categorie,editura,isbn,an_aparitie,status FROM carte ";
            var values = new Array();
            sql = functions.cautare(sql, values, titlu, autor, categorie, editura, isbn, an_aparitie);
            sql = sql + ";";

            db.query(sql, values, function(err, results) {
                if (err) throw err;
                sesiune.books = results;
                res.redirect('/books');
            });
        });
    },
    account: function(app, sesiune, db) {
        app.get('/account', function(req, res) {
            sesiune = req.session;
            if (sesiune.loggedin == true) {
                var sql = "SELECT rezervare.*, carte.* FROM rezervare,carte WHERE rezervare.id_carte = carte.id_carte AND id_client = ?;";
                var id_client = sesiune.id_client;
                db.query(sql, id_client, function(err, results) {
                    if (err) throw err;
                    sesiune.rezervari = results;
                    var data_rezervare = new Array();
                    results.forEach(element => {
                        data_rezervare.push(element.data_rezervare);
                    });
                    for (let i = 0; i < data_rezervare.length; i++) {
                        data_rezervare[i] = new Date(data_rezervare[i]);
                        data_rezervare[i] = data_rezervare[i].toLocaleDateString();
                    }
                    sesiune.data_rezervare = data_rezervare;
                    sql = "SELECT imprumut.*, carte.* FROM imprumut,carte WHERE imprumut.id_carte = carte.id_carte AND id_client = ?;";
                    db.query(sql, id_client, function(err, results) {
                        if (err) throw err;
                        sesiune.imprumut_client = results;
                        var data_imprumut = new Array();
                        var data_limita = new Array();
                        results.forEach(element => {
                            data_imprumut.push(String(element.data_imprumut));
                            data_limita.push(String(element.data_imprumut));
                        });

                        for (let i = 0; i < data_imprumut.length; i++) {
                            data_imprumut[i] = new Date(data_imprumut[i]);
                            data_limita[i] = new Date(data_limita[i]);
                            data_limita[i].setDate(data_imprumut[i].getDate() + 14);
                            data_imprumut[i] = data_imprumut[i].toLocaleDateString();
                            data_limita[i] = data_limita[i].toLocaleDateString();
                        }

                        sesiune.data_imprumut = data_imprumut;
                        sesiune.data_limita = data_limita;
                        res.render('account', { sesiune: sesiune, layout: 'layouts/basicLayout' });
                    });
                });
            } else {
                res.redirect('/welcome');
            }
        });
    },
    rezerva: function(app, sesiune, db) {
        app.post('/rezerva', function(req, res) {
            sesiune = req.session;
            if (sesiune.loggedin) {
                var id_carte = req.body.id_carte;
                var data_rezervare = req.body.data_rezervare;
                var id_client = sesiune.id_client;
                var values;
                var sql = "SELECT * FROM rezervare WHERE id_client = ? AND id_carte= ?;";
                db.query(sql, [id_client, id_carte], function(err, results) {
                    if (err) throw err;
                    if (results.length > 0) {
                        res.cookie('mesajEroareBooks', 'Booking already exists!', { maxAge: 1000, httpOnly: true });
                        res.redirect('/books');
                    } else {
                        sql = "SELECT cantitate FROM carte where id_carte = ?;";

                        db.query(sql, id_carte, function(err, results) {
                            if (err) throw err;
                            if (results[0].cantitate <= 0) {
                                res.cookie('mesajEroareBooks', 'Insufficient quantity!', { maxAge: 1000, httpOnly: true });
                                res.redirect('/books');
                            } else {
                                sql = "INSERT INTO `rezervare` (id_carte,id_client,data_rezervare) VALUES ?;";
                                values = [
                                    [id_carte, id_client, data_rezervare]
                                ];

                                db.query(sql, [values], function(err, results) {
                                    if (err) throw err;
                                    sql = "UPDATE carte SET cantitate = cantitate - 1 WHERE id_carte = ?;";
                                    db.query(sql, id_carte, function(err, results) {
                                        if (err) throw err;
                                        sql = "UPDATE carte SET status = 'invalid' WHERE cantitate = 0";
                                        db.query(sql, function(err, results) {
                                            if (err) throw err;
                                            res.redirect('/account');
                                        });
                                    });
                                });
                            }
                        });
                    }
                });

            } else {
                res.redirect('/welcome');
            }
        });
    },
    anulare: function(app, sesiune, db) {
        app.post('/anulare', function(req, res) {
            sesiune = req.session;
            var sql = "DELETE from rezervare WHERE id_rezervare = ?;";
            var id_rezervare = req.body.id_rezervare;
            var id_carte = req.body.id_carte;
            db.query(sql, id_rezervare, function(err, results) {
                if (err) throw err;
                sql = "UPDATE carte SET cantitate = cantitate + 1 WHERE id_carte = ?;";
                db.query(sql, id_carte, function(err, results) {
                    if (err) throw err;
                    sql = "UPDATE carte SET status = 'valid' WHERE cantitate > 0";
                    db.query(sql, function(err, results) {
                        if (err) throw err;
                        res.redirect('/account');
                    });
                });
            });
        });
    }
};