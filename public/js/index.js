$(document).ready(function(){

  var customersxx = {};

  function init() {
    $.get('/getcustomers', {}, function(cust) {
      for (var i=0; i < cust.length; i++)
        customersxx[cust[i].value] = cust[i].label;
      initGrid();
    });
    $("#combotest").select2({
      placeholder: "Projekt",
      allowClear: true
    });
    $("#combotest2").select2({
      placeholder: "Projekt2",
      allowClear: true,
      createSearchChoice: function(term, data) {
        if ( 
          $(data).filter( function() {
            return this.text.localeCompare(term)===0;
          }).length === 0) {
          return {id:term, text:term};
        }
      },
      data:projData
    });
  }
    var src = {results:[{id:0,text:'aaa'}, {id:1,text:'bbb'}, {id:2,text:'xxx'}]};
    /*setTimeout(function(){
      src = {results:[{id:0,text:'111'}, {id:1,text:'222'}, {id:2,text:'333'}]};
    }, 5000);*/

  function projData() {
    return src;
  }

  function initGrid() {
    $("#timesgrid").jqGrid({
      url:'/gettimes',
      editurl:'/saveedittime',
      autowidth:true,
      postData: {
        idcol:"_id",
        cols:"id,customer,project,activity,description,startdate,starttime,endtime,elapsedtime"
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
                fillEditProjectsDropown($("#customer option:selected").text());
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
                fillEditActivitiesDropown($("#project option:selected").text());
              }
            }]
          }
        },
        {
          name:'activity', width:'10%', 
          sortable:true, editable:true, edittype:"select", editoptions:{value: "0:"}
        },
        {name:'description', width:'15%', sortable:true, editable:true },
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
        {name:'starttime', width:'5%', search:false, sortable:false, editable:true, formatter:'date', formatoptions:{srcformat: 'Y-m-d H:i:s', newformat: 'H:i' }},
        {name:'endtime', width:'5%', search:false, sortable:false, editable:true, sorttype:'date', formatter:'date', formatoptions:{srcformat: 'Y-m-d H:i:s', newformat: 'H:i' }},
        {name:'elapsedtime', width:'7%', search:false, sortable:true, editable:true, formatter:formatElapsed, unformat:unformatElapsed, 
          formoptions:{
            elmsuffix:'&nbsp;&nbsp;minuter'
          }
        }
      ],
      onSelectRow:function(rowid, status, e) {
        fillEditCustomersDropown();
      },
      datatype: "json",
      altRows:false,
      rowNum:10,
      rowList:[10,20,50,100],
      pager: '#timesctrl',
      sortname: 'id',
      viewrecords: true,
      height:'100%'
    //  forceFit:true,
      //shrinkToFit:false
    }).navGrid(
      '#timesctrl',
      {edit:true,add:false,del:false},
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

  function fillEditProjectsDropown(currcust) {
    var rowid = $("#timesgrid").jqGrid ('getGridParam', 'selrow');
    var currproj = $("#timesgrid").jqGrid("getCell", rowid, "project");
    $.get('/getprojects', {customer:currcust}, function(projects) {
      var sel = $("select#project").empty(); 
      for (var i=0; i < projects.length; i++) 
        sel.append("<option value='" + projects[i].value + "' role='option' " + (projects[i].label == currproj ? "selected" : "") + ">" + projects[i].label + "</option>");
      fillEditActivitiesDropown(currproj);
    });
  }

  function fillEditActivitiesDropown(currproj) {
    var rowid = $("#timesgrid").jqGrid ('getGridParam', 'selrow');
    var curract = $("#timesgrid").jqGrid("getCell", rowid, "activity");
    $.get('/getactivities', {project:currproj}, function(activities) {
      var sel = $("select#activity").empty(); 
      for (var i=0; i < activities.length; i++) 
        sel.append("<option value='" + activities[i].value + "' role='option' " + (activities[i].label == curract ? "selected" : "") + ">" + activities[i].label + "</option>");
    });
  }







  function customerList(value, options) {
    var el = $("<select />").append("<option>Deportivo</option>").append("<option>B</option>").append("<option>C</option>").val(value);
    return el.get(0);
  }

  function customerValue(elem, operation, value) {
    if (operation === "get")
      return $(elem).val();
    else if (operation === "set")
      return $(elem).val(value);
  }

  function setupAutoComplete(input, source, nextinput) {
    if (input.hasClass("ui-autocomplete-input"))
      input.autocomplete("destroy");
    input.keyup(function(){
      nextinput.val("");
    });
    input.combobox({
      source:source,
      minLength:0,
      select: function(){
        nextinput.val("");
      }
    }).click(function(e){
      var left = e.clientX - $(this).offset().left;
      if (left > $(this).outerWidth() - 20) {
        if ($("ul.ui-autocomplete").is(":visible"))
          $(this).autocomplete('close');
        else
          $(this).autocomplete('search', '');
      }
    });
  }

  function customerChanged(id) {
    $("#" + id + " td:nth-child(3) input").val("");
    var customer = $("#" + id + " td:nth-child(2) input").val();
    $.get('/getprojects', {customer:customer}, function(projects) {
      setupAutoComplete($("#" + id + " td:nth-child(3) input"), projects, function(projid){
        projectChanged(projid);
      });
    });
  }

  function projectChanged(id) {
    $("#" + id + " td:nth-child(4) input").val("");
    var project = $("#" + id + " td:nth-child(3) input").val();
    $.get('/getactivities', {project:project}, function(activities) {
      setupAutoComplete($("#" + id + " td:nth-child(4) input"), activities);
    });
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
