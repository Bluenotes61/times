$(document).ready(function(){

  var elapsedTimer = 0;

  /*** Info about the current activity ***/
  var activeActivity = {
    id : 0,
    customer : "",
    project : "",
    activity : "",
    activityid: 0,
    comment : "",
    starttime : null,
    pausedElapsed : 0,
    paused: false
  };

  /*** Create objects for dropdowns ***/
  var latestDDStart = getDDObject(".start .select2.latest", "Snabbval - Senaste aktiviteter", getLatestActivitiesData);
  var customersDDStart = getDDObject(".start .select2.customer", "Välj kund", getCustomersData);
  var projectsDDStart = getDDObject(".start .select2.project", "Välj projekt", getProjectsData);
  var activitiesDDStart = getDDObject(".start .select2.activity", "Välj aktivitet", getActivitiesData);
  var latestDDRegister = getDDObject(".register .select2.latest", "Snabbval - Senaste aktiviteter", getLatestActivitiesData);
  var customersDDRegister = getDDObject(".register .select2.customer", "Välj kund", getCustomersData);
  var projectsDDRegister = getDDObject(".register .select2.project", "Välj projekt", getProjectsData);
  var activitiesDDRegister = getDDObject(".register .select2.activity", "Välj aktivitet", getActivitiesData);


  function init() {

    setupSelectBoxes();

    $(".register .activitydate .adate").datepicker({dateFormat:'yy-mm-dd'});

    assignEvents();

    var now = new Date();
    var end = new Date(now.getTime() - now.getTimezoneOffset()*60000);
    var send = end.toISOString().replace(/T/, ' ').replace(/\..+/, '');
    var start = new Date(now.getTime() - now.getTimezoneOffset()*60000);
    start.setMonth(start.getMonth() - 1);
    var sstart = start.toISOString().replace(/T/, ' ').replace(/\..+/, '');

    $("#compilation input.from").val(sstart);
    $("#compilation input.to").val(send);
    $("#compilation input.from, #compilation input.to").change(function(){
      $("#compilationgrid").trigger("reloadGrid");
    }).datepicker({dateFormat:'yy-mm-dd'});
    $("#compilation .curruser").change(function(){
      if ($(this).val() == "_all_") $("#compilationgrid").showCol("user");
      else $("#compilationgrid").hideCol("user");
      $("#compilationgrid").trigger("reloadGrid");
    });

    initEndedGrid();
    initCompilationGrid();
    
    $(window).bind('resize', function() {
      $("#endedgrid, #compilationgrid").setGridWidth($(window).width() - 20);
    });

    getActiveActivity(function(){
      initActivityCounter();  
    });

    showLastActivity();
    
    setToday();
  }

  function setupSelectBoxes() {
    // Get initial data for the first dropdowns
    latestDDStart.refreshData();
    latestDDRegister.refreshData();
    customersDDStart.refreshData();
    customersDDRegister.refreshData();

    // Disable dropdowns
    projectsDDStart.select2("enable", false);
    activitiesDDStart.select2("enable", false);
    projectsDDRegister.select2("enable", false);
    activitiesDDRegister.select2("enable", false);

    // Change start quick selection propagates downwards
    latestDDStart.on("change", function(){
      if ($(this).select2("data") != null) {
        var vals = $(this).select2("data").id.split('|');
        customersDDStart.select2("val", vals[0]);
        projectsDDStart.select2("enable", true);
        projectsDDStart.refreshData(vals[0], function(){
          projectsDDStart.select2("val", vals[1]);
          activitiesDDStart.select2("enable", true);
          activitiesDDStart.refreshData(vals[1], function(){
            activitiesDDStart.select2("val", vals[2]);
          });
        });
        $(this).select2("data", null);
      }
    });

    // Change register quick selection propagates downwards
    latestDDRegister.on("change", function(){
      if ($(this).select2("data") != null) {
        var vals = $(this).select2("data").id.split('|');
        customersDDRegister.select2("val", vals[0]);
        projectsDDRegister.select2("enable", true);
        projectsDDRegister.refreshData(vals[0], function(){
          projectsDDRegister.select2("val", vals[1]);
          activitiesDDRegister.select2("enable", true);
          activitiesDDRegister.refreshData(vals[1], function(){
            activitiesDDRegister.select2("val", vals[2]);
          });
        });
        $(this).select2("data", null);
      }
    });

    // Change start customer. Refresh projects dropdown
    customersDDStart.on("change", function(){
      projectsDDStart.select2("data", null);
      activitiesDDStart.select2("data", null);
      activitiesDDStart.select2("enable", false);
      if ($(this).select2("data") == null) {
        projectsDDStart.select2("enable", false);
      }
      else {
        projectsDDStart.select2("enable", true);
        var id = $(this).select2("data").id;
        if (id == -1) { // Create new customer
          var name = $(this).select2("data").text;
          $.get('/createcustomer', {name:name}, function(response) {
            id = response.id;
            customersDDStart.refreshData();
            customersDDStart.select2("data", {id:id, text:name});
            customersDDRegister.refreshData();
            projectsDDStart.refreshData(id);
          });
        }
        else {
          projectsDDStart.refreshData(id);
        }
      }
    });

    // Change register customer. Refresh project dropdown
    customersDDRegister.on("change", function(){
      projectsDDRegister.select2("data", null);
      activitiesDDRegister.select2("data", null);
      activitiesDDRegister.select2("enable", false);
      if ($(this).select2("data") == null) {
        projectsDDRegister.select2("enable", false);
      }
      else {
        projectsDDRegister.select2("enable", true);
        var id = $(this).select2("data").id;
        if (id == -1) { // Create new customer
          var name = $(this).select2("data").text;
          $.get('/createcustomer', {name:name}, function(response) {
            id = response.id;
            customersDDRegister.refreshData();
            customersDDRegister.select2("data", {id:id, text:name});
            customersDDStart.refreshData();
            projectsDDRegister.refreshData(id);
          });
        }
        else {
          projectsDDRegister.refreshData(id);
        }
      }
    });

    // Change start project. Refresh activities dropdown
    projectsDDStart.on("change", function(){
      activitiesDDStart.select2("data", null);
      if ($(this).select2("data") == null) {
        activitiesDDStart.select2("enable", false);
      }
      else {
        activitiesDDStart.select2("enable", true);
        var id = $(this).select2("data").id;
        if (id == -1) { // Create new project
          var name = $(this).select2("data").text;
          var customerid = customersDDStart.select2("data").id;
          $.get('/createproject', {customerid:customerid, name:name}, function(response) {
            id = response.id;
            projectsDDStart.refreshData(customerid);
            projectsDDStart.select2("data", {id:id, text:name});
            activitiesDDStart.refreshData(id);
          });
        }
        else {
          activitiesDDStart.refreshData(id);
        }
      }
    });

    // Change register project. Refresh activities dropdown
    projectsDDRegister.on("change", function(){
      activitiesDDRegister.select2("data", null);
      if ($(this).select2("data") == null) {
        activitiesDDRegister.select2("enable", false);
      }
      else {
        activitiesDDRegister.select2("enable", true);
        var id = $(this).select2("data").id;
        if (id == -1) { // Create new project
          var name = $(this).select2("data").text;
          var customerid = customersDDRegister.select2("data").id;
          $.get('/createproject', {customerid:customerid, name:name}, function(response) {
            id = response.id;
            projectsDDRegister.refreshData(customerid);
            projectsDDRegister.select2("data", {id:id, text:name});
            activitiesDDRegister.refreshData(id);
          });
        }
        else {
          activitiesDDRegister.refreshData(id);
        }
      }
    });

    // Change start activity.
    activitiesDDStart.on("change", function(){
      if ($(this).select2("data") != null) {
        var id = $(this).select2("data").id;
        if (id == -1) { // Create new project
          var name = $(this).select2("data").text;
          var projectid = projectsDDStart.select2("data").id;
          $.get('/createactivity', {projectid:projectid, name:name}, function(response) {
            id = response.id;
            activitiesDDStart.refreshData(projectid);
            activitiesDDStart.select2("data", {id:id, text:name});
          });
        }
      }
    });

    // Change register activity.
    activitiesDDRegister.on("change", function(){
      if ($(this).select2("data") != null) {
        var id = $(this).select2("data").id;
        if (id == -1) { // Create new project
          var name = $(this).select2("data").text;
          var projectid = projectsDDRegister.select2("data").id;
          $.get('/createactivity', {projectid:projectid, name:name}, function(response) {
            id = response.id;
            activitiesDDRegister.refreshData(projectid);
            activitiesDDRegister.select2("data", {id:id, text:name});
          });
        }
      }
    });
  }


  /*** Functions for gettiing data for dropdowns */
  function getLatestActivitiesData(dummy, callback){
    $.get('/getlatestactivities', {}, function(response) {
      if (response.err) console.log(response.err);
      var latestData = [];
      for (var i=0; i < response.data.length; i++) {
        var val = response.data[i].cid + "|" + response.data[i].pid + "|" + response.data[i].aid;
        var text = response.data[i].cname + " / " + response.data[i].pname + " / " + response.data[i].aname;
        latestData.push({id:val, text: text});
      }
      callback(latestData);
    });
  }

  function getCustomersData(dummy, callback) {
    $.get('/getcustomers', {}, function(response) {
      if (response.err) console.log(response.err);
      var custData = [];
      for (var i=0; i < response.data.length; i++)
        custData.push({id:response.data[i].value, text:response.data[i].label});
      callback(custData);
    });
  }

  function getProjectsData(customerid, callback) {
    $.get('/getprojects', {customer: customerid}, function(response) {
      if (response.err) console.log(response.err);
      var projectsData = [];
      for (var i=0; i < response.data.length; i++)
        projectsData.push({id:response.data[i].value, text:response.data[i].label});
      callback(projectsData);
    });
  }

  function getActivitiesData(projectid, callback) {
    $.get('/getactivities', {project: projectid}, function(response) {
      if (response.err) console.log(response.err);
      var actData = [];
      for (var i=0; i < response.data.length; i++)
        actData.push({id:response.data[i].value, text:response.data[i].label});
      callback(actData);
    });
  }


  /*** Assign events to html items ***/
  function assignEvents() {

    // Tab clicks
    $("#tabs a.active").click(function(){
      setToday();
      $("#tabs a").removeClass("active");
      $(this).addClass("active");
      $("div.page").hide();
      $("#booking").show();
    });
    $("#tabs a.ended").click(function(){
      $("#tabs a").removeClass("active");
      $(this).addClass("active");
      $("div.page").hide();
      $("#ended").show();
    });
    $("#tabs a.compilation").click(function(){
      $("#tabs a").removeClass("active");
      $(this).addClass("active");
      $("div.page").hide();
      $("#compilation").show();
    });


    // Delete currently selected customer. Assigned to both customer dropdown delete buttons
    $(".bookform .delcustomer").click(function(){
      var parent = $(this).parent().parent();
      var customersDD = (parent.hasClass("start") ? customersDDStart : customersDDRegister);
      var projectsDD = (parent.hasClass("start") ? projectsDDStart : projectsDDRegister);
      var activitiesDD = (parent.hasClass("start") ? activitiesDDStart : activitiesDDRegister);
      if (customersDD.select2("data") != null) {
        var name = customersDD.select2("data").text;
        if (confirm("Är du säker på att du vill ta bort kunden " + name + " från databasen?")) {
          var id = customersDD.select2("data").id;
          $.get('/deletecustomer', {customerid: id}, function() {
            customersDDStart.refreshData();
            customersDDRegister.refreshData();
            customersDD.select2("data", null);
            projectsDD.select2("data", null);
            activitiesDD.select2("data", null);
            projectsDD.select2("enable", false);
            activitiesDD.select2("enable", false);
          });
        }
      }
    });

    // Delete currently selected project. Assigned to both project dropdown delete buttons
    $(".start .delproject").click(function(){
      var parent = $(this).parent().parent();
      var customersDD = (parent.hasClass("start") ? customersDDStart : customersDDRegister);
      var projectsDD = (parent.hasClass("start") ? projectsDDStart : projectsDDRegister);
      var activitiesDD = (parent.hasClass("start") ? activitiesDDStart : activitiesDDRegister);
      if (projectsDD.select2("data") != null) {
        var name = projectsDD.select2("data").text;
        if (confirm("Är du säker på att du vill ta bort projektet " + name + " från databasen?")) {
          var id = projectsDD.select2("data").id;
          $.get('/deleteproject', {projectid: id}, function() {
            var customerid = customersDD.select2("data").id;
            projectsDD.refreshData(customerid);
            projectsDD.select2("data", null);
            activitiesDD.select2("data", null);
            activitiesDD.select2("enable", false);
          });
        }
      }
    });

    // Delete currently selected activity. Assigned to both activity dropdown delete buttons
    $(".start .delactivity").click(function(){
      var parent = $(this).parent().parent();
      var projectsDD = (parent.hasClass("start") ? projectsDDStart : projectsDDRegister);
      var activitiesDD = (parent.hasClass("start") ? activitiesDDStart : activitiesDDRegister);
      if (activitiesDD.select2("data") != null) {
        var name = activitiesDD.select2("data").text;
        if (confirm("Är du säker på att du vill ta bort aktivitieten " + name + " från databasen?")) {
          var id = activitiesDD.select2("data").id;
          $.get('/deleteactivity', {activityid: id}, function() {
            var projectid = projectsDD.select2("data").id;
            activitiesDD.refreshData(projectid);
            activitiesDD.select2("data", null);
          });
        }
      }
    });

    // Start and stop buttons
    $(".startbuttons .open").click(function(){
      var now = new Date();
      $(".startbuttons .starttime .hours").val(now.getHours());
      $(".startbuttons .starttime .minutes").val(now.getMinutes());
      $(".startbuttons .starttime").slideToggle();
    });
    $(".startbuttons .starttime .start").click(function(){
      startActivity();
      $(".startbuttons .starttime").slideUp();
    });

    $(".stopbuttons .open").click(function(){
      var now = new Date();
      $(".stopbuttons .stoptime .hours").val(now.getHours());
      $(".stopbuttons .stoptime .minutes").val(now.getMinutes());
      $(".stopbuttons .stoptime").slideToggle();
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

    $(".regbuttons .register").click(function(){
      registerActivity();
    });
  }

  /*** Stops any active activity and starts the selected activity ***/
  /*** If no activity is selected a blank activity for the selected project is started ***/
  function startActivity() {
    if (customersDDStart.select2("data") == null) {
      return errorOn(customersDDStart.select2("container"));
    }
    if (projectsDDStart.select2("data") == null) {
      return errorOn(projectsDDStart.select2("container"));
    }
    stopActivity(new Date(), function(){
      var starttime = new Date();
      var hours = $("div.start .starttime .hours").val();
      var mins = $("div.start .starttime .minutes").val();
      starttime.setHours(hours);
      starttime.setMinutes(mins);
      activeActivity.customer = customersDDStart.select2("data").text;
      activeActivity.project = projectsDDStart.select2("data").text;
      if (activitiesDDStart.select2("data") == null) {
        activeActivity.activityid = 0;
        activeActivity.activity = "";
      }
      else {
        activeActivity.activityid = activitiesDDStart.select2("data").id;
        activeActivity.activity = activitiesDDStart.select2("data").text;
      }
      activeActivity.comment = $("div.start .comment").val();
      activeActivity.starttime = starttime;
      activeActivity.pausedElapsed = 0;
      $.get('/startactivity', {
        projectid: projectsDDStart.select2("data").id,
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

  /*** Stops the currently active activity ***/
  function stopActivity(stoptime, callback) {
    if (activeActivity.id != 0) {
      $.get('/stopactivity', {id:activeActivity.id, starttime:activeActivity.starttime, stoptime:stoptime, paused:0}, function() {

        clearInterval(elapsedTimer);
        $("#booking .active .stopnuttons .pause").show();
        $("#booking .active .stopnuttons .restart").hide();
        $("#endedgrid").trigger("reloadGrid"); 
        activeActivity.id = 0;

        latestDDStart.refreshData();
        latestDDRegister.refreshData();

        initActivityCounter();

        showLastActivity();

        if (callback) callback();
      });
    }
    else if (callback) {
      callback();
    }
  }

  /*** Pauses the currently active activity ***/
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

  /*** Restarts a paused activity ***/
  function restartActivity() {
    activeActivity.starttime = new Date();
    $.get('/startactivity', {
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

  /*** Registers elapsed time for the selected activity ***/
  function registerActivity() {
    if (customersDDRegister.select2("data") == null) {
      return errorOn(customersDDRegister.select2("container"));
    }
    if (projectsDDRegister.select2("data") == null) {
      return errorOn(projectsDDRegister.select2("container"));
    }
    var adate = $(".register .activitydate .adate").val();
    if (adate.length == 0) {
      return errorOn(".register .activitydate .adate");
    }
    var hours = $(".register .elapsed .hours").val();
    var minutes = $(".register .elapsed .minutes").val();
    if (!$.isNumeric(hours) && !$.isNumeric(minutes)) {
      return errorOn(".register .activitydate .elapsed input");
    }
    if (hours.length > 0 && !$.isNumeric(hours)) {
      return errorOn(".register .elapsed .hours");
    }
    if (minutes.length > 0 && !$.isNumeric(minutes)) {
      return errorOn(".register .elapsed .minutes");
    }

    var projectid = projectsDDRegister.select2("data").id;
    var activityid = (activitiesDDRegister.select2("data") ? activitiesDDRegister.select2("data").id : 0);
    var comment = $(".register .comment").val();
    $.get('/registeractivity', {
      projectid: projectid, 
      activityid: activityid, 
      comment: comment, 
      activitydate: adate,
      hours: hours,
      minutes: minutes
    }, function(response) {
      if (!response.err) {
        $("#endedgrid").trigger("reloadGrid"); 
        latestDDStart.refreshData();
        latestDDRegister.refreshData();
        customersDDRegister.select2("data", null);
        projectsDDRegister.select2("data", null);
        activitiesDDRegister.select2("data", null);
        $(".register .comment").val("");
        $(".register .adate").val("");
        $(".register .hours").val("");
        $(".register .minutes").val("");
        $(".regbuttons .register").text("Aktivitet registrerad");
        setTimeout(function(){
          $(".regbuttons .register").text("Registrera");
        }, 3000);
        showLastActivity();
      }
    });
  }


  /*** Shows the active or paused activity and starts the timer for elapsed time ***/
  function initActivityCounter() {
    if (activeActivity.id != 0) {
      $("#booking .active").show();
      $("#booking .start").hide();
      $("#booking .active .customer").text(activeActivity.customer);
      $("#booking .active .project").text(activeActivity.project);
      $("#booking .active .activity").text(activeActivity.activity);
      $("#booking .active .comment").text(activeActivity.comment);
      if (activeActivity.paused) { 
        $("#booking .active .starttime").text("");
        $("#booking .active .headline").text("Pausad aktivitet");
        $("#booking .active .stopbuttons .pause").hide();
        $("#booking .active .stopbuttons .restart").show();
      }
      else {
        var h = String(activeActivity.starttime.getHours());
        if (h.length < 2) h = "0" + h;
        var m = String(activeActivity.starttime.getMinutes());
        if (m.length < 2) m = "0" + m;
        $("#booking .active .starttime").text(h + ":" + m);
        $("#booking .active .headline").text("Aktiv aktivitet");
        $("#booking .active .stopbuttons .pause").show();
        $("#booking .active .stopbuttons .restart").hide();
      }
      showElapsed();
      elapsedTimer = setInterval(showElapsed, 30000);
    }
    else {
      $("#booking .active").hide();
      $("#booking .start").show();
    }
  }

  /*** Gets the currently active activity from the database. Called att page load ***/
  function getActiveActivity(callback) {
    $.get("/getactiveactivity", {}, function(response) {
      if (response) {
        activeActivity.id = response.id;
        activeActivity.customer = response.customer;
        activeActivity.project = response.project;
        activeActivity.activity = response.activity;
        activeActivity.activityid = response.aid;
        activeActivity.comment = response.comment;
        activeActivity.starttime = new Date(response.starttime);
        activeActivity.pausedElapsed = response.pausedElapsed;
        activeActivity.paused = response.paused;
      }
      else
        activeActivity.id = 0;
      callback();
    });
  }


  /*** Show last registered activity ***/
  function showLastActivity() {
    $.get("/getlastactivity", {}, function(response) {
      $("#booking .last .customer").text(response.customer);
      $("#booking .last .project").text(response.project);
      $("#booking .last .activity").text(response.activity);
      $("#booking .last .comment").text(response.comment);
      $("#booking .last .starttime").text(response.starttime);
      $("#booking .last .elapsed").text(formatElapsed(response.elapsedtime));
    });
  }

  /*** Show elapsed time for active activity ***/
  function showElapsed() {
    var minutes = activeActivity.pausedElapsed;
    if (!activeActivity.paused) 
      minutes += Math.floor((new Date() - activeActivity.starttime)/60000);
    while (minutes < 0)
      minutes += 24*60;
    $("#booking .active .elapsed").text(formatElapsed(minutes));
  }

  /*** Format minutes to h:m format ***/
  function formatElapsed(minutes) {
    var h = Math.floor(minutes/60);
    var m = minutes - h*60;
    return h + " tim " + m + " min";
  }

  /*** Returns a jQuery object with attached data array and refreshing function ***/
  function getDDObject(selector, placeholder, getDataFunc) {
    var dd = $(selector);
    dd.val("");
    dd.listData = [];
    dd.refreshData = function(param, callback){
      getDataFunc(param, function(data){
        dd.listData = data;
        if (callback) callback();
      });
    };
    dd.select2({
      placeholder:placeholder,
      createSearchChoice: function(term) { 
        return { id: -1, text:term }
      },
      allowClear:true,
      data: function() { 
        return {results: dd.listData}; 
      }
    });
    return dd;
  }

  /*** Sets and removes error class on an item ***/
  function errorOn(sel) {
    $(sel).addClass("error");
    setTimeout(function(){
      $(sel).removeClass("error");
    }, 3000);
    return false;
  }

  function setToday() {
    function addZero(val) {
      if (String(val).length < 2) return "0" + val;
      else return val;
    }
    var now = new Date();
    var datestr = now.getFullYear() + "-" + addZero(now.getMonth()+1) + "-" + addZero(now.getDate());
    $(".register .activitydate .adate").val(datestr);
  }
  
  /*** Functions for ended grid ***/

  /*** Initialize jqgrid showing finished activities ***/
  function initEndedGrid() {
    $("#endedgrid").jqGrid({
      url:'/getendedtimes',
      editurl:'/saveedittime',
      postData: {
        idcol:"_id",
        cols:"id,customer,project,activity,comment,startdate,starttime,elapsedtime"
      },
      colNames: ['','Kund', 'Projekt', 'Aktivitet', 'Beskrivning', 'Datum', 'Starttid', 'Tidsåtgång'],
      colModel:[
        {name:'id', hidden:true, width:0 },
        {
          name:'customer', width:8,
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
          name:'project', width:10,
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
          name:'activity', width:10,
          sortable:true, editable:true, edittype:"select", editoptions:{value: "0:"}
        },
        {name:'comment', width:20, sortable:true, editable:true, edittype:'textarea' },
        {name:'startdate', width:8,
          editoptions: {
            dataInit: function(elem) {
              $(elem).datepicker({dateFormat:'yy-mm-dd'});
            }
          },
          sortable:true, editable:true, formatter:'date',
          formatoptions:{srcformat: 'Y-m-d H:i:s', newformat: 'Y-m-d' }
        },
        {
          name:'starttime', width:5, 
          search:false, sortable:false, editable:true, 
          sorttype:'date', formatter:'date', formatoptions:{srcformat: 'Y-m-d H:i:s', newformat: 'H:i' }
        },
        {
          name:'elapsedtime', width:7, 
          search:false, sortable:true, editable:true, 
          formatter:formatElapsed, unformat:unformatElapsed, formoptions:{elmsuffix:'&nbsp;&nbsp;minuter'}
        }
      ],
      datatype: "json",
      altRows:false,
      rowNum:20,
      rowList:[10,20,50,100],
      pager: '#endedctrl',
      sortname: 'id',
      height:'100%',
      width:$(window).width() - 20,
      viewrecords: true
    }).navGrid(
      '#endedctrl',
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

  /*** Functions called from the endedgrid filling the dropdowns in edit mode ***/
  function fillEditCustomersDropown() {
    var rowid = $("#endedgrid").jqGrid ('getGridParam', 'selrow');
    var currcust = $("#endedgrid").jqGrid("getCell", rowid, "customer");
    $.get('/getcustomers', {}, function(response) {
      var sel = $("select#customer").empty();
      for (var i=0; i < response.data.length; i++)
        sel.append("<option value='" + response.data[i].value + "' role='option' " + (response.data[i].label == currcust ? "selected" : "") + ">" + response.data[i].label + "</option>");
      fillEditProjectsDropown(currcust);
    });
  }

  function fillEditProjectsDropown(currcust, changed) {
    var rowid = $("#endedgrid").jqGrid ('getGridParam', 'selrow');
    var currproj = (changed ? "" : $("#endedgrid").jqGrid("getCell", rowid, "project"));
    $.get('/getprojects?byname=1', {customer:currcust}, function(response) {
      var sel = $("select#project").empty();
      for (var i=0; i < response.data.length; i++)
        sel.append("<option value='" + response.data[i].value + "' role='option' " + (response.data[i].label == currproj ? "selected" : "") + ">" + response.data[i].label + "</option>");
      fillEditActivitiesDropown(currproj, changed);
    });
  }

  function fillEditActivitiesDropown(currproj, changed) {
    var rowid = $("#endedgrid").jqGrid ('getGridParam', 'selrow');
    var curract = (changed ? "" : $("#endedgrid").jqGrid("getCell", rowid, "activity"));
    $.get('/getactivities?byname=1', {project:currproj}, function(response) {
      var sel = $("select#activity").empty();
      for (var i=0; i < response.data.length; i++)
        sel.append("<option value='" + response.data[i].value + "' role='option' " + (response.data[i].label == curract ? "selected" : "") + ">" + response.data[i].label + "</option>");
    });
  }

  /*** Called from the endedgrid. Formats/unformats elapsed time ***/
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


  /*** Initialize jqgrid showing finished activities ***/
  function initCompilationGrid() {
    $("#compilationgrid").jqGrid({
      url:"/getcompilationtimes",
      postData: {
        idcol:"_id",
        cols:"customer,project,activity,comment,user,elapsedtime"
      },
      colNames: ['Kund', 'Projekt', 'Aktivitet', 'Beskrivning', 'Användare', 'Tidsåtgång'],
      colModel:[
        { name:'customer', width:10, sortable:true },
        { name:'project', width:10, sortable:true },
        { name:'activity', width:10, sortable:true },
        { name:'comment', width:15, sortable:true },
        { name:'user', width:8, sortable:true, hidden:true },
        { name:'elapsedtime', width:7, search:false, sortable:true, formatter:formatElapsed }
      ],
      datatype: "json",
      altRows:false,
      rowNum:10,
      rowList:[10,20,50,100],
      pager: '#compilationctrl',
      sortname: 'customer',
      footerrow: true,
      userDataOnFooter:true,
      height:'100%',
      width:$(window).width()-20,
      viewrecords: true,
      postData:{
        cols: 'customer,project,activity,comment,user,elapsedtime',
        from: function(){ return $("#compilation input.from").val(); },
        to: function(){ return $("#compilation input.to").val(); },
        userguid: function(){ return $("#compilation .curruser").val(); }
      }
    }).navGrid(
      '#compilationctrl',
      {edit:false,add:false,del:false},{},{},{},
      {multipleSearch:true}
    ).filterToolbar();
  }


  init();

});
