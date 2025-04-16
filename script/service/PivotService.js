class PivotService {
  constructor() {
    this.pivotByMaleFemale = this.pivotByMaleFemale.bind(this);
  }
  pivotByMaleFemale() {
    const data = StorageService.currentRecord.data;
    const attendanceColumn = StorageService.currentRecord.headers.find((column) => column.title.toLowerCase().includes("attendance"));
    const attendanceColumnName = attendanceColumn ? attendanceColumn.data : "";

    const pivotData = data.reduce((acc, item) => {
      const { Department, Gender } = item;
      const TotalAttendance = parseInt(item[attendanceColumnName]) || 0;

      if (!acc[Department]) {
        acc[Department] = {
          MaleLevelOne: 0,
          FemaleLevelOne: 0,
          TotalLevelOne: 0,
          MaleLevelTwo: 0,
          FemaleLevelTwo: 0,
          TotalLevelTwo: 0,
          MaleLevelThree: 0,
          FemaleLevelThree: 0,
          TotalLevelThree: 0,
          MaleLevelFour: 0,
          FemaleLevelFour: 0,
          TotalLevelFour: 0,
          MaleOverAll: 0,
          FemaleOverAll: 0,
          TotalOverAll: 0,
        };
      }

      let categorySuffix;
      if (TotalAttendance === 0) categorySuffix = "LevelOne";
      else if (TotalAttendance > 0 && TotalAttendance <= 2) categorySuffix = "LevelTwo";
      else if (TotalAttendance > 2 && TotalAttendance <= 5) categorySuffix = "LevelThree";
      else if (TotalAttendance > 5) categorySuffix = "LevelFour";

      if (categorySuffix) {
        const genderPrefix = Gender === "Male" ? "Male" : "Female";
        const category = `${genderPrefix}${categorySuffix}`;
        const totalCategory = `Total${categorySuffix}`;

        acc[Department][category]++;
        acc[Department][totalCategory]++;
        acc[Department][`${genderPrefix}OverAll`]++;
        acc[Department][`TotalOverAll`]++;
      }

      return acc;
    }, {});

    console.log(pivotData);

    // Transformation Function to Map Pivot Data to DataTable Rows
    const tableData = Object.keys(pivotData).map((department) => {
      $("#c-mf-pivot").html(
        "<table id='mfp-dataTable' class='table table-striped table-bordered' width='100%'>" +
          "<thead> <tr> <th rowspan='2'>Department</th> <th colspan='3' style='text-align:center'>0 Attendance</th> <th colspan='3' style='text-align:center'>1-2 Attendance</th> <th colspan='3' style='text-align:center'>3-5 Attendance</th> <th colspan='3' style='text-align:center'>&gt; 5 Attendance</th> <th colspan='3' style='text-align:center'>Total</th> </tr> <tr> <th>Male</th> <th>Female</th> <th>Total</th> <th>Male</th> <th>Female</th> <th>Total</th> <th>Male</th> <th>Female</th> <th>Total</th> <th>Male</th> <th>Female</th> <th>Total</th> <th>Male</th> <th>Female</th> <th>Total</th> </tr> </thead>" +
          "<tfoot> <tr> <th>Total:</th> <th></th> <th></th> <th></th> <th></th> <th></th> <th></th> <th></th> <th></th> <th></th> <th></th> <th></th> <th></th> <th></th> <th></th> <th></th> </tr> </tfoot>" +
          "</table>"
      );

      const deptData = pivotData[department];
      return {
        Department: department,
        MaleLevelOne: deptData.MaleLevelOne,
        FemaleLevelOne: deptData.FemaleLevelOne,
        TotalLevelOne: deptData.TotalLevelOne,
        MaleLevelTwo: deptData.MaleLevelTwo,
        FemaleLevelTwo: deptData.FemaleLevelTwo,
        TotalLevelTwo: deptData.TotalLevelTwo,
        MaleLevelThree: deptData.MaleLevelThree,
        FemaleLevelThree: deptData.FemaleLevelThree,
        TotalLevelThree: deptData.TotalLevelThree,
        MaleLevelFour: deptData.MaleLevelFour,
        FemaleLevelFour: deptData.FemaleLevelFour,
        TotalLevelFour: deptData.TotalLevelFour,
        MaleOverAll: deptData.MaleOverAll,
        FemaleOverAll: deptData.FemaleOverAll,
        TotalOverAll: deptData.TotalOverAll,
      };
    });
    let mainContentHeight = document.documentElement.scrollHeight - TableService.MAIN_CONTENT_HEIGHT_OFFSET - 80;

    var table = $("#mfp-dataTable").DataTable({
      data: tableData,
      destroy: true,
      columns: [
        { data: "Department", title: "Department" },
        { data: "MaleLevelOne", title: "Male" },
        { data: "FemaleLevelOne", title: "Female" },
        { data: "TotalLevelOne", title: "Total" },
        { data: "MaleLevelTwo", title: "Male" },
        { data: "FemaleLevelTwo", title: "Female" },
        { data: "TotalLevelTwo", title: "Total" },
        { data: "MaleLevelThree", title: "Male" },
        { data: "FemaleLevelThree", title: "Female" },
        { data: "TotalLevelThree", title: "Total" },
        { data: "MaleLevelFour", title: "Male" },
        { data: "FemaleLevelFour", title: "Female" },
        { data: "TotalLevelFour", title: "Total" },
        { data: "MaleOverAll", title: "Male" },
        { data: "FemaleOverAll", title: "Female" },
        { data: "TotalOverAll", title: "Total" },
      ],
      searching: true,
      paging: true,
      scrollX: true,
      autoWidth: true,
      responsive: true,
      dom: "Bfrtip",
      buttons: [
        {
          extend: "excelHtml5",
          text: "Export Excel",
          className: "btn btn-primary export-right",
          filename: "AttendancePivot.xlsx",
          title: "Attendance Pivot by Male Female",
        },
      ],
      scrollY: mainContentHeight + "px",
      scrollCollapse: true,
      pageLength: TableService.DEFAULT_PAGE_LENGTH,
      footerCallback: function (row, data, start, end, display) {
        var api = this.api();
        $(api.column(0).footer()).html("Total");
        api.columns(":gt(0)", { page: "current" }).every(function () {
          var sum = this.data().reduce(function (a, b) {
            return parseInt(a) + parseInt(b);
          }, 0);
          console.log(sum);
          $(this.footer()).html(sum);
        });
      },
    });
  }
}
