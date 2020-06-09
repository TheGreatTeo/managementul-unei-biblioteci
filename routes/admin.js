module.exports = {
    get: function(app, sesiune) {
        app.get('/admin', function(req, res) {
            sesiune = req.session;
            if (sesiune.loggedin == undefined || sesiune.admin == undefined) {
                res.redirect('/index');
            } else {
                sesiune.mesajEroareInserare = req.cookies['mesajEroareInserare'];
                sesiune.mesajEroareImprumut = req.cookies['mesajEroareImprumut'];
                sesiune.mesajEroareVerificare = req.cookies['mesajEroareVerificare'];
                res.render('admin', { sesiune: sesiune, layout: 'layouts/basicLayout' });
            }
        });
    },
    cautare: function(app, sesiune, functions, db) {
        app.post('/cautare_admin', function(req, res) {
            sesiune = req.session;
            var titlu = req.body.titlu;
            var autor = req.body.autor;
            var categorie = req.body.categorie;
            var editura = req.body.editura;
            var isbn = req.body.isbn;
            var an_aparitie = req.body.an_aparitie;
            var cantitate = req.body.cantitate;

            if (!titlu && !autor && !cantitate && !categorie && !editura && !isbn && !an_aparitie) {
                res.cookie('mesajEroareInserare', 'You need to complete at least one field!', { maxAge: 1000, httpOnly: true });
                res.redirect('/admin');
            } else {
                var sql = "SELECT id_carte,titlu,autor,categorie,editura,isbn,an_aparitie,cantitate,status FROM carte ";
                var values = new Array();
                sql = functions.cautare(sql, values, titlu, autor, categorie, editura, isbn, an_aparitie);
                if (sql == "SELECT id_carte,titlu,autor,categorie,editura,isbn,an_aparitie,cantitate,status FROM carte ") {
                    if (cantitate) {
                        sql += "WHERE cantitate = ?";
                        values.push(cantitate);
                    }
                } else {
                    if (cantitate) {
                        sql += "AND cantitate = ?";
                        values.push(cantitate);
                    }
                }
                sql = sql + ";";

                db.query(sql, values, function(err, results) {
                    if (err) throw err;
                    sesiune.cautare_admin = results;
                    res.redirect('/admin');
                });
            }
        });
    },
    inserare: function(app, sesiune, db) {
        app.post('/inserare_admin', function(req, res) {
            sesiune = req.session;
            var titlu = req.body.titlu;
            var autor = req.body.autor;
            var categorie = req.body.categorie;
            var editura = req.body.editura;
            var isbn = req.body.isbn;
            var an_aparitie = req.body.an_aparitie;
            var cantitate = req.body.cantitate;

            if (!titlu || !autor || !cantitate || !categorie || !editura || !isbn || !an_aparitie) {
                res.cookie('mesajEroareInserare', "You didn't completed all fields!", { maxAge: 1000, httpOnly: true });
                res.redirect('/admin');
            } else {
                var values = new Array();
                values.push(titlu, autor, categorie, editura, isbn, an_aparitie);
                var sql = "SELECT * FROM carte WHERE titlu = ? AND autor = ? and categorie = ? and editura = ? and isbn = ? and an_aparitie = ?;";
                db.query(sql, values, function(err, results) {
                    if (err) throw err;
                    if (results.length > 0) {
                        sql = "UPDATE carte SET cantitate = cantitate + ? WHERE isbn = ?;";
                        var vals = new Array();
                        vals.push(cantitate, isbn);
                        db.query(sql, vals, function(err, results) {
                            if (err) throw err;
                            res.redirect('/admin');
                        });
                    } else {
                        sql = "INSERT INTO carte (titlu,autor,categorie,editura,isbn,an_aparitie,cantitate,status) VALUES ?;";
                        values = [
                            [titlu, autor, categorie, editura, isbn, an_aparitie, cantitate, "valid"]
                        ];
                        db.query(sql, [values], function(err, results) {
                            if (err) throw err;
                            res.redirect('/admin');
                        });
                    }
                });
            }
        });
    },
    imprumut: function(app, sesiune, db) {
        app.post('/imprumut-admin', function(req, res) {
            sesiune = req.session;
            var username = req.body.username;
            var isbn = req.body.isbn;
            var today = new Date();
            var limita = new Date(today);
            limita.setDate(today.getDate() + 14); //+ 0 pt verificare cronJob
            var id_client;
            var id_carte;
            var status;
            var values;
            sql = "SELECT id_client FROM client WHERE username = ?;";
            values = [username];
            db.query(sql, values, function(err, results) {
                if (err) throw err;
                if (results.length <= 0) {
                    res.cookie('mesajEroareImprumut', 'Username is not existing!', { maxAge: 1000, httpOnly: true });
                    res.redirect('/admin');
                } else {
                    id_client = results[0].id_client;
                    sql = "SELECT id_carte,status FROM carte WHERE isbn = ?;";
                    values = [isbn];
                    db.query(sql, values, function(err, results) {
                        if (err) throw err;
                        if (results.length <= 0) {
                            res.cookie('mesajEroareImprumut', 'ISBN is not existing!', { maxAge: 1000, httpOnly: true });
                            res.redirect('/admin');
                        } else {
                            id_carte = results[0].id_carte;
                            status = results[0].status;
                            sql = "SELECT * FROM imprumut WHERE id_client = ? AND id_carte = ?;";
                            values = [id_client, id_carte];
                            db.query(sql, values, function(err, results) {
                                if (err) throw err;
                                if (results.length > 0) {
                                    res.cookie('mesajEroareImprumut', 'This borrow already exists!', { maxAge: 1000, httpOnly: true });
                                    res.redirect('/admin');
                                } else {
                                    if (status == 'invalid') {
                                        res.cookie('mesajEroareImprumut', 'Insufficient quantity!', { maxAge: 1000, httpOnly: true });
                                        res.redirect('/admin');
                                    } else {
                                        sql = "INSERT INTO imprumut (id_client,id_carte,data_imprumut,data_limita) VALUES ?;";
                                        values = [
                                            [id_client, id_carte, today, limita]
                                        ];
                                        db.query(sql, [values], function(err, results) {
                                            if (err) throw err;
                                            sql = "UPDATE carte SET cantitate = cantitate - 1 WHERE id_carte = ?;";
                                            db.query(sql, id_carte, function(err, results) {
                                                if (err) throw err;
                                                sql = "UPDATE carte SET status = 'invalid' WHERE cantitate = 0";
                                                db.query(sql, function(err, results) {
                                                    if (err) throw err;
                                                    res.redirect('/admin');
                                                });
                                            });
                                        });
                                    }
                                }
                            });
                        }
                    });
                }
            });
        });
    },
    verificare: function(app, sesiune, db) {
        app.post('/verificare-admin', function(req, res) {
            sesiune = req.session;
            var username = req.body.username;
            var isbn = req.body.isbn;
            sesiune.username_verificare = username;
            sesiune.isbn_verificare = isbn;
            var id_client;
            var id_carte;
            var values;
            sql = "SELECT id_client FROM client WHERE username = ?;";
            values = [username];
            db.query(sql, values, function(err, results) {
                if (err) throw err;
                if (results.length <= 0) {
                    res.cookie('mesajEroareVerificare', 'Username is not existing!', { maxAge: 1000, httpOnly: true });
                    res.redirect('/admin');
                } else {
                    id_client = results[0].id_client;
                    sql = "SELECT id_carte FROM carte WHERE isbn = ?;";
                    values = [isbn];
                    db.query(sql, values, function(err, results) {
                        if (err) throw err;
                        if (results.length <= 0) {
                            res.cookie('mesajEroareVerificare', 'ISBN is not existing!', { maxAge: 1000, httpOnly: true });
                            res.redirect('/admin');
                        } else {
                            id_carte = results[0].id_carte;
                            sql = "SELECT * FROM imprumut WHERE id_client = ? AND id_carte = ?;";
                            values = [id_client, id_carte];
                            db.query(sql, values, function(err, results) {
                                if (err) throw err;
                                if (results.length <= 0) {
                                    res.cookie('mesajEroareVerificare', 'This borrow is not existing!', { maxAge: 1000, httpOnly: true });
                                    res.redirect('/admin');
                                } else {
                                    sesiune.verificare = results;
                                    var data_imprumut = results[0].data_imprumut;
                                    var data_limita = results[0].data_limita;
                                    var today = new Date();
                                    data_imprumut = new Date(data_imprumut);
                                    data_limita = new Date(data_limita);

                                    data_limita.setDate(data_limita.getDate()); // + 0 pt verificare

                                    var d1 = Date.UTC(data_limita.getFullYear(), data_limita.getMonth(), data_limita.getDate());
                                    var d2 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

                                    data_imprumut = data_imprumut.toLocaleDateString();
                                    data_limita = data_limita.toLocaleDateString();
                                    today = today.toLocaleDateString();

                                    if (today > data_limita) {
                                        sesiune.depasire = true;
                                        sesiune.zile = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
                                    }
                                    sesiune.data_imprumut = data_imprumut;
                                    sesiune.data_limita = data_limita;
                                    res.redirect('/admin');
                                }
                            });
                        }
                    });
                }
            })
        });
    },
    inapoiere: function(app, sesiune, db) {
        app.post("/inapoiere", function(req, res) {
            sesiune = req.session;
            var id_imprumut = req.body.id_imprumut;
            var id_carte = req.body.id_carte;
            sql = "DELETE FROM imprumut WHERE id_imprumut = ?;";
            db.query(sql, id_imprumut, function(err, results) {
                if (err) throw err;
                sql = "UPDATE carte SET cantitate = cantitate + 1 WHERE id_carte = ?;";
                db.query(sql, id_carte, function(err, results) {
                    if (err) throw err;
                    sql = "UPDATE carte SET status = 'valid' WHERE cantitate > 0";
                    db.query(sql, function(err, results) {
                        if (err) throw err;
                        res.redirect('/admin');
                    });
                });
            });
        });
    }
};