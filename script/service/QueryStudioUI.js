class QueryStudioUI {
  constructor(filterEngine, onRefreshTable) {
    this.filterEngine = filterEngine;
    this.onRefreshTable = onRefreshTable;
    this.openDrawer = null;
    this.mode = "empty";
    this.studioGrid = null;
    this.columnFilterTimers = {};
    this.bindShell();
    this.filterEngine.onChange(() => {
      this.updateFilterBadge();
      this.syncColumnFilterMarkers();
      this.updateResultsBar();
      this.renderFilterChips();
      if (this.openDrawer === "filter") this.renderFilterDrawerBody();
    });
  }

  bindShell() {
    $(document).on("click", "#filterIcon", (event) => {
      event.preventDefault();
      if (this.mode !== "ready") return;
      this.openFilterDrawer();
    });
    $(document).on("click", "#configureTrigger", (event) => {
      event.preventDefault();
      if (this.mode !== "ready") return;
      this.openConfigureDrawer();
    });
    $(document).on("click", "#qsFilterDrawerClose, #qsFilterBackdrop", () => this.closeDrawers());
    $(document).on("click", "#qsConfigureDrawerClose, #qsConfigureBackdrop", () => this.closeDrawers());
    $(document).on("click", "#qsFilterAdd", () => {
      this.filterEngine.addFilter();
      this.renderFilterDrawerBody();
    });
    $(document).on("click", "#qsFilterReset", () => {
      this.filterEngine.resetFilters();
      this.onRefreshTable();
      this.renderFilterDrawerBody();
      this.renderFilterChips();
      this.updateResultsBar();
      this.syncColumnFilterMarkers();
    });
    $(document).on("click", "#qsFilterApply", () => {
      this.readFilterDrawerIntoEngine();
      this.filterEngine.recompute(false);
      this.onRefreshTable(true);
      this.renderFilterChips();
      this.updateFilterBadge();
      this.updateResultsBar();
      this.syncColumnFilterMarkers();
      this.closeDrawers();
    });
    $(document).on("click", "#qsConfigureSave", () => {
      this.saveConfigureDrawer();
    });
    $(document).on("click", "#qsClearFiltersBtn", (event) => {
      event.preventDefault();
      this.filterEngine.resetFilters();
      this.onRefreshTable(true);
      this.renderFilterChips();
      this.updateFilterBadge();
      this.updateResultsBar();
      this.syncColumnFilterMarkers();
    });
    $(document).on("click", ".qs-filter-chip-remove", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const index = Number($(event.currentTarget).data("index"));
      if (Number.isNaN(index)) return;
      this.filterEngine.removeFilter(index, false);
      this.onRefreshTable(false);
      this.renderFilterChips();
      this.updateFilterBadge();
      this.updateResultsBar();
      this.syncColumnFilterMarkers();
    });
    $(document).on("keydown", (event) => {
      if (event.key === "Escape") {
        this.closeColumnFilterMenus();
        this.closeDrawers();
      }
    });
    $(document).on("input", "#qsHeaderFilterRow .qs-quick-text", (event) => {
      const key = $(event.currentTarget).closest("th").data("key");
      this.scheduleColumnFilter(key, 250);
    });
    $(document).on("change", "#qsHeaderFilterRow .qs-quick-boolean, #qsHeaderFilterRow .qs-quick-min, #qsHeaderFilterRow .qs-quick-max", (event) => {
      const key = $(event.currentTarget).closest("th").data("key");
      this.applyColumnFilter(key);
    });
    $(document).on("change", "#qsHeaderFilterRow .qs-quick-lookup-menu input[type=checkbox]", (event) => {
      const key = $(event.currentTarget).closest("th").data("key");
      this.applyColumnFilter(key);
    });
    $(document).on("click", ".qs-quick-lookup-toggle", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const $menu = $(event.currentTarget).siblings(".qs-quick-lookup-menu");
      $(".qs-quick-lookup-menu").not($menu).removeClass("open");
      $menu.toggleClass("open");
    });
    $(document).on("click", ".qs-col-filter-clear", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const key = $(event.currentTarget).closest("th").data("key");
      this.clearColumnFilter(key);
    });
    $(document).on("click.qsColFilterClose", (event) => {
      if ($(event.target).closest(".qs-quick-lookup").length) return;
      this.closeColumnFilterMenus();
    });
  }

  scheduleColumnFilter(columnKey, delayMs = 250) {
    if (this.columnFilterTimers[columnKey]) {
      window.clearTimeout(this.columnFilterTimers[columnKey]);
    }
    this.columnFilterTimers[columnKey] = window.setTimeout(() => {
      delete this.columnFilterTimers[columnKey];
      this.applyColumnFilter(columnKey);
    }, delayMs);
  }

  closeColumnFilterMenus() {
    $(".qs-quick-lookup-menu").removeClass("open");
  }

  setStudioMode(mode) {
    this.mode = mode === "ready" ? "ready" : "empty";
    const ready = this.mode === "ready";
    $("body").toggleClass("qs-mode-ready", ready).toggleClass("qs-mode-empty", !ready);
    $("#filterIcon, #configureTrigger, #clearStorageTrigger").toggleClass("qs-disabled", !ready);
    if (!ready) {
      $("#filterBadge").hide().text("");
      $("#filterIcon").removeClass("qs-active");
      this.closeDrawers();
    }
    if (typeof window.updateQueryStudioSheetControl === "function") {
      window.updateQueryStudioSheetControl();
    }
  }

  bindResultsBar(grid) {
    this.studioGrid = grid || null;
    const self = this;
    $("#qsGlobalSearch")
      .off("input.qsSearch change.qsSearch search.qsSearch")
      .on("input.qsSearch change.qsSearch search.qsSearch", function () {
        if (!self.studioGrid) return;
        self.studioGrid.setSearch(this.value || "");
      });
    $("#qsPageSize")
      .off("change.qsPage")
      .on("change.qsPage", function () {
        if (!self.studioGrid) return;
        self.studioGrid.setPageLength(Number(this.value) || TableService.DEFAULT_PAGE_LENGTH);
      });
  }

  updateResultsBar() {
    const $title = $("#qsResultsTitle");
    const $counts = $("#qsResultsCounts");
    if (!$title.length) return;

    const fileName = StorageService.currentFile || "Workbook";
    const sheetName = StorageService.currentSheet || "";
    $title.text(sheetName ? `${fileName} · ${sheetName}` : fileName);

    const total = this.filterEngine.sourceData?.length || 0;
    const visible = this.filterEngine.getViewRows()?.length || 0;
    const active = this.filterEngine.getActiveCount();
    let counts = `${total.toLocaleString()} rows`;
    if (active > 0) {
      counts += ` · filtered to ${visible.toLocaleString()}`;
    }
    if (this.studioGrid) {
      const info = this.studioGrid.pageInfo();
      const hasSearch = Boolean(String(this.studioGrid.search || "").trim());
      if (hasSearch) {
        counts += ` · search ${info.recordsDisplay.toLocaleString()}`;
      }
      if (info.recordsDisplay > 0) {
        counts += ` · showing ${(info.start + 1).toLocaleString()}–${info.end.toLocaleString()}`;
      }
    }
    $counts.html(counts);
  }

  renderFilterChips() {
    const $host = $("#qsFilterChips");
    if (!$host.length) return;
    const filters = this.filterEngine.getFilters().filter((filter) => this.filterEngine.isFilterActive(filter));
    if (!filters.length) {
      $host.prop("hidden", true).empty();
      return;
    }

    const chips = filters
      .map((filter) => {
        const column = this.filterEngine.columnByKey(filter.column);
        const label = column?.label || filter.column;
        const op =
          (this.filterEngine.operatorsFor(column?.dataType || "text").find((entry) => entry.value === filter.operator) || {})
            .label || filter.operator;
        let valueText = "";
        if (filter.operator !== "blank" && filter.operator !== "notblank") {
          valueText = Array.isArray(filter.value) ? filter.value.join(", ") : String(filter.value ?? "");
        }
        const summary = valueText ? `${label} ${op} ${valueText}` : `${label} ${op}`;
        const fullIndex = this.filterEngine.getFilters().indexOf(filter);
        return `<button type="button" class="qs-filter-chip" title="${this.escapeAttr(summary)}">
          <span>${this.escape(summary)}</span>
          <i class="fas fa-times qs-filter-chip-remove" data-index="${fullIndex}"></i>
        </button>`;
      })
      .join("");

    $host
      .prop("hidden", false)
      .html(`${chips}<button type="button" class="qs-filter-chips-clear" id="qsClearFiltersBtn">Clear all</button>`);
  }

  updateFilterBadge() {
    const count = this.filterEngine.getActiveCount();
    const $badge = $("#filterBadge");
    if (!$badge.length) return;
    if (this.mode === "ready" && count > 0) {
      $badge.text(count).show();
      $("#filterIcon").addClass("qs-active");
    } else {
      $badge.hide().text("");
      $("#filterIcon").removeClass("qs-active");
    }
  }

  openFilterDrawer(columnKey) {
    this.closeDrawers();
    this.openDrawer = "filter";
    if (!this.filterEngine.getFilters().length) {
      this.filterEngine.addFilter(columnKey, false);
    } else if (columnKey && !this.filterEngine.getFilters().some((filter) => filter.column === columnKey)) {
      this.filterEngine.addFilter(columnKey, false);
    }
    this.renderFilterDrawerBody();
    $("#qsFilterBackdrop, #qsFilterDrawer").addClass("open");
    $("body").addClass("qs-drawer-open");
    window.setTimeout(() => {
      $("#qsFilterDrawerBody .qs-filter-value").first().trigger("focus");
    }, 0);
  }

  openConfigureDrawer() {
    this.closeDrawers();
    this.openDrawer = "configure";
    this.renderConfigureDrawerBody();
    $("#qsConfigureBackdrop, #qsConfigureDrawer").addClass("open");
    $("body").addClass("qs-drawer-open");
  }

  closeDrawers() {
    this.openDrawer = null;
    $("#qsFilterBackdrop, #qsFilterDrawer, #qsConfigureBackdrop, #qsConfigureDrawer").removeClass("open");
    $("body").removeClass("qs-drawer-open");
  }

  renderFilterDrawerBody() {
    const $body = $("#qsFilterDrawerBody");
    if (!$body.length) return;
    const columns = this.filterEngine.getColumns();
    const filters = this.filterEngine.getFilters();
    $body.empty();

    if (!columns.length) {
      $body.html(`
        <div class="qs-drawer-empty">
          <strong>No data loaded</strong>
          <p class="qs-muted">Upload an Excel file first, then add conditions and click Apply.</p>
        </div>
      `);
      return;
    }
    if (!filters.length) {
      $body.append(`
        <div class="qs-drawer-empty">
          <strong>No filters yet</strong>
          <p class="qs-muted">Add a filter, enter a value, then click Apply filters.</p>
        </div>
      `);
    }

    filters.forEach((filter, index) => {
      const column = this.filterEngine.columnByKey(filter.column) || columns[0];
      const operators = this.filterEngine.operatorsFor(column.dataType);
      const omitsValue = filter.operator === "blank" || filter.operator === "notblank";
      const $row = $(`<div class="qs-filter-row" data-index="${index}"></div>`);

      const columnOptions = columns
        .map((entry) => `<option value="${entry.key}" ${entry.key === filter.column ? "selected" : ""}>${this.escape(entry.label)}</option>`)
        .join("");
      const operatorOptions = operators
        .map((entry) => `<option value="${entry.value}" ${entry.value === filter.operator ? "selected" : ""}>${entry.label}</option>`)
        .join("");

      $row.append(`
        <div class="qs-field">
          <label>Column</label>
          <select class="form-control qs-filter-column">${columnOptions}</select>
        </div>
        <div class="qs-field">
          <label>Condition</label>
          <select class="form-control qs-filter-operator">${operatorOptions}</select>
        </div>
      `);

      if (!omitsValue) {
        $row.append(`<div class="qs-field qs-field-value"><label>Value</label>${this.valueControlHtml(column, filter)}</div>`);
      }

      $row.append(`<button type="button" class="btn btn-outline-secondary btn-sm qs-filter-remove" title="Remove"><i class="fas fa-trash"></i></button>`);
      $body.append($row);
    });

    $body.find(".qs-filter-column").on("change", (event) => {
      const index = Number($(event.currentTarget).closest(".qs-filter-row").data("index"));
      this.filterEngine.updateFilter(index, { column: $(event.currentTarget).val() }, false);
      this.renderFilterDrawerBody();
    });
    $body.find(".qs-filter-operator").on("change", (event) => {
      const index = Number($(event.currentTarget).closest(".qs-filter-row").data("index"));
      this.filterEngine.updateFilter(index, { operator: $(event.currentTarget).val() }, false);
      this.renderFilterDrawerBody();
    });
    $body.find(".qs-filter-remove").on("click", (event) => {
      const index = Number($(event.currentTarget).closest(".qs-filter-row").data("index"));
      this.filterEngine.removeFilter(index, false);
      this.renderFilterDrawerBody();
    });
  }

  valueControlHtml(column, filter) {
    const value = filter.value;
    if (column.dataType === "boolean") {
      const current = Array.isArray(value) ? value[0] : value;
      return `<select class="form-control qs-filter-value">
        <option value="1" ${String(current) === "1" || String(current).toLowerCase() === "yes" || String(current).toLowerCase() === "true" ? "selected" : ""}>Yes</option>
        <option value="0" ${String(current) === "0" || String(current).toLowerCase() === "no" || String(current).toLowerCase() === "false" ? "selected" : ""}>No</option>
      </select>`;
    }
    if (column.dataType === "lookup" || filter.operator === "in" || filter.operator === "notin") {
      const selected = Array.isArray(value) ? value.map(String) : String(value || "").split(",").map((entry) => entry.trim()).filter(Boolean);
      const options = (column.uniqueValues || [])
        .map((entry) => `<option value="${this.escapeAttr(entry)}" ${selected.includes(entry) ? "selected" : ""}>${this.escape(entry)}</option>`)
        .join("");
      return `<select class="form-control qs-filter-value" multiple size="5">${options}</select>`;
    }
    if (column.dataType === "number") {
      return `<input type="number" class="form-control qs-filter-value" value="${this.escapeAttr(value)}" />`;
    }
    if (column.dataType === "date") {
      return `<input type="date" class="form-control qs-filter-value" value="${this.escapeAttr(String(value || "").slice(0, 10))}" />`;
    }
    if (column.dataType === "datetime") {
      const local = String(value || "").slice(0, 16);
      return `<input type="datetime-local" class="form-control qs-filter-value" value="${this.escapeAttr(local)}" />`;
    }
    return `<input type="text" class="form-control qs-filter-value" value="${this.escapeAttr(value)}" />`;
  }

  readFilterDrawerIntoEngine() {
    const filters = [];
    $("#qsFilterDrawerBody .qs-filter-row").each((_, row) => {
      const $row = $(row);
      const columnKey = $row.find(".qs-filter-column").val();
      const operator = $row.find(".qs-filter-operator").val();
      const column = this.filterEngine.columnByKey(columnKey);
      let value = "";
      const $value = $row.find(".qs-filter-value");
      if ($value.length) {
        if ($value.is("select[multiple]")) value = $value.val() || [];
        else value = $value.val();
      }
      filters.push({ column: columnKey, operator, value, dataType: column?.dataType });
    });
    this.filterEngine.setFilters(filters, false);
  }

  renderConfigureDrawerBody() {
    const $body = $("#qsConfigureDrawerBody");
    if (!$body.length) return;
    const columns = this.filterEngine.getColumns();
    $body.empty();
    if (!columns.length) {
      $body.html(`
        <div class="qs-drawer-empty">
          <strong>No columns to configure</strong>
          <p class="qs-muted">Upload an Excel file to detect column types. You can override them here anytime.</p>
        </div>
      `);
      return;
    }
    columns.forEach((column) => {
      const options = ColumnSchemaService.DATA_TYPES.map(
        (type) => `<option value="${type.value}" ${type.value === column.dataType ? "selected" : ""}>${type.label}</option>`
      ).join("");
      $body.append(`
        <div class="qs-configure-row" data-key="${this.escapeAttr(column.key)}">
          <div class="qs-configure-label">
            <strong>${this.escape(column.label)}</strong>
            <small>${this.escape(column.key)}</small>
            <em class="qs-type-hint">Drives filter controls</em>
          </div>
          <select class="form-control qs-configure-type">${options}</select>
        </div>
      `);
    });
  }

  saveConfigureDrawer() {
    const record = StorageService.currentRecord;
    if (!record) return;
    const data = this.filterEngine.sourceData;
    $("#qsConfigureDrawerBody .qs-configure-row").each((_, row) => {
      const key = $(row).data("key");
      const dataType = $(row).find(".qs-configure-type").val();
      ColumnSchemaService.applyDataType(record.columns, key, dataType, data);
    });
    if (StorageService.currentData[StorageService.currentFile] && StorageService.currentSheet) {
      StorageService.currentData[StorageService.currentFile][StorageService.currentSheet].columns = record.columns;
    }
    this.filterEngine.setSheet(record);
    this.filterEngine.resetFilters(false);
    this.onRefreshTable();
    this.renderFilterChips();
    this.updateFilterBadge();
    this.updateResultsBar();
    this.syncColumnFilterMarkers();
    this.closeDrawers();
  }

  syncColumnFilterMarkers() {
    const columns = this.filterEngine.getColumns();
    columns.forEach((column) => {
      const active = this.filterEngine.getFilters().some((filter) => filter.column === column.key && this.filterEngine.isFilterActive(filter));
      $(`#h-dataTable thead tr.qs-header-title-row th[data-key="${column.key}"]`).toggleClass("is-filtered", active);
      $(`#qsHeaderFilterRow th[data-key="${column.key}"]`).toggleClass("is-active", active);
    });
  }

  renderColumnFilters() {
    const $row = $("#qsHeaderFilterRow");
    if (!$row.length) return;
    const columns = this.filterEngine.getColumns();
    $row.find("th").each((_, cell) => {
      const $cell = $(cell);
      const key = $cell.data("key");
      const column = this.filterEngine.columnByKey(key) || columns.find((entry) => entry.key === key);
      if (!column) {
        $cell.empty();
        return;
      }
      const state = this.filterEngine.getQuickState(column.key);
      const active = this.filterEngine.getFilters().some((filter) => filter.column === column.key && this.filterEngine.isFilterActive(filter));
      $cell.toggleClass("is-active", active).html(`
        <div class="qs-col-filter">
          <div class="qs-col-filter-field">
            ${this.quickFilterControl(column, state)}
            <button type="button" class="qs-col-filter-clear" title="Clear column filter" aria-label="Clear column filter" ${active ? "" : "disabled"}>
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      `);
    });
  }

  quickFilterControl(column, state) {
    if (column.dataType === "lookup") {
      const values = state.values || [];
      const options = (column.uniqueValues || [])
        .map(
          (entry) =>
            `<label class="qs-check"><input type="checkbox" value="${this.escapeAttr(entry)}" ${values.includes(entry) ? "checked" : ""}/><span>${this.escape(entry)}</span></label>`
        )
        .join("");
      return `<div class="qs-quick-lookup">
        <button type="button" class="qs-quick-lookup-toggle">${values.length ? `${values.length} selected` : "All"}</button>
        <div class="qs-quick-lookup-menu">${options || '<div class="qs-muted">No values</div>'}</div>
      </div>`;
    }
    if (column.dataType === "boolean") {
      return `<select class="form-control form-control-sm qs-quick-boolean">
        <option value="">All</option>
        <option value="1" ${state.value === "1" ? "selected" : ""}>Yes</option>
        <option value="0" ${state.value === "0" ? "selected" : ""}>No</option>
      </select>`;
    }
    if (column.dataType === "number") {
      return `<div class="qs-quick-range">
        <input type="number" class="form-control form-control-sm qs-quick-min" placeholder="Min" value="${this.escapeAttr(state.min || "")}" />
        <input type="number" class="form-control form-control-sm qs-quick-max" placeholder="Max" value="${this.escapeAttr(state.max || "")}" />
      </div>`;
    }
    if (column.dataType === "date") {
      return `<div class="qs-quick-range">
        <input type="date" class="form-control form-control-sm qs-quick-min" value="${this.escapeAttr(state.min || "")}" />
        <input type="date" class="form-control form-control-sm qs-quick-max" value="${this.escapeAttr(state.max || "")}" />
      </div>`;
    }
    if (column.dataType === "datetime") {
      return `<div class="qs-quick-range">
        <input type="datetime-local" class="form-control form-control-sm qs-quick-min" value="${this.escapeAttr(state.min || "")}" />
        <input type="datetime-local" class="form-control form-control-sm qs-quick-max" value="${this.escapeAttr(state.max || "")}" />
      </div>`;
    }
    return `<input type="search" class="form-control form-control-sm qs-quick-text" placeholder="Filter…" value="${this.escapeAttr(state.text || "")}" />`;
  }

  applyColumnFilter(columnKey) {
    const $cell = $(`#qsHeaderFilterRow th[data-key="${columnKey}"]`);
    if (!$cell.length) return;
    const column = this.filterEngine.columnByKey(columnKey);
    if (!column) return;

    if (column.dataType === "lookup") {
      const values = $cell
        .find(".qs-quick-lookup-menu input[type=checkbox]:checked")
        .map((_, input) => $(input).val())
        .get();
      this.filterEngine.setQuickLookupFilter(columnKey, values);
      $cell.find(".qs-quick-lookup-toggle").text(values.length ? `${values.length} selected` : "All");
    } else if (column.dataType === "boolean") {
      this.filterEngine.setQuickBooleanFilter(columnKey, $cell.find(".qs-quick-boolean").val());
    } else if (column.dataType === "number" || column.dataType === "date" || column.dataType === "datetime") {
      this.filterEngine.setQuickRangeFilter(columnKey, $cell.find(".qs-quick-min").val(), $cell.find(".qs-quick-max").val());
    } else {
      this.filterEngine.setQuickTextFilter(columnKey, $cell.find(".qs-quick-text").val());
    }

    this.onRefreshTable(false);
    this.renderFilterChips();
    this.updateFilterBadge();
    this.updateResultsBar();
    this.syncColumnFilterMarkers();
    const $clear = $(`#qsHeaderFilterRow th[data-key="${columnKey}"] .qs-col-filter-clear`);
    const active = this.filterEngine.getFilters().some((filter) => filter.column === columnKey && this.filterEngine.isFilterActive(filter));
    $clear.prop("disabled", !active);
  }

  clearColumnFilter(columnKey) {
    if (this.columnFilterTimers[columnKey]) {
      window.clearTimeout(this.columnFilterTimers[columnKey]);
      delete this.columnFilterTimers[columnKey];
    }
    this.filterEngine.upsertFilter(columnKey, "contains", "", true);
    this.onRefreshTable(false);
    this.renderColumnFilters();
    this.renderFilterChips();
    this.updateFilterBadge();
    this.updateResultsBar();
    this.syncColumnFilterMarkers();
  }

  escape(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  escapeAttr(value) {
    return this.escape(value).replace(/'/g, "&#39;");
  }
}
