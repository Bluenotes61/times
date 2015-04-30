var db = require("../helpers/db.js");
var Q = require("q");

/**
 * Called by the jqGrid to retrieve data.
 * Calls getGridData
 * @param  {Request} req
 * @param  {Response} res
 */
exports.getgrid = function(req, res) {
  var params = {
    idcol:req.query.idcol,
    cols:req.query.cols,
    sql:req.query.sql,
    condition:req.query.condition,
    filters:req.query.filters,
    sidx:req.query.sidx,
    sord:req.query.sord,
    edittable:req.query.edittable,
    page:req.query.page,
    rows:req.query.rows
  };
  this.exports.getGridData(params).then(
    function(data){
      res.json(data);
    },
    function(err) {
      common.logMessage("Error in getgrid", err);
      res.end(err);
    }
  );
}

function getInt(s, def) {
  var res = parseInt(s, 10);
  if (isNaN(res)) res = def;
  return res;
}

function getCondition(item) {
  //"field":"title","op":"eq","data":"ss" 
  var res = item.field + " ";
  if (item.op == "eq") res += "= '" + item.data + "'";
  else if (item.op == "ne") res += "<> '" + item.data + "'";
  else if (item.op == "lt") res += "< " + item.data;
  else if (item.op == "le") res += "<= " + item.data;
  else if (item.op == "gt") res += "> " + item.data;
  else if (item.op == "ge") res += ">= " + item.data;
  else if (item.op == "bw") res += "like '" + item.data + "%'";
  else if (item.op == "bn") res += "not like '" + item.data + "%'";
  else if (item.op == "in") res += "in ('" + item.data + "')";
  else if (item.op == "ni") res += "not in ('" + item.data + "')";
  else if (item.op == "ew") res += "like '%" + item.data + "'";
  else if (item.op == "en") res += "not like '%" + item.data + "'";
  else if (item.op == "cn") res += "like '%" + item.data + "%'";
  else if (item.op == "nc") res += "not like '%" + item.data + "%'";

  return res;
}

function getConditions(json) {
  //{"groupOp":"AND","rules":[{"field":"title","op":"eq","data":"ss"},{"field":"undefined","op":"eq","data":"dd"}]}
  json = JSON.parse(json);
  var res = "";
  for (var i=0; i < json.rules.length; i++) {
    if (i > 0) res += " " + json.groupOp + " ";
    res += getCondition(json.rules[i]);
  }
  if (res.length == 0) res = "1=1";
  return res;
}

function getDBData(params) {
  var d = Q.defer();

  var sql = params.sql + " ";
  if (sql.toLowerCase().indexOf(" where ") < 0) sql += "where 1=1 ";
  if (params.filters && params.filters.length > 0) 
    sql += "and " + getConditions(params.filters) + " ";
  if (params.condition && params.condition.length > 0)
    sql += "and " + params.condition + " ";
  if (params.sidx && params.sidx.length > 0)
    sql += "order by " + params.sidx + " " + params.sord;

  db.runQuery(sql, []).then(
    function(rows){
      d.resolve(rows);
    },
    function(err) {
      d.reject(err);
    }
  );
  return d.promise;
}

exports.getGridData = function(params) {
  var d = Q.defer();
  getDBData(params).then(
    function(rows){
      try {
        var idcol = params.idcol;
        var cols = params.cols.split(',');
        var editable = ('true' === params.editable);
        var page = getInt(params.page, 1);
        var maxnof = getInt(params.rows, 0);
        var start = maxnof*(page-1);
        var  last = start+maxnof;
        if (last > rows.length) last = rows.length;

        var totpages = (rows.length > 0 ? parseInt(Math.floor(rows.length/maxnof))+1 : 0);

        var data = [];
        var sum = 0;
        for (var i=start; i < last; i++) {
          var id = (idcol ? rows[i][idcol]  : i);
          var nofcols = (editable ? cols.length+1 : cols.length);
          var coldata = [];
          if (editable) coldata.push("");
          for (var j=0; j < cols.length; j++) 
            coldata.push(rows[i][cols[j]]);
          if (params.sumcol && params.sumcol.length > 0)
            sum += rows[i][params.sumcol];
          data.push({
            id: id,
            cell: coldata
          });
        }
        var res = {page: page, total: totpages,records: rows.length, rows: data, sum:sum};
        d.resolve(res);
      }
      catch(e) {
        common.logMessage("getGridData 1", e);
        d.reject(e);
      }
    },
    function (err) {
      common.logMessage("getGridData 2", err);
      d.reject(err);
    }
  );
  return d.promise;
}
