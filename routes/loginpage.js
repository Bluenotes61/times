var db = require("./db.js");

/*** Render page ***/
exports.index = function(req, res) {
  req.session.loggedinUser = null;
  res.render("login", {title:"040 - Tidbokning"});
};


/*** redirect to mainpage after sucessful login ***/
exports.post = function(req, res) {
  var b = req.body;
  var sql = "select username, guid, isadmin from users where username ='" + b.username + "' AND password = '" + b.password + "'";
  db.connection.query(sql, function(err, rows) {
    if (err) console.log(err);
    if (rows.length == 0) {
      res.render("login", {title:"040 - Tidbokning", username:b.username});
    }
    else {
      req.session.loggedinUser = rows[0];
      res.redirect("/?guid=" + rows[0].guid);
    }
  });
};
