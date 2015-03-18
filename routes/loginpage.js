var db = require("../helpers/db.js");
var Cookies = require("cookies");

/*** Render page ***/
exports.index = function(req, res) {
  var cookies = new Cookies(req, res);
  var guid = cookies.get("guid");
  if (guid && req.query.logout != "1") {
    var sql = "select username, guid, isadmin, name from users where guid=?";
    db.runQuery(sql, [guid], function(err, rows) {
      if (rows.length == 0) {
        res.render("login", {title:"040 - Tidbokning"});
      }
      else {
        req.session.loggedinUser = rows[0];
        cookies.set("guid", rows[0].guid, {expires:new Date(new Date().getTime() + 365*24*3600*1000)});
        res.redirect("/"); 
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
  var sql = "select username, guid, isadmin, name from users where username=? AND password=?";
  db.runQuery(sql, [b.username, b.password], function(err, rows) {
    if (rows.length == 0) {
      res.render("login", {title:"040 - Tidbokning", username:b.username});
    }
    else {
      req.session.loggedinUser = rows[0];
      cookies.set("guid", rows[0].guid, {expires:new Date(new Date().getTime() + 365*24*3600*1000)});
      res.redirect("/");
    }
  });
};
