class TableService {
  static MAIN_CONTENT_HEIGHT_OFFSET = 320;
  static DEFAULT_PAGE_LENGTH = 10;

  constructor() {
    this.generateTable = this.generateTable.bind(this);
    this.createFooter = this.createFooter.bind(this);
    this.dataTable = null;
    this.studioGrid = null;
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

  generateTable(currentRecord, options = {}) {
    DataTable.defaults.responsive = true;
    const preservePaging = options.preservePaging === true;
    const previousPage = preservePaging && this.studioGrid ? this.studioGrid.page : 0;
    const previousSearch = preservePaging && this.studioGrid ? this.studioGrid.search : "";
    const previousLength = preservePaging && this.studioGrid ? this.studioGrid.pageLength : TableService.DEFAULT_PAGE_LENGTH;

    const hasSourceRows = window.OFFLINE_MODE
      ? Boolean(window.queryStudioFilterEngine?.sourceData?.length)
      : Boolean(currentRecord.data && currentRecord.data.length);

    if (!hasSourceRows && (!currentRecord.data || currentRecord.data.length === 0)) {
      if (window.OFFLINE_MODE) {
        $("#c-home").html(`
          <div class="qs-empty">
            <div class="qs-empty-icon"><i class="fas fa-file-excel"></i></div>
            <h1>Start with a spreadsheet</h1>
            <p>Upload an Excel file to explore rows with Excel-style column filters, smart data types, and a full filter panel.</p>
            <a href="#" class="qs-empty-cta" id="emptyUploadTrigger"><i class="fas fa-upload"></i> Upload Excel</a>
            <div class="qs-empty-hints">
              <span class="qs-empty-hint">Auto-detects column types</span>
              <span class="qs-empty-hint">Filter + Apply</span>
              <span class="qs-empty-hint">Works offline</span>
            </div>
          </div>
        `);
        if (window.queryStudioUI) window.queryStudioUI.setStudioMode("empty");
      } else {
        $("#c-home").html(
          "<div class='instruction-box'>" +
            "<p class='nodata'>No data available to display.</p>" +
            "<p><i class='fas fa-refresh icon'></i> Click on the <strong>refresh icon</strong> to fetch the data from Cloud.</p><br>" +
            "<p><i class='fas fa-upload icon'></i> Click on the <strong>Upload</strong> button to upload an Excel file.</p>" +
            "</div>"
        );
      }
      this.dataTable = null;
      this.studioGrid = null;
      return;
    }

    if (window.OFFLINE_MODE) {
      this.generateQueryStudioTable(currentRecord, { previousPage, previousSearch, previousLength });
      return;
    }

    this.generateLegacyTable(currentRecord);
  }

  formatHeaderLabel(label) {
    const text = String(label || "").trim();
    if (!text) return "";
    if (text !== text.toUpperCase() && /[a-z]/.test(text)) return text;
    return text
      .toLowerCase()
      .split(/[\s_]+/)
      .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : ""))
      .join(" ");
  }

  chipHtml(text, variant) {
    const safe = String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    return `<span class="qs-chip qs-chip-${variant}">${safe}</span>`;
  }

  escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  formatStudioCell(header, raw) {
    if (raw === null || raw === undefined || String(raw).trim() === "") return "—";
    const dataType = header.dataType || "text";
    const isGrNo = String(header.title).toLowerCase() === "gr no" || header.data === "Gr_No" || header.data === "GR_NO";
    if (isGrNo) {
      const safe = this.escapeHtml(raw);
      return `
        <a class="custom-link" href="https://rssba.in/get-attendance?gr_no=${encodeURIComponent(String(raw))}" target="_blank" rel="noopener noreferrer">${safe}</a>
        <button type="button" class="btn btn-sm copy-btn" data-grno="${safe}" title="Copy Gr No"><i class="fa fa-copy"></i></button>
      `;
    }
    if (dataType === "boolean") {
      const yes = ["yes", "true", "y", "1"].includes(String(raw).trim().toLowerCase());
      return this.chipHtml(yes ? "Yes" : "No", yes ? "yes" : "no");
    }
    if (dataType === "lookup") return this.chipHtml(raw, "lookup");
    const keyLower = String(header.data || "").toLowerCase();
    if (keyLower === "status" || keyLower === "gender") return this.chipHtml(raw, keyLower);
    return this.escapeHtml(raw);
  }

  generateQueryStudioTable(currentRecord, state = {}) {
    const filterEngine = window.queryStudioFilterEngine;
    const rows = filterEngine ? filterEngine.getViewRows() : currentRecord.data || [];
    const columnsMeta = currentRecord.columns || [];
    const displayHeaders = columnsMeta.length
      ? columnsMeta.map((column) => ({
          data: column.key,
          title: this.formatHeaderLabel(column.label),
          dataType: column.dataType,
        }))
      : (currentRecord.headers || []).map((header) => ({
          data: header.data,
          title: this.formatHeaderLabel(header.title),
          dataType: "text",
        }));

    const pageLength = Number(state.previousLength) || TableService.DEFAULT_PAGE_LENGTH;
    const initialSearch = state.previousSearch || "";
    const initialPage = Number(state.previousPage) || 0;

    const headerCells = displayHeaders
      .map((header) => {
        const active = filterEngine
          ? filterEngine.getFilters().some((filter) => filter.column === header.data && filterEngine.isFilterActive(filter))
          : false;
        return `<th data-key="${this.escapeHtml(header.data)}" class="${active ? "is-filtered" : ""}">${this.escapeHtml(header.title)}</th>`;
      })
      .join("");
    const filterCells = displayHeaders
      .map((header) => `<th class="qs-header-filter-cell" data-key="${this.escapeHtml(header.data)}"></th>`)
      .join("");

    $("#c-home").html(`
      <div class="qs-studio-surface">
        <div id="qsResultsBar" class="qs-results-bar">
          <div class="qs-results-meta">
            <div class="qs-results-title" id="qsResultsTitle">Workbook</div>
            <div class="qs-results-counts" id="qsResultsCounts"></div>
          </div>
          <div class="qs-results-controls">
            <label class="qs-search-wrap qs-search-full">
              <i class="fas fa-search"></i>
              <input type="search" id="qsGlobalSearch" class="qs-global-search" placeholder="Search all columns" value="${this.escapeHtml(initialSearch)}" />
            </label>
            <label class="qs-page-size-wrap" title="Rows per page">
              <select id="qsPageSize" class="qs-page-size" aria-label="Rows per page">
                <option value="10">10 / page</option>
                <option value="25">25 / page</option>
                <option value="50">50 / page</option>
                <option value="100">100 / page</option>
              </select>
            </label>
            <div id="qsPagerHost" class="qs-pager-host" aria-label="Pagination"></div>
          </div>
        </div>
        <div id="qsFilterChips" class="qs-filter-chips" hidden></div>
        <div class="qs-table-wrap">
          <div class="qs-table-scroll">
            <table id="h-dataTable" class="qs-data-table">
              <thead>
                <tr class="qs-header-title-row">${headerCells}</tr>
                <tr id="qsHeaderFilterRow" class="qs-header-filter-row">${filterCells}</tr>
              </thead>
              <tbody id="qsTableBody"></tbody>
            </table>
          </div>
        </div>
      </div>
    `);

    $("#qsPageSize").val(String(pageLength));

    const self = this;
    const grid = {
      headers: displayHeaders,
      rows,
      search: initialSearch,
      page: initialPage,
      pageLength,
      getMatchedRows() {
        const query = String(this.search || "")
          .trim()
          .toLowerCase();
        if (!query) return this.rows;
        // Match every word across the whole row (any columns), not only one cell.
        const tokens = query.split(/\s+/).filter(Boolean);
        return this.rows.filter((row) => {
          const haystack = this.headers.map((header) => String(row?.[header.data] ?? "").toLowerCase()).join(" ");
          return tokens.every((token) => haystack.includes(token));
        });
      },
      pageInfo() {
        const matched = this.getMatchedRows();
        const pages = matched.length ? Math.max(1, Math.ceil(matched.length / this.pageLength)) : 0;
        if (pages && this.page >= pages) this.page = Math.max(0, pages - 1);
        if (!pages) this.page = 0;
        const start = matched.length ? this.page * this.pageLength : 0;
        const end = matched.length ? Math.min(start + this.pageLength, matched.length) : 0;
        return {
          recordsDisplay: matched.length,
          start,
          end,
          page: this.page,
          pages,
          pageLength: this.pageLength,
          matched,
        };
      },
      renderBody() {
        const info = this.pageInfo();
        const slice = info.matched.slice(info.start, info.end);
        const $body = $("#qsTableBody");
        if (!slice.length) {
          const emptyMsg = String(this.search || "").trim()
            ? "No rows match the current search"
            : "No rows match the current filters";
          $body.html(`<tr class="qs-empty-row"><td colspan="${Math.max(1, this.headers.length)}">${emptyMsg}</td></tr>`);
          return info;
        }
        const html = slice
          .map((row, index) => {
            const cells = this.headers.map((header) => `<td>${self.formatStudioCell(header, row?.[header.data])}</td>`).join("");
            return `<tr class="${index % 2 ? "qs-row-alt" : ""}">${cells}</tr>`;
          })
          .join("");
        $body.html(html);
        return info;
      },
      renderPager() {
        const info = this.pageInfo();
        const $host = $("#qsPagerHost");
        if (!$host.length) return;
        const prevDisabled = !info.pages || info.page <= 0 ? "disabled" : "";
        const nextDisabled = !info.pages || info.page >= info.pages - 1 ? "disabled" : "";
        const label = info.pages ? `${info.page + 1} / ${info.pages}` : "0 / 0";
        $host.html(`
          <div class="qs-pager">
            <button type="button" class="qs-pager-btn" data-qs-page="prev" ${prevDisabled} aria-label="Previous page">‹</button>
            <span class="qs-pager-label">${label}</span>
            <button type="button" class="qs-pager-btn" data-qs-page="next" ${nextDisabled} aria-label="Next page">›</button>
          </div>
        `);
      },
      draw() {
        this.renderBody();
        this.renderPager();
        if (window.queryStudioUI) {
          window.queryStudioUI.updateResultsBar();
          window.queryStudioUI.syncColumnFilterMarkers();
        }
      },
      setRows(nextRows) {
        this.rows = Array.isArray(nextRows) ? nextRows : [];
        this.draw();
      },
      setSearch(value) {
        this.search = value || "";
        this.page = 0;
        this.draw();
      },
      setPageLength(value) {
        this.pageLength = Number(value) || TableService.DEFAULT_PAGE_LENGTH;
        this.page = 0;
        this.draw();
      },
      setPage(nextPage) {
        const info = this.pageInfo();
        this.page = Math.max(0, Math.min(info.pages - 1, nextPage));
        this.draw();
      },
    };

    this.studioGrid = grid;
    this.dataTable = null;
    grid.draw();

    if (window.queryStudioUI) {
      window.queryStudioUI.setStudioMode("ready");
      window.queryStudioUI.bindResultsBar(grid);
      window.queryStudioUI.renderColumnFilters();
      window.queryStudioUI.updateResultsBar();
      window.queryStudioUI.renderFilterChips();
      window.queryStudioUI.syncColumnFilterMarkers();
      window.queryStudioUI.updateFilterBadge();
    }

    $("body")
      .off("click.qsCopy")
      .on("click.qsCopy", ".copy-btn", function () {
        const grNo = $(this).data("grno");
        if (!grNo) return;
        const tempInput = document.createElement("textarea");
        tempInput.value = grNo;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
      });

    $("#qsPagerHost")
      .off("click.qsPager")
      .on("click.qsPager", "[data-qs-page]", function () {
        const action = $(this).data("qs-page");
        if ($(this).is(":disabled")) return;
        if (action === "prev") grid.setPage(grid.page - 1);
        if (action === "next") grid.setPage(grid.page + 1);
      });
  }

  generateLegacyTable(currentRecord) {
    let mainContentHeight = document.documentElement.scrollHeight - TableService.MAIN_CONTENT_HEIGHT_OFFSET;

    $("#c-home").html("<table id='h-dataTable' class='table table-striped table-bordered'></table>");

    this.createFooter(
      "#h-dataTable",
      $.map(currentRecord.headers, function (item) {
        return item.title;
      })
    );

    const grNoColumnIndex = currentRecord.headers.findIndex((header) => header.title === "Gr No");

    let columnDefs = [
      {
        targets: "_all",
        defaultContent: "-",
      },
      {
        targets: grNoColumnIndex,
        render: function (data, type) {
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
        render: function (data, type, row) {
          if (typeof data === "string" && data.trim().toLowerCase() === "edit") {
            if (API_URLS.CURRENT_URL === API_URLS.REQUESTS_FETCH && row.Status === "Closed") {
              return '<span class="text-muted">Closed</span>';
            }

            if (API_URLS.CURRENT_URL === API_URLS.VISIT_FETCH) {
              return `<button class="btn btn-sm btn-primary visit-edit-button" data-row='${JSON.stringify(row)}'>
                        <i class="fas fa-edit"></i>
                      </button>`;
            }

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
                  column.search("^\\s*$", true, false).draw();
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
                column.search(input.value ? input.value : "", true, false).draw();
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
      order: [],
      search: {
        regex: true,
      },
      autoWidth: false,
      responsive: true,
      scrollY: mainContentHeight + "px",
      scrollCollapse: false,
      pageLength: TableService.DEFAULT_PAGE_LENGTH,
    });

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
      }
    });
  }
}
