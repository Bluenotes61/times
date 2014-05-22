var db = require("../lib/db.js");

exports.index = function(req, res) {
  req.session.loggedinUser = null;
  res.render("login", {title:"040 - Tidbokning"});
};

exports.post = function(req, res) {
  var b = req.body;
  var res = db.loginUser(b.username, b.password);
  if (res.length == 0) 
    res.redirect("/");
  else
    res.render("login", {title:"040 - Tidbokning", username:b.username});
};

