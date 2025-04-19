class TableService {
  static MAIN_CONTENT_HEIGHT_OFFSET = 350;
  static DEFAULT_PAGE_LENGTH = 100;

  constructor() {
    this.generateTable = this.generateTable.bind(this);
    this.createFooter = this.createFooter.bind(this);
  }

  createFooter(tableId, footers) {
    let table = document.querySelector(tableId);
    let tfoot = document.createElement("tfoot");
    let tr = document.createElement("tr");

    footers.forEach((footerText) => {
      let th = document.createElement("th");
      th.textContent = footerText;
      tr.appendChild(th);
    });

    tfoot.appendChild(tr);
    table.appendChild(tfoot);
  }

  generateTable(currentRecord) {
    DataTable.defaults.responsive = true;

    if (!currentRecord.data || currentRecord.data.length === 0) {
      $("#c-home").html(
        "<div class='instruction-box'>" +
          "<p class='nodata'>No data available to display.</p>" +
          "<p><i class='fas fa-refresh icon'></i> Click on the <strong>refresh icon</strong> to fetch the data from Cloud.</p>" +
          "<br>" +
          "<p><i class='fas fa-upload icon'></i> Click on the <strong>Upload</strong> button to upload an Excel file.</p>" +
          "</div>"
      );

      console.log("No data available to display.");
      return;
    }

    let mainContentHeight = document.documentElement.scrollHeight - TableService.MAIN_CONTENT_HEIGHT_OFFSET;

    $("#c-home").html("<table id='h-dataTable' class='table table-striped table-bordered'></table>");

    this.createFooter(
      "#h-dataTable",
      $.map(currentRecord.headers, function (item) {
        return item.title;
      })
    );

    // Ensure "Gr No" column is targeted explicitly
    const grNoColumnIndex = currentRecord.headers.findIndex((header) => header.title === "Gr No");

    let table = new DataTable("#h-dataTable", {
      initComplete: function () {
        this.api()
          .columns()
          .every(function () {
            let column = this;
            let footer = column.footer();
            if (!footer) return;

            let title = footer.textContent;
            footer.textContent = "";

            if (FilterService.filterFields.includes(title.replace(/\s+/g, "_"))) {
              let select = document.createElement("select");
              select.innerHTML = "<option value=''>All</option><option value='(Blank)'>Blank</option>";
              select.classList.add("footer-dropdown");
              footer.appendChild(select);

              let uniqueValues = new Set();
              column.data().each((val) => {
                if (val) uniqueValues.add(val);
              });

              uniqueValues.forEach((val) => {
                let option = document.createElement("option");
                option.value = val;
                option.textContent = val;
                select.appendChild(option);
              });

              select.addEventListener("change", function () {
                let selectedValue = this.value;
                if (selectedValue === "(Blank)") {
                  column.search("^\\s*$", true, false).draw(); // Regex for blank values
                } else {
                  column.search(selectedValue ? `^${selectedValue}$` : "", true, false).draw();
                }
              });
            } else {
              let input = document.createElement("input");
              input.placeholder = title;
              input.classList.add("footer-input");
              footer.appendChild(input);

              input.addEventListener("keyup", function () {
                let searchTerm = input.value;
                column.search(searchTerm ? searchTerm : "", true, false).draw();
              });
            }
          });
      },
      destroy: true,
      data: currentRecord.data,
      columns: currentRecord.headers,
      columnDefs: [
        {
          targets: "_all",
          defaultContent: "-",
        },
        {
          targets: grNoColumnIndex,
          render: function (data, type, row, meta) {
            if (type === "display" && data) {
              return `
                                <a class="custom-link" href="https://rssba.in/get-attendance?gr_no=${data}" target="_blank">${data}</a>
                                <button class="btn btn-sm copy-btn" data-grno="${data}" title="Copy Gr No">
                                    <i class="fa fa-copy"></i>
                                </button>
                            `;
            }
            return data;
          },
        },
      ],
      searching: true,
      paging: true,
      scrollX: true,
      search: {
        regex: true,
      },
      autoWidth: false,
      responsive: true,
      scrollY: mainContentHeight + "px",
      scrollCollapse: false,
      pageLength: TableService.DEFAULT_PAGE_LENGTH,
    });

    $("#h-dataTable").on("order.dt", function () {
      if (typeof table.colResize === "function") {
        table.colResize();
      }
    });
    $("body").on("click", ".copy-btn", function () {
      const grNo = $(this).data("grno");
      if (grNo) {
        const tempInput = document.createElement("textarea");
        tempInput.value = grNo;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
      } else {
        console.error("Gr No value is missing or invalid.");
      }
    });
  }
}
