module.exports = {
    //functie cautare separata in baza de data in tabela carte
    cautare: function(sql, values, titlu, autor, categorie, editura, isbn, an_aparitie) {
        var titlu_sql = "";
        var autor_sql = "";
        var categorie_sql = "";
        var editura_sql = "";
        var isbn_sql = "";
        var an_aparitie_sql = "";

        if (titlu) {
            titlu_sql = "WHERE titlu = ? ";
            values.push(titlu);
        }
        if (autor) {
            if (values[0]) {
                autor_sql = "AND autor = ? ";
            } else {
                autor_sql = "WHERE autor = ? ";
            }
            values.push(autor);
        }
        if (categorie) {
            if (values[0]) {
                categorie_sql = "AND categorie = ? ";
            } else {
                categorie_sql = "WHERE categorie = ? ";
            }

            values.push(categorie);
        }
        if (editura) {
            if (values[0]) {
                editura_sql = "AND editura = ? ";
            } else {
                editura_sql = "WHERE editura = ? ";
            }
            values.push(editura);
        }
        if (isbn) {
            if (values[0]) {
                isbn_sql = "AND isbn = ? ";
            } else {
                isbn_sql = "WHERE isbn = ? ";
            }

            values.push(isbn);
        }
        if (an_aparitie) {
            if (values[0]) {
                an_aparitie_sql = "AND an_aparitie = ? ";
            } else {
                an_aparitie_sql = "WHERE an_aparitie = ? ";
            }

            values.push(an_aparitie);
        }
        return sql + titlu_sql + autor_sql + categorie_sql + editura_sql + isbn_sql + an_aparitie_sql;
    }

};