class FilterEngine {
  static OPERATORS_BY_TYPE = {
    text: [
      { value: "eq", label: "Equals" },
      { value: "neq", label: "Not equals" },
      { value: "contains", label: "Contains" },
      { value: "ncontains", label: "Does not contain" },
      { value: "in", label: "In" },
      { value: "notin", label: "Not In" },
      { value: "blank", label: "Is blank" },
      { value: "notblank", label: "Is not blank" },
    ],
    number: [
      { value: "eq", label: "Equals" },
      { value: "neq", label: "Not equals" },
      { value: "gt", label: "Greater than" },
      { value: "lt", label: "Less than" },
      { value: "gte", label: "Greater or equal" },
      { value: "lte", label: "Less or equal" },
      { value: "blank", label: "Is blank" },
      { value: "notblank", label: "Is not blank" },
    ],
    date: [
      { value: "eq", label: "On" },
      { value: "neq", label: "Not on" },
      { value: "gt", label: "After" },
      { value: "lt", label: "Before" },
      { value: "gte", label: "On or after" },
      { value: "lte", label: "On or before" },
      { value: "blank", label: "Is blank" },
      { value: "notblank", label: "Is not blank" },
    ],
    datetime: [
      { value: "eq", label: "On" },
      { value: "neq", label: "Not on" },
      { value: "gt", label: "After" },
      { value: "lt", label: "Before" },
      { value: "gte", label: "On or after" },
      { value: "lte", label: "On or before" },
      { value: "blank", label: "Is blank" },
      { value: "notblank", label: "Is not blank" },
    ],
    boolean: [
      { value: "eq", label: "Equals" },
      { value: "neq", label: "Not equals" },
      { value: "blank", label: "Is blank" },
      { value: "notblank", label: "Is not blank" },
    ],
    lookup: [
      { value: "in", label: "In" },
      { value: "notin", label: "Not In" },
      { value: "blank", label: "Is blank" },
      { value: "notblank", label: "Is not blank" },
    ],
  };

  constructor() {
    this.sourceData = [];
    this.columns = [];
    this.filters = [];
    this.viewRows = [];
    this.listeners = [];
  }

  onChange(listener) {
    this.listeners.push(listener);
  }

  notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this);
      } catch (err) {
        console.error("FilterEngine listener error", err);
      }
    });
  }

  setSheet(record) {
    this.sourceData = Array.isArray(record?.data) ? record.data : [];
    this.columns = Array.isArray(record?.columns) ? record.columns : [];
    if (!this.columns.length && Array.isArray(record?.headers)) {
      this.columns = ColumnSchemaService.inferColumns(record.headers, this.sourceData);
      if (record) record.columns = this.columns;
    }
    this.filters = this.sanitizeFilters(this.filters);
    this.recompute(false);
  }

  getColumns() {
    return this.columns;
  }

  getFilters() {
    return this.filters;
  }

  getViewRows() {
    return this.viewRows;
  }

  getActiveCount() {
    return this.filters.filter((filter) => this.isFilterActive(filter)).length;
  }

  operatorsFor(dataType) {
    return FilterEngine.OPERATORS_BY_TYPE[dataType] || FilterEngine.OPERATORS_BY_TYPE.text;
  }

  defaultOperator(dataType) {
    return this.operatorsFor(dataType)[0].value;
  }

  columnByKey(key) {
    return this.columns.find((column) => column.key === key);
  }

  setFilters(filters, notify = true) {
    this.filters = this.sanitizeFilters(filters || []);
    this.recompute(notify);
  }

  resetFilters(notify = true) {
    this.filters = [];
    this.recompute(notify);
  }

  addFilter(columnKey, notify = true) {
    const column = (columnKey && this.columnByKey(columnKey)) || this.columns[0];
    if (!column) return;
    this.filters.push({
      column: column.key,
      operator: this.defaultOperator(column.dataType),
      value: column.dataType === "lookup" ? [] : "",
    });
    if (notify) this.notify();
  }

  updateFilter(index, changes, notify = true) {
    const current = this.filters[index];
    if (!current) return;
    const next = { ...current, ...changes };
    if (changes.column && changes.column !== current.column) {
      const column = this.columnByKey(changes.column);
      next.operator = this.defaultOperator(column?.dataType || "text");
      next.value = column?.dataType === "lookup" ? [] : "";
    }
    this.filters[index] = next;
    if (notify) this.notify();
  }

  removeFilter(index, notify = true) {
    this.filters.splice(index, 1);
    this.recompute(notify);
  }

  setQuickTextFilter(columnKey, text) {
    const trimmed = (text || "").trim();
    this.upsertFilter(columnKey, "contains", trimmed, !trimmed);
  }

  setQuickLookupFilter(columnKey, values) {
    const list = Array.isArray(values) ? values.filter(Boolean) : [];
    this.upsertFilter(columnKey, "in", list, !list.length);
  }

  setQuickRangeFilter(columnKey, minValue, maxValue) {
    const column = this.columnByKey(columnKey);
    const dataType = column?.dataType || "number";
    this.filters = this.filters.filter((filter) => filter.column !== columnKey);
    if (minValue !== "" && minValue != null) {
      this.filters.push({ column: columnKey, operator: "gte", value: String(minValue) });
    }
    if (maxValue !== "" && maxValue != null) {
      this.filters.push({ column: columnKey, operator: "lte", value: String(maxValue) });
    }
    this.recompute(true);
  }

  setQuickBooleanFilter(columnKey, value) {
    if (value === "" || value == null) {
      this.upsertFilter(columnKey, "eq", "", true);
      return;
    }
    this.upsertFilter(columnKey, "eq", String(value), false);
  }

  upsertFilter(columnKey, operator, value, remove) {
    this.filters = this.filters.filter((filter) => filter.column !== columnKey);
    if (!remove) {
      this.filters.push({ column: columnKey, operator, value });
    }
    this.recompute(true);
  }

  getQuickState(columnKey) {
    const related = this.filters.filter((filter) => filter.column === columnKey);
    const column = this.columnByKey(columnKey);
    const dataType = column?.dataType || "text";
    if (dataType === "text") {
      const contains = related.find((filter) => filter.operator === "contains");
      return { text: contains ? String(contains.value || "") : "" };
    }
    if (dataType === "lookup") {
      const inn = related.find((filter) => filter.operator === "in");
      return { values: Array.isArray(inn?.value) ? inn.value.map(String) : [] };
    }
    if (dataType === "boolean") {
      const eq = related.find((filter) => filter.operator === "eq");
      return { value: eq ? String(eq.value || "") : "" };
    }
    if (dataType === "number" || dataType === "date" || dataType === "datetime") {
      const gte = related.find((filter) => filter.operator === "gte" || filter.operator === "gt");
      const lte = related.find((filter) => filter.operator === "lte" || filter.operator === "lt");
      const eq = related.find((filter) => filter.operator === "eq");
      return {
        min: gte ? String(gte.value || "") : eq ? String(eq.value || "") : "",
        max: lte ? String(lte.value || "") : "",
      };
    }
    return {};
  }

  sanitizeFilters(filters) {
    return (filters || [])
      .map((filter) => {
        const column = this.columnByKey(filter.column);
        if (!column) return null;
        const operators = this.operatorsFor(column.dataType).map((entry) => entry.value);
        const operator = operators.includes(filter.operator) ? filter.operator : this.defaultOperator(column.dataType);
        let value = filter.value;
        if (column.dataType === "lookup" && (operator === "in" || operator === "notin")) {
          value = Array.isArray(value)
            ? value.map(String)
            : String(value || "")
                .split(",")
                .map((entry) => entry.trim())
                .filter(Boolean);
        }
        return { column: column.key, operator, value };
      })
      .filter(Boolean);
  }

  recompute(notify = true) {
    this.viewRows = this.sourceData.filter((row) => this.filters.every((filter) => this.matches(row, filter)));
    if (notify) this.notify();
  }

  isFilterActive(filter) {
    if (!filter) return false;
    if (filter.operator === "blank" || filter.operator === "notblank") return true;
    if (Array.isArray(filter.value)) return filter.value.length > 0;
    return String(filter.value || "").trim() !== "";
  }

  matches(row, filter) {
    if (!this.isFilterActive(filter) && filter.operator !== "blank" && filter.operator !== "notblank") {
      return true;
    }
    const column = this.columnByKey(filter.column);
    const dataType = column?.dataType || "text";
    const raw = row[filter.column];
    const display = ColumnSchemaService.normalizeDisplay(raw);
    const isBlank = display === "";

    if (filter.operator === "blank") return isBlank;
    if (filter.operator === "notblank") return !isBlank;

    if (dataType === "number") {
      const left = Number(String(display).replace(/,/g, ""));
      const right = Number(String(filter.value).replace(/,/g, ""));
      if (Number.isNaN(left) || Number.isNaN(right)) return false;
      switch (filter.operator) {
        case "eq":
          return left === right;
        case "neq":
          return left !== right;
        case "gt":
          return left > right;
        case "lt":
          return left < right;
        case "gte":
          return left >= right;
        case "lte":
          return left <= right;
        default:
          return true;
      }
    }

    if (dataType === "date" || dataType === "datetime") {
      const left = Date.parse(display);
      const right = Date.parse(String(filter.value));
      if (Number.isNaN(left) || Number.isNaN(right)) return false;
      switch (filter.operator) {
        case "eq":
          return dataType === "date" ? display.slice(0, 10) === String(filter.value).slice(0, 10) : left === right;
        case "neq":
          return dataType === "date" ? display.slice(0, 10) !== String(filter.value).slice(0, 10) : left !== right;
        case "gt":
          return left > right;
        case "lt":
          return left < right;
        case "gte":
          return left >= right;
        case "lte":
          return left <= right;
        default:
          return true;
      }
    }

    if (dataType === "boolean") {
      const left = this.toBoolean(display);
      const right = this.toBoolean(filter.value);
      if (filter.operator === "eq") return left === right;
      if (filter.operator === "neq") return left !== right;
      return true;
    }

    if (filter.operator === "in" || filter.operator === "notin") {
      const list = Array.isArray(filter.value) ? filter.value.map(String) : String(filter.value || "").split(",").map((entry) => entry.trim());
      const hit = list.includes(display);
      return filter.operator === "in" ? hit : !hit;
    }

    const left = display.toLowerCase();
    const right = String(filter.value || "").toLowerCase();
    switch (filter.operator) {
      case "eq":
        return left === right;
      case "neq":
        return left !== right;
      case "contains":
        return left.includes(right);
      case "ncontains":
        return !left.includes(right);
      default:
        return true;
    }
  }

  toBoolean(value) {
    const text = String(value || "")
      .trim()
      .toLowerCase();
    return ["yes", "true", "y", "1"].includes(text);
  }
}
