$(document).ready(function(){

  var elapsedTimer = 0;
  var activeActivity = {
    id : 0,
    customer : "",
    customerid : 0,
    project : "",
    projectid: 0,
    activity : "",
    activityid: 0,
    comment : "",
    starttime : null,
    pausedElapsed : 0,
    paused: false
  };

  function init() {

    // Fill customer dropdowns
    $.get('/getcustomers', {}, function(cust) {
      var custsel = $("#booking .bookform select.customer");
      custsel.append ("<option></option>");
      for (var i=0; i < cust.length; i++)
        custsel.append ("<option value='" + cust[i].value + "'>" + cust[i].label + "</option>");
    });

    $(".register .activitydate .adate").datepicker({dateFormat:'yy-mm-dd'});

    assignEvents();

    initGrid();
    
    getLatestActivities();

    getActiveActivity(function(){
      initActivityCounter();  
    });
    
  }

  function assignEvents() {
    $("#booking .bookform select.customer").on("change", function(){
      fillProjectDD($(this));
    });
    $("#booking .bookform select.project").on("change", function(){
      fillActivityDD($(this));
    });

    $(".startbuttons .open").click(function(){
      var now = new Date();
      $(".startbuttons .starttime .hours").val(now.getHours());
      $(".startbuttons .starttime .minutes").val(now.getMinutes());
      $(".startbuttons .starttime").slideDown();
    });
    $(".startbuttons .starttime .cancel").click(function(){
      $(".startbuttons .starttime").slideUp();
    });
    $(".startbuttons .starttime .start").click(function(){
      startActivity();
      $(".startbuttons .starttime").slideUp();
    });

    $(".stopbuttons .open").click(function(){
      var now = new Date();
      $(".stopbuttons .stoptime .hours").val(now.getHours());
      $(".stopbuttons .stoptime .minutes").val(now.getMinutes());
      $(".stopbuttons .stoptime").slideDown();
    });
    $(".stopbuttons .stoptime .cancel").click(function(){
      $(".stopbuttons .stoptime").slideUp();
    });
    $(".stopbuttons .stoptime .stop").click(function(){
      var stoptime = new Date();
      var hours = $("div.active .stoptime .hours").val();
      var mins = $("div.active .stoptime .minutes").val();
      stoptime.setHours(hours);
      stoptime.setMinutes(mins);
      stopActivity(stoptime); 
      $(".stopbuttons .stoptime").slideUp();
    });
    $(".stopbuttons .pause").click(function(){
      pauseActivity(); 
    });
    $(".stopbuttons .restart").click(function(){
      restartActivity();
    });

    $("#booking .bookform select.latest").change(function(){
      if ($(this).val() != "0") {
        var vals = $(this).val().split('|');
        var customerDD = $(this).parent().parent().find("select.customer");
        var projectDD = $(this).parent().parent().find("select.project");
        var activityDD = $(this).parent().parent().find("select.activity");
        customerDD.val(vals[0]);
        fillProjectDD(customerDD, function(){
          projectDD.val(vals[1]);
          fillActivityDD(projectDD, function(){
            activityDD.val(vals[2]);
          });
        });
        $(this).val("0");
      }
    });

    $(".regbuttons .register").click(function(){
      registerActivity();
    });
  }

  function fillProjectDD(customerDD, callback) {
    $.get('/getprojects', {customer: customerDD.val()}, function(projects) {
      var projectDD = customerDD.parent().parent().find("select.project");
      var activityDD = customerDD.parent().parent().find("select.activity");
      projectDD.empty().append("<option></option>");
      activityDD.empty().append("<option></option>");
      for (var i=0; i < projects.length; i++)
        projectDD.append ("<option value='" + projects[i].value + "'>" + projects[i].label + "</option>");
      if (callback) callback();
    });
  }

  function fillActivityDD(projectDD, callback) {
    $.get('/getactivities', {project: projectDD.val()}, function(activities) {
      var activityDD = projectDD.parent().parent().find("select.activity");
      activityDD.empty().append("<option></option>");
      for (var i=0; i < activities.length; i++)
        activityDD.append ("<option value='" + activities[i].value + "'>" + activities[i].label + "</option>");
      if (callback) callback();
    });
  }

  function getLatestActivities(){
    $.get('/getlatestactivities', {}, function(rows) {
      var options = "<option value='0'></option>";
      for (var i=0; i < rows.length; i++) {
        var val = rows[i].cid + "|" + rows[i].pid + "|" + rows[i].aid;
        var text = rows[i].cname + " / " + rows[i].pname + " / " + rows[i].aname;
        options += "<option value='" + val + "'>" + text + "</option>";
      }
      $("#booking .bookform select.latest").html(options);
    });
  }

  function startActivity() {
    stopActivity(new Date(), function(){
      var starttime = new Date();
      var hours = $("div.start .starttime .hours").val();
      var mins = $("div.start .starttime .minutes").val();
      starttime.setHours(hours);
      starttime.setMinutes(mins);
      activeActivity.customerid = $("div.start .customer").val();
      activeActivity.customer = $("div.start .customer option:selected").text();
      activeActivity.projectid = $("div.start .project").val();
      activeActivity.project = $("div.start .project option:selected").text();
      activeActivity.activityid = $("div.start .activity").val();
      activeActivity.activity = $("div.start .activity option:selected").text();
      activeActivity.comment = $("div.start .comment").val();
      activeActivity.starttime = starttime;
      activeActivity.pausedElapsed = 0;
      $.get('/startactivity', {
        customerid: activeActivity.customerid, 
        projectid: activeActivity.projectid, 
        activityid: activeActivity.activityid, 
        comment: activeActivity.comment, 
        starttime: starttime
      }, function(response) {
        activeActivity.id = response.newid;
        initActivityCounter();
        $(".stopbuttons .stoptime").slideUp();
      });
    });
  }

  function initActivityCounter() {
    if (activeActivity.id != 0) {
      $("#booking .active .customer").text(activeActivity.customer);
      $("#booking .active .project").text(activeActivity.project);
      $("#booking .active .activity").text(activeActivity.activity);
      $("#booking .active .comment").text(activeActivity.comment);
      $("#booking .active .isactive").show();
      $("#booking .active .isnotactive").hide();
      if (activeActivity.paused) { 
        $("#booking .active .starttime").text("");
        $("#booking .active .headline").text("Pausad aktivitet");
        $("#booking .active .stopbuttons .pause").hide();
        $("#booking .active .stopbuttons .restart").show();
      }
      else {
        $("#booking .active .starttime").text(getTimeString(activeActivity.starttime));
        $("#booking .active .headline").text("Aktiv aktivitet");
        $("#booking .active .stopbuttons .pause").show();
        $("#booking .active .stopbuttons .restart").hide();
      }
      showElapsed();
      elapsedTimer = setInterval(showElapsed, 30000);
    }
  }

  function getActiveActivity(callback) {
    $.get("/getactiveactivity", {}, function(response) {
      if (response) {
        activeActivity.id = response.id;
        activeActivity.customer = response.customer;
        activeActivity.customerid = response.cid;
        activeActivity.project = response.project;
        activeActivity.projectid = response.pid;
        activeActivity.activity = response.activity;
        activeActivity.activityid = response.aid;
        activeActivity.comment = response.comment;
        activeActivity.starttime = new Date(response.starttime);
        activeActivity.pausedElapsed = response.pausedElapsed;
        activeActivity.paused = response.pausedElapsed > 0;
      }
      else
        activeActivity.id = 0;
      callback();
    });
  }

  function stopActivity(stoptime, callback) {
    if (activeActivity.id != 0) {
      $.get('/stopactivity', {id:activeActivity.id, starttime:activeActivity.starttime, stoptime:stoptime, paused:0}, function() {

        clearInterval(elapsedTimer);
        $("#booking .active .isactive").hide();
        $("#booking .active .isnotactive").show();
        $("#booking .active .stopnuttons .pause").show();
        $("#booking .active .stopnuttons .restart").hide();
        $("#timesgrid").trigger("reloadGrid"); 
        activeActivity.id = 0;

        getLatestActivities();

        if (callback) callback();
      });
    }
    else if (callback) {
      callback();
    }
  }

  function pauseActivity() {
    if (activeActivity.id != 0) {
      var stoptime = new Date();
      $.get('/stopactivity', {id:activeActivity.id, starttime:activeActivity.starttime, stoptime:stoptime, paused:1}, function(response) {
        clearInterval(elapsedTimer);
        $("#booking .active .stopnuttons .pause").hide();
        $("#booking .active .stopnuttons .restart").show();
        activeActivity.pausedElapsed += response.elapsed;
        activeActivity.paused = true;
        initActivityCounter();
      });
    }
  }

  function restartActivity() {
    activeActivity.starttime = new Date();
    $.get('/startactivity', {
      customerid: activeActivity.customerid, 
      projectid: activeActivity.projectid, 
      activityid: activeActivity.activityid, 
      comment: activeActivity.comment, 
      starttime: activeActivity.starttime
    }, function(response) {
      activeActivity.id = response.newid;
      activeActivity.paused = false;
      activeActivity.pausedElapsed = response.elapsed;
      initActivityCounter();
    });
  }

  function registerActivity() {
    var customerid = $(".register select.customer").val();
    var projectid = $(".register select.project").val();
    var activityid = $(".register select.activity").val();
    var comment = $(".register .comment").val();
    var adate = $(".register .activitydate .adate").val();
    var hours = $(".register .elapsed .hours").val();
    var minutes = $(".register .elapsed .minutes").val();
    $.get('/registeractivity', {
      customerid: customerid, 
      projectid: projectid, 
      activityid: activityid, 
      comment: comment, 
      activitydate: adate,
      hours: hours,
      minutes: minutes
    }, function(response) {
      $("#timesgrid").trigger("reloadGrid"); 
      getLatestActivities();
    });
  }

  function showElapsed() {
    var minutes = activeActivity.pausedElapsed;
    if (!activeActivity.paused) 
      minutes += Math.floor((new Date() - activeActivity.starttime)/60000);
    $("#booking .active .elapsed").text(getElapsedString(minutes));
  }

  function getElapsedMinutes(start, end) {
    var s = start.split(':');
    var e = end.split(':');
    var elapsed = 0;
    if (s.length > 1 && e.length > 1) {
      var sh = parseInt(s[0], 10);
      var sm = parseInt(s[1], 10);
      var eh = parseInt(e[0], 10);
      var em = parseInt(e[1], 10);
      if (!(isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em))) {
        if (sh > eh) eh += 24;
        elapsed = (eh-sh)*60 + (em - sm);
      }
    }
    return elapsed;
  }

  function getElapsedString(minutes) {
    var h = Math.floor(minutes/60);
    var m = minutes - h*60;
    return h + " tim " + m + " min";
  }

  function getTimeString(atime) {
    var h = String(atime.getHours());
    if (h.length < 2) h = "0" + h;
    var m = String(atime.getMinutes());
    if (m.length < 2) m = "0" + m;
    return h + ":" + m;
  }

  function fillEditCustomersDropown() {
    var rowid = $("#timesgrid").jqGrid ('getGridParam', 'selrow');
    var currcust = $("#timesgrid").jqGrid("getCell", rowid, "customer");
    $.get('/getcustomers', {}, function(customers) {
      var sel = $("select#customer").empty();
      for (var i=0; i < customers.length; i++)
        sel.append("<option value='" + customers[i].value + "' role='option' " + (customers[i].label == currcust ? "selected" : "") + ">" + customers[i].label + "</option>");
      fillEditProjectsDropown(currcust);
    });
  }

  function fillEditProjectsDropown(currcust, changed) {
    var rowid = $("#timesgrid").jqGrid ('getGridParam', 'selrow');
    var currproj = (changed ? "" : $("#timesgrid").jqGrid("getCell", rowid, "project"));
    $.get('/getprojects?byname=1', {customer:currcust}, function(projects) {
      var sel = $("select#project").empty();
      for (var i=0; i < projects.length; i++)
        sel.append("<option value='" + projects[i].value + "' role='option' " + (projects[i].label == currproj ? "selected" : "") + ">" + projects[i].label + "</option>");
      fillEditActivitiesDropown(currproj, changed);
    });
  }

  function fillEditActivitiesDropown(currproj, changed) {
    var rowid = $("#timesgrid").jqGrid ('getGridParam', 'selrow');
    var curract = (changed ? "" : $("#timesgrid").jqGrid("getCell", rowid, "activity"));
    $.get('/getactivities?byname=1', {project:currproj}, function(activities) {
      var sel = $("select#activity").empty();
      for (var i=0; i < activities.length; i++)
        sel.append("<option value='" + activities[i].value + "' role='option' " + (activities[i].label == curract ? "selected" : "") + ">" + activities[i].label + "</option>");
    });
  }




  function initGrid() {
    $("#timesgrid").jqGrid({
      url:'/gettimes',
      editurl:'/saveedittime',
      autowidth:true,
      postData: {
        idcol:"_id",
        cols:"id,customer,project,activity,comment,startdate,starttime,endtime,elapsedtime"
      },
      colNames: ['','Kund', 'Projekt', 'Aktivitet', 'Beskrivning', 'Datum', 'Starttid', 'Sluttid', 'Tidsåtgång'],
      colModel:[
        {name:'id', hidden:true },
        {
          name:'customer', width:'10%',
          sortable:true, editable:true, edittype:"select",
          editoptions: {
            value: "0:",
            dataEvents: [{
              type:"change",
              fn: function(){
                fillEditProjectsDropown($("#customer option:selected").text(), true);
              }
            }]
          }
        },
        {
          name:'project', width:'10%',
          sortable:true, editable:true, edittype:"select",
          editoptions: {
            value: "0:",
            dataEvents: [{
              type:"change",
              fn: function(){
                fillEditActivitiesDropown($("#project option:selected").text(), true);
              }
            }]
          }
        },
        {
          name:'activity', width:'10%',
          sortable:true, editable:true, edittype:"select", editoptions:{value: "0:"}
        },
        {name:'comment', width:'15%', sortable:true, editable:true, edittype:'textarea' },
        {name:'startdate', width:'5%',
          searchoptions:{
            dataInit: function(elem) {
              $(elem).datepicker({dateFormat:'yy-mm-dd'});
            }
          },
          editoptions: {
            dataInit: function(elem) {
              $(elem).datepicker({dateFormat:'yy-mm-dd'});
            }
          },
          sortable:true, editable:true, formatter:'date',
          formatoptions:{srcformat: 'Y-m-d H:i:s', newformat: 'Y-m-d' }
        },
        {
          name:'starttime', width:'5%', 
          search:false, sortable:false, editable:true, 
          sorttype:'date', formatter:'date', formatoptions:{srcformat: 'Y-m-d H:i:s', newformat: 'H:i' },
          editoptions:{
            dataEvents: [{
              type:"change",
              fn: function(){
                $("#elapsedtime").val(getElapsedMinutes($("#starttime").val(), $("#endtime").val()).min);
              }
            }]
          }
        },
        {
          name:'endtime', width:'5%', 
          search:false, sortable:false, editable:true, 
          sorttype:'date', formatter:'date', formatoptions:{srcformat: 'Y-m-d H:i:s', newformat: 'H:i' },
          editoptions:{
            dataEvents: [{
              type:"change",
              fn: function(){
                $("#elapsedtime").val(getElapsedMinutes($("#starttime").val(), $("#endtime").val()).min);
              }
            }]
          }
        },
        {
          name:'elapsedtime', width:'7%', 
          search:false, sortable:true, editable:true, 
          formatter:formatElapsed, unformat:unformatElapsed, formoptions:{elmsuffix:'&nbsp;&nbsp;minuter'},
          editoptions:{
            dataEvents: [{
              type:"change",
              fn: function(){
                $("#starttime").val("");
                $("#endtime").val("");
              }
            }]
          }
        }
      ],
      datatype: "json",
      altRows:false,
      rowNum:10,
      rowList:[10,20,50,100],
      pager: '#timesctrl',
      sortname: 'id',
      viewrecords: true,
      width:'100%',
      height:'100%',
      forceFit:true,
      shrinkToFit:true
    }).navGrid(
      '#timesctrl',
      {edit:true,add:false,del:true},
      {
        onInitializeForm: function(){
          fillEditCustomersDropown();
        },
        width:"auto"
      },
      {},
      {},
      {multipleSearch:true}
    ).filterToolbar();
  }

  function formatElapsed(cellValue, options, rowObject) {
      var h = parseInt(cellValue/60);
    var min = cellValue - h*60;
    return h + " tim " + min + " min";
  }
  function unformatElapsed(cellValue, options, rowObject) {
    var vals = cellValue.split(' ');
    if (vals.length > 3)
      return parseInt(vals[0], 10)*60 + parseInt(vals[2], 10);
    else
      return 0;
  }


  init();

});
