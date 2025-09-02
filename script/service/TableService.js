class TableService {
  static MAIN_CONTENT_HEIGHT_OFFSET = 370;
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

    // Check if first column is "Action"
    const isActionFirstColumn = currentRecord.headers.length > 0 && currentRecord.headers[0].title && currentRecord.headers[0].title.toLowerCase() === "action";

    let columnDefs = [
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
    ];

    const actionColumnIndex = currentRecord.headers.findIndex((header) => header.title.toLowerCase() === "action");

    if (actionColumnIndex !== -1) {
      columnDefs.push({
        targets: actionColumnIndex,
        orderable: false,
        searchable: false,
        render: function (data, type, row, meta) {
          if (typeof data === "string" && data.trim().toLowerCase() === "edit") {
            // For requests, check if status is closed
            if (API_URLS.CURRENT_URL === API_URLS.REQUESTS_FETCH && row.Status === "Closed") {
              return '<span class="text-muted">Closed</span>';
            }

            // For visits, use visit-edit-button class
            if (API_URLS.CURRENT_URL === API_URLS.VISIT_FETCH) {
              return `<button class="btn btn-sm btn-primary visit-edit-button" data-row='${JSON.stringify(row)}'>
                        <i class="fas fa-edit"></i>
                      </button>`;
            }

            // For requests, include all row data
            const filteredRow = API_URLS.CURRENT_URL === API_URLS.REQUESTS_FETCH ? row : {};

            if (API_URLS.CURRENT_URL !== API_URLS.REQUESTS_FETCH) {
              Object.keys(row).forEach((key) => {
                if (key.startsWith("E_") || key.startsWith("R_") || key === "Id" || key === "Name" || key === "Gr_No") {
                  filteredRow[key] = row[key];
                }
              });
            }

            return `<button class="btn btn-sm btn-primary zonal-edit-button" data-row='${JSON.stringify(filteredRow)}'>Edit</button>`;
          }
          return data;
        },
      });
    }

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
      columnDefs: columnDefs,
      searching: true,
      paging: true,
      scrollX: true,
      order: [], // Will be set after table creation
      search: {
        regex: true,
      },
      autoWidth: false,
      responsive: true,
      scrollY: mainContentHeight + "px",
      scrollCollapse: false,
      pageLength: TableService.DEFAULT_PAGE_LENGTH,
    });

    // Set default sort by Updated On column for requests only
    if (API_URLS.CURRENT_URL === API_URLS.REQUESTS_FETCH) {
      const updatedOnColumnIndex = currentRecord.headers.findIndex((header) => header.title === "Submitted On");
      if (updatedOnColumnIndex !== -1) {
        table.order([updatedOnColumnIndex, "desc"]).draw();
      }
    }

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
