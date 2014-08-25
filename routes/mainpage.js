var db = require("./db.js");
var mysql = require('mysql');

exports.index = function(req, res) {
/*  if (!req.session.loggedinUser)
    res.redirect("/login");
  else {
*/
req.session.loggedinUser = "me";
res.render("index", {title:"Boka tider", username:req.session.loggedinUser});
//  }
};
