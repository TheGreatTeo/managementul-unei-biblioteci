const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const app = express();
const session = require('express-session');
const port = 6789;
const fs = require('fs');

var admin = require('./routes/admin');
var client = require('./routes/client');
var general = require('./routes/general');
var md5 = require('md5');
var nodemailer = require('nodemailer');
var schedule = require('node-schedule');
var dateFormat = require('dateformat');
var db = require('./database');
var functions = require('./functions');

app.set('trust proxy', 1);
// directorul 'views' va conține fișierele .ejs (html + js executat la server)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/layout');
// suport pentru layout-uri - implicit fișierul care reprezintă template-ul site-ului este views/layout.ejs
app.use(expressLayouts);
// directorul 'public' va conține toate resursele accesibile direct de către client (e.g., fișiere css, javascript, imagini)
app.use(express.static('public'))
    // corpul mesajului poate fi interpretat ca json; datele de la formular se găsesc în format json în req.body
app.use(bodyParser.json());
// utilizarea unui algoritm de deep parsing care suportă obiecte în obiecte
app.use(bodyParser.urlencoded({ extended: true }));
//cookies
app.use(cookieParser())
    //sesion
app.use(session({
    secret: 'hash',
    saveUninitialized: true,
    resave: true,
    cookie: {
        expires: 6000000
    }
}));
//email sender
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'youtGmail',
        pass: 'yourGmailPassword'
    }
});

//cronJobs
//notificare email daca data limita de retur a unei carti este astazi;
var limita = schedule.scheduleJob('0 0 12 * * *', function() { //ora actuala pt verificare
    console.log("Verificare limita");
    var today = new Date();
    today.setDate(today.getDate() - 1);
    today = today.toISOString().slice(0, 10);
    var emails = new Array();
    var data_limita = new Array();
    var ids = new Array();
    sql = "SELECT * FROM imprumut;";

    db.query(sql, function(err, results) {
        if (err) throw err;
        if (results.length > 0) {
            for (let i = 0; i < results.length; i++) {
                data_limita.push(results[i].data_limita);
                ids.push(results[i].id_client);
                data_limita[i] = data_limita[i].toISOString().slice(0, 10);
                if (data_limita[i] != today) {
                    ids[i] = null;
                }
            }
            for (let i = 0; i < ids.length; i++) {
                sql = "SELECT email FROM client WHERE id_client = ?;";
                if (ids[i] != null) {
                    db.query(sql, ids[i], function(err, results1) {
                        if (err) throw err;
                        if (results1.length > 0) {
                            for (let i = 0; i < results1.length; i++) {
                                emails.push(results1[i].email);
                            }
                            for (let i = 0; i < emails.length; i++) {
                                var mailOptions = {
                                    from: 'bibliotecawebsitepw@gmail.com',
                                    to: emails[i],
                                    subject: 'Alerta',
                                    text: 'Azi e ultima zi de retur'
                                };

                                transporter.sendMail(mailOptions, function(error, info) {
                                    if (error) {
                                        console.log(error);
                                    } else {
                                        console.log('Email sent: ' + info.response);
                                    }
                                });
                            }
                        }
                    });
                }
            }
        }
    });
});
//update o data pe zi la coloana now cu data de azi
var update_now = schedule.scheduleJob('0 01 00 * * *', function() { //ora actuala pt verificare
    console.log("Update now");
    var today = dateFormat(new Date(), "yyyy-mm-dd");
    sql = "UPDATE rezervare SET now = ? WHERE data_rezervare is not null";
    db.query(sql, today, function(err, results) {
        if (err) throw err;
    });
});
//verificare daca a trecut o zi de la data de rezervare
var delete_rezervare = schedule.scheduleJob('0 02 00 * * *', function() { //ora actuala pt verificare
    console.log("Delete rezervare");
    sql = "DELETE FROM rezervare WHERE now > data_rezervare;"; // = pt verificare 
    db.query(sql, function(err, results) {
        if (err) throw err;
    });
});

// la accesarea din browser adresei http://localhost:6789/ se va returna textul 'Hello World'
// proprietățile obiectului Request - req - https://expressjs.com/en/api.html#req
// proprietățile obiectului Response - res - https://expressjs.com/en/api.html#res

//session variable
var sesiune;

//start route
general.startRoute(app);
//welcome-pagina de log in
client.welcome(app, sesiune);
//login
client.login(app, sesiune, db, md5);
//index-pagina principala(acasa)
client.index(app, sesiune);
//signup
client.signup(app, sesiune, db);
//register-pagina de inregistrare
client.register(app, sesiune);
//logout
client.logout(app, sesiune);
//books- pagina client sau vizitator fara cont pentru vizualizarea cartilor
client.books(app, sesiune, dateFormat);
//cautare
client.cautare(app, sesiune, functions, db);
//account-pagina client pt vizualizarea cartilor rezervate si a celor imprumutate
client.account(app, sesiune, db);
//rezerva
client.rezerva(app, sesiune, db);
//anulare-anulare rezervare
client.anulare(app, sesiune, db);


//admin-pagina de gestiune a cartilor si a imprumuturilo de catre administrator
admin.get(app, sesiune);

//cautare-admin- afisare carti din baza de date pentru admin
admin.cautare(app, sesiune, functions, db);
//inserare-admin - insereaza o carte noua in baza de date sau adauga un numar de carti pt o carte deja existenta
admin.inserare(app, sesiune, db);
//imprumut-admin - adauga un imprumut pt un client
admin.imprumut(app, sesiune, db);
//verifica-admin - admin-ul verifica imprumutul unui client
admin.verificare(app, sesiune, db);
//inapoiere - clientul inapoiaza cartea admin-ului
admin.inapoiere(app, sesiune, db);

//pentru orice get pentru care nu exista o pagina
app.get("*", function(req, res) {
    res.redirect('/index');
});

app.listen(port, () => console.log(`Serverul rulează la adresa http://localhost:`));