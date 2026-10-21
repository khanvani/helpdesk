class ColumnSchemaService {
  static DATA_TYPES = [
    { value: "text", label: "Text" },
    { value: "number", label: "Number" },
    { value: "date", label: "Date" },
    { value: "datetime", label: "Date & Time" },
    { value: "boolean", label: "Boolean" },
    { value: "lookup", label: "Lookup (list)" },
  ];

  static SAMPLE_SIZE = 200;
  static LOOKUP_MAX_UNIQUE = 40;
  static LOOKUP_MAX_RATIO = 0.3;

  static inferColumns(headers, data) {
    if (!headers || !headers.length) return [];
    return headers
      .filter((header) => header && header.data && header.data !== "_rowFormat")
      .map((header) => {
        const key = header.data;
        const label = header.title != null ? String(header.title) : key;
        const dataType = ColumnSchemaService.inferDataType(data, key);
        return {
          key,
          label,
          dataType,
          uniqueValues: dataType === "lookup" || dataType === "boolean" ? ColumnSchemaService.uniqueValues(data, key) : [],
        };
      });
  }

  static inferDataType(data, key) {
    const samples = [];
    for (let i = 0; i < (data || []).length && samples.length < ColumnSchemaService.SAMPLE_SIZE; i++) {
      const raw = data[i] ? data[i][key] : null;
      if (raw === null || raw === undefined || String(raw).trim() === "") continue;
      samples.push(raw);
    }
    if (!samples.length) return "text";

    let numberHits = 0;
    let dateHits = 0;
    let datetimeHits = 0;
    let booleanHits = 0;
    const unique = new Set();

    samples.forEach((value) => {
      unique.add(ColumnSchemaService.normalizeDisplay(value));
      if (ColumnSchemaService.isBooleanLike(value)) booleanHits++;
      else if (ColumnSchemaService.isNumberLike(value)) numberHits++;
      else {
        const kind = ColumnSchemaService.dateKind(value);
        if (kind === "datetime") datetimeHits++;
        else if (kind === "date") dateHits++;
      }
    });

    const n = samples.length;
    if (booleanHits / n >= 0.85) return "boolean";
    if (numberHits / n >= 0.8) return "number";
    if ((datetimeHits + dateHits) / n >= 0.7) {
      return datetimeHits >= dateHits ? "datetime" : "date";
    }

    const totalRows = Math.max((data || []).length, 1);
    if (unique.size > 1 && unique.size <= ColumnSchemaService.LOOKUP_MAX_UNIQUE && unique.size / totalRows <= ColumnSchemaService.LOOKUP_MAX_RATIO) {
      return "lookup";
    }
    return "text";
  }

  static uniqueValues(data, key) {
    const values = new Set();
    (data || []).forEach((row) => {
      const text = ColumnSchemaService.normalizeDisplay(row[key]);
      if (text !== "") values.add(text);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }));
  }

  static refreshUniqueValues(column, data) {
    if (!column) return;
    if (column.dataType === "lookup" || column.dataType === "boolean") {
      column.uniqueValues = ColumnSchemaService.uniqueValues(data, column.key);
    } else {
      column.uniqueValues = [];
    }
  }

  static applyDataType(columns, key, dataType, data) {
    const column = (columns || []).find((entry) => entry.key === key);
    if (!column) return columns;
    column.dataType = dataType;
    ColumnSchemaService.refreshUniqueValues(column, data);
    return columns;
  }

  static normalizeDisplay(value) {
    if (value === null || value === undefined) return "";
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "object") {
      if (value.text != null) return String(value.text).trim();
      if (value.result != null) return ColumnSchemaService.normalizeDisplay(value.result);
      if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || "").join("").trim();
    }
    return String(value).trim();
  }

  static isBooleanLike(value) {
    const text = ColumnSchemaService.normalizeDisplay(value).toLowerCase();
    return ["yes", "no", "true", "false", "y", "n", "0", "1"].includes(text);
  }

  static isNumberLike(value) {
    if (typeof value === "number" && Number.isFinite(value)) return true;
    const text = ColumnSchemaService.normalizeDisplay(value).replace(/,/g, "");
    if (!text || /[a-zA-Z]/.test(text)) return false;
    return !Number.isNaN(Number(text)) && text !== "";
  }

  static dateKind(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.getHours() || value.getMinutes() || value.getSeconds() ? "datetime" : "date";
    }
    const text = ColumnSchemaService.normalizeDisplay(value);
    if (!text) return null;
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(text) || /^\d{1,2}\/\d{1,2}\/\d{2,4}\s+\d{1,2}:\d{2}/.test(text)) {
      const parsed = Date.parse(text);
      return Number.isNaN(parsed) ? null : "datetime";
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(text) || /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(text)) {
      const parsed = Date.parse(text);
      return Number.isNaN(parsed) ? null : "date";
    }
    const parsed = Date.parse(text);
    if (!Number.isNaN(parsed) && /[\/\-]/.test(text) && !ColumnSchemaService.isNumberLike(value)) {
      return text.includes(":") ? "datetime" : "date";
    }
    return null;
  }
}
