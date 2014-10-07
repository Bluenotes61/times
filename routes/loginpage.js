var db = require("./db.js");
var Cookies = require("cookies");

/*** Render page ***/
exports.index = function(req, res) {
  var cookies = new Cookies(req, res);
  var guid = cookies.get("guid");
  if (guid && req.query.logout != "1") {
    var sql = "select username, guid, isadmin, name from users where guid ='" + guid + "'";
    db.connection.query(sql, function(err, rows) {
      if (err) console.log(err);
      if (rows.length == 0) {
        res.render("login", {title:"040 - Tidbokning"});
      }
      else {
        req.session.loggedinUser = rows[0];
        cookies.set("guid", rows[0].guid, {expires:new Date(new Date().getTime() + 7*24*3600*1000)});
        res.redirect("/?guid=" + rows[0].guid);
      }
    });
  }
  else {
    cookies.set("guid", null);
    req.session.loggedinUser = null;
    res.render("login", {title:"040 - Tidbokning"});
  }
};


/*** redirect to mainpage after sucessful login ***/
exports.post = function(req, res) {
  var cookies = new Cookies(req, res);
  var b = req.body;
  var sql = "select username, guid, isadmin, name from users where username ='" + b.username + "' AND password = '" + b.password + "'";
  db.connection.query(sql, function(err, rows) {
    if (err) console.log(err);
    if (rows.length == 0) {
      res.render("login", {title:"040 - Tidbokning", username:b.username});
    }
    else {
      req.session.loggedinUser = rows[0];
      cookies.set("guid", rows[0].guid, {expires:new Date(new Date().getTime() + 7*24*3600*1000)});
      res.redirect("/?guid=" + rows[0].guid);
    }
  });
};
