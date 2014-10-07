/*** Initialize database connection ***/
var mysql = require('mysql');
module.exports.connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'n0ll.fyra.n0ll',
  database : 'times'
  //,timezone : 'utc'
});