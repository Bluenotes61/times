$(document).ready(function(){

  function init() {
    initGrid();
  }

  function initGrid() {
    $("#timesgrid").jqGrid({
      url:'/gettimes',
      autowidth:true,
      postData: {
        idcol:"_id",
        cols:"_id,activity.project.customer.name,activity.project.name,activity.name,description,starttime,endtime,elapsedtime"
      },
      colNames: ['','Kund', 'Projekt', 'Aktivitet', 'Beskrivning', 'Starttid', 'Sluttid', 'Tidsåtgång'],
      colModel:[
        {name:'_id', hidden:true },
        {name:'activity.project.customer.name', search:true, width:'150px', sortable:true, editable:false },
        {name:'activity.project.name', width:'150px', sortable:true, editable:false },
        {name:'activity.name', width:'150px', sortable:true, editable:false },
        {name:'description', width:'150px', sortable:true, editable:false },
        {name:'starttime', width:'107px', sortable:true, editable:false, sorttype:'date', formatoptions:{srcformat: 'Y-m-d H:i:s', newformat: 'n/j/Y g:i A' }},
        {name:'endtime', width:'170px', sortable:true, editable:false},
        {name:'elapsedtime', width:'60px', sortable:true, editable:false}
      ],
      datatype: "json",
      jsonReader: {id:"_id", repeatitems:false},
      altRows:false,
      rowNum:10,
      rowList:[10,20,50,100],
      pager: '#timesctrl',
      sortname: '_id',
      viewrecords: true,
      sortorder: "asc",
      height:'100%'
    //  forceFit:true,
      //shrinkToFit:false
    }).navGrid(
      '#sessionctrl',
      {edit:false,add:false,del:false},
      {},
      {},
      {},
      {multipleSearch:true}
    ).filterToolbar();
  }


  init();
  
});
