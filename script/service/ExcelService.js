class ExcelService {
  constructor(storageService) {
    this.storageService = storageService;
    this.uploadAndProcessFile = this.uploadAndProcessFile.bind(this);
    this.getSheetData = this.getSheetData.bind(this);
    this.getHeaders = this.getHeaders.bind(this);
    this.getFormat = this.getFormat.bind(this);
    this.reloadFiles = this.reloadFiles.bind(this);
    this.call = this.call.bind(this);
    this.storeResponse = this.storeResponse.bind(this);
    this.processSheets = this.processSheets.bind(this);
    this.detectHeaderRow = this.detectHeaderRow.bind(this);
    this.cellToPlainText = this.cellToPlainText.bind(this);
  }

  async call() {
    if (window.OFFLINE_MODE) {
      return Promise.reject(new Error("Cloud sync is disabled in offline mode"));
    }
    try {
      const apiKey = localStorage.getItem(API_KEYS.CURRENT_API_KEY);
      $("#loader").show();

      const response = await $.ajax({
        url: API_URLS.CURRENT_URL,
        type: "POST",
        dataType: "json",
        data: { api_key: apiKey },
        crossDomain: true, // Enable CORS
      });

      await this.storeResponse(response);
      this.reloadFiles();
      $("#loader").hide();
      return response;
    } catch (error) {
      console.error("Error in fetching data:", error);
      $("#loader").hide();
      if (error.status != 200) {
        $("#apiKeyModal").modal("hide");
        $("#apiKeyModal").attr("aria-hidden", "true");
        $("#errorAPIKey").hide();
        $("#errorModal").modal("show");
        let errorMessage = [error.responseJSON?.error, error.responseJSON?.message].filter(Boolean).join("<br>");

        $("#errorModalBody").html(errorMessage);
      }
      throw error;
    }
  }

  cellToPlainText(value) {
    if (value == null) return "";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value).trim();
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "object") {
      if (value.text != null) return String(value.text).trim();
      if (value.result != null) return this.cellToPlainText(value.result);
      if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || "").join("").trim();
    }
    return String(value).trim();
  }

  headerKey(value, fallbackIndex) {
    const text = this.cellToPlainText(value);
    const key = text.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    if (key) return key;
    return typeof fallbackIndex === "number" ? `Column_${fallbackIndex}` : "";
  }

  detectHeaderRow(sheet) {
    const rows = sheet.getSheetValues() || [];
    const maxScan = Math.min(Math.max(rows.length - 1, 0), 25);
    if (maxScan < 1) return 1;

    let bestRow = 1;
    let bestScore = -Infinity;

    for (let r = 1; r <= maxScan; r++) {
      const row = rows[r] || [];
      const cells = [];
      for (let c = 1; c < row.length; c++) {
        cells.push(row[c]);
      }
      while (cells.length && this.cellToPlainText(cells[cells.length - 1]) === "") {
        cells.pop();
      }

      const nonEmpty = cells.filter((value) => this.cellToPlainText(value) !== "");
      if (nonEmpty.length < 2) continue;

      let score = nonEmpty.length * 2;
      let textLike = 0;
      let numericLike = 0;

      nonEmpty.forEach((value) => {
        if (typeof value === "number" || value instanceof Date) {
          numericLike++;
          return;
        }
        const text = this.cellToPlainText(value);
        if (text !== "" && !Number.isNaN(Number(text)) && text.length <= 12) {
          numericLike++;
        } else {
          textLike++;
        }
      });

      score += textLike * 3;
      score -= numericLike * 2;

      const labels = nonEmpty.map((value) => this.cellToPlainText(value).toLowerCase());
      const unique = new Set(labels);
      score += unique.size;
      if (unique.size === labels.length) score += 5;

      const excelRow = sheet.getRow(r);
      let boldCount = 0;
      excelRow.eachCell({ includeEmpty: false }, (cell) => {
        if (cell.font?.bold) boldCount++;
      });
      score += boldCount * 2;

      const next = rows[r + 1] || [];
      const nextNonEmpty = [];
      for (let c = 1; c < next.length; c++) {
        if (this.cellToPlainText(next[c]) !== "") nextNonEmpty.push(next[c]);
      }
      if (nextNonEmpty.length >= Math.ceil(nonEmpty.length * 0.5)) score += 4;
      if (nonEmpty.length <= 2 && nextNonEmpty.length > nonEmpty.length + 2) score -= 5;

      if (score > bestScore) {
        bestScore = score;
        bestRow = r;
      }
    }

    return bestRow;
  }

  async uploadAndProcessFile(event) {
    let files = event.target.files;
    if (!files || files.length === 0) return;

    $("#loader").show();
    try {
      for (let file of files) {
        try {
          const buffer = await file.arrayBuffer();
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer);

          let sheets = this.processSheets(workbook);
          if (Object.keys(sheets).length > 0) {
            this.storeProcessedData(file.name, sheets);
          }
        } catch (err) {
          alert("Error processing Excel file: " + file.name + " - " + err.message);
        }
      }
    } finally {
      $("#loader").hide();
    }
  }

  async storeResponse(response) {
    let sheets = {};
    Object.entries(response).forEach(([fileName, fileData]) => {
      Object.entries(fileData).forEach(([sheetName, sheet]) => {
        if (sheet.data?.length) {
          sheets[sheetName] = this.normalizeSheet(sheet);
        }
      });
      if (Object.keys(sheets).length > 0) {
        this.storeProcessedData(fileName, sheets);
      }
    });
  }

  processSheets(workbook, startingRow) {
    let sheets = {};
    workbook.eachSheet((sheet) => {
      const headerRow = startingRow || this.detectHeaderRow(sheet);
      const headers = this.getHeaders(sheet, headerRow);
      if (!headers.length) return;
      const data = this.getSheetData(sheet, headerRow, headers);
      if (data.length > 0) {
        const sheetData = {
          data,
          headers,
          format: this.getFormat(sheet, headerRow),
        };
        if (window.OFFLINE_MODE && typeof ColumnSchemaService !== "undefined") {
          sheetData.columns = ColumnSchemaService.inferColumns(headers, data);
        }
        sheets[sheet.name] = sheetData;
      }
    });
    return sheets;
  }

  storeProcessedData(fileName, sheets) {
    StorageService.currentFile = fileName;
    StorageService.currentSheet = Object.keys(sheets)[0];
    StorageService.currentData[fileName] = sheets;
    StorageService.currentRecord = JSON.parse(JSON.stringify(sheets[StorageService.currentSheet]));
    try {
      this.storageService.setCurrentData(StorageService.currentData);
    } catch {
      console.warn("Data could not be saved to Storage, but it is still available in cache.");
    }
    this.reloadFiles();
  }

  normalizeSheet(sheet) {
    return {
      data: sheet.data.map((row) => {
        const normalizedRow = Object.fromEntries(
          Object.entries(row).map(([key, value]) => [this.headerKey(key) || String(key), value])
        );
        // Ensure _rowFormat exists for API data
        if (!normalizedRow._rowFormat) {
          normalizedRow._rowFormat = [];
        }
        return normalizedRow;
      }),
      headers: sheet.headers.map((value, index) => {
        const title = this.cellToPlainText(value);
        return {
          data: this.headerKey(value, index + 1),
          title: title || `Column ${index + 1}`,
        };
      }),
      format: [],
    };
  }

  getSheetData(sheet, startingRow, headerDefs = null) {
    const headers = Array.isArray(headerDefs) && headerDefs.length ? headerDefs : this.getHeaders(sheet, startingRow);
    const jsonData = sheet.getSheetValues().slice(startingRow - 1);
    const maxCol = headers.reduce((max, header) => Math.max(max, Number(header.colNumber) || 0), 0);

    return jsonData.slice(2).map((row, rowIndex) => {
      const rowData = {};
      headers.forEach((header) => {
        const index = Number(header.colNumber) || 0;
        if (!header.data || !index) return;
        const cell = row?.[index];
        rowData[header.data] = cell == null || cell === "" ? "" : cell;
      });

      // Add row formatting information
      rowData._rowFormat = this.getRowFormat(sheet, startingRow + 1 + rowIndex, maxCol);

      return rowData;
    });
  }

  getRowFormat(sheet, rowNumber, columnCount) {
    const row = sheet.getRow(rowNumber);
    const rowFormat = [];

    for (let colNumber = 1; colNumber <= columnCount; colNumber++) {
      const cell = row.getCell(colNumber);

      // Extract font properties
      const font = {
        bold: cell.font?.bold || false,
        italic: cell.font?.italic || false,
        underline: cell.font?.underline || false,
        size: cell.font?.size || 11,
        name: cell.font?.name || "Calibri",
        color: cell.font?.color?.argb || { argb: "000000" },
      };

      // Extract fill properties
      const fill = {
        type: cell.fill?.type || "pattern",
        pattern: cell.fill?.pattern || "solid",
        fgColor: cell.fill?.fgColor || { argb: "FFFFFF" },
        bgColor: cell.fill?.bgColor || { argb: "FFFFFF" },
      };

      // Extract alignment properties
      const alignment = {
        horizontal: cell.alignment?.horizontal || "left",
        vertical: cell.alignment?.vertical || "middle",
        wrapText: cell.alignment?.wrapText || false,
        shrinkToFit: cell.alignment?.shrinkToFit || false,
        indent: cell.alignment?.indent || 0,
      };

      // Extract number format
      const numFmt = cell.numFmt || null;

      const cellFormat = {
        font: font,
        fill: fill,
        alignment: alignment,
        numFmt: numFmt,
      };

      // Debug: Log if we find non-default formatting
      if (cell.fill?.fgColor?.argb && cell.fill.fgColor.argb !== "FFFFFF") {
        console.log(`Row ${rowNumber}, Col ${colNumber}: Found background color ${cell.fill.fgColor.argb}`);
      }

      rowFormat.push(cellFormat);
    }

    return rowFormat;
  }

  getHeaders(sheet, startingRow) {
    const row = sheet.getRow(startingRow);
    const headers = [];
    const usedKeys = new Set();
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const title = this.cellToPlainText(cell.value);
      if (!title) return;
      let data = this.headerKey(cell.value, colNumber);
      if (usedKeys.has(data)) data = `${data}_${colNumber}`;
      usedKeys.add(data);
      headers.push({
        data,
        title,
        colNumber,
        width: sheet.getColumn(colNumber).width,
        // Get the header cell color if available; returns ARGB value or null
        color: cell.fill && cell.fill.fgColor ? cell.fill.fgColor.argb : null,
      });
    });
    return headers;
  }

  getFormat(sheet, startingRow) {
    // Use getRowFormat for the header row to ensure identical logic
    return this.getRowFormat(sheet, startingRow, sheet.getRow(startingRow).cellCount);
  }

  reloadFiles() {
    if (Object.keys(StorageService.currentRecord).length > 0) {
      $("#fileNamesCombo, #sheetNamesCombo").empty();
      Object.keys(StorageService.currentData).forEach((key) => $("#fileNamesCombo").append(new Option(key, key)));
      Object.keys(StorageService.currentData[StorageService.currentFile]).forEach((key) => $("#sheetNamesCombo").append(new Option(key, key)));
    }
    if (window.OFFLINE_MODE && typeof window.updateQueryStudioSheetControl === "function") {
      window.updateQueryStudioSheetControl();
    }
  }
}
