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
  }

  async call() {
    try {
      const apiKey = localStorage.getItem(API_KEYS.CURRENT_API_KEY);
      $("#loader").show();

      const response = await $.ajax({
        url: API_URLS.CURRENT_URL,
        type: "POST",
        dataType: "json",
        data: { api_key: apiKey },
      });

      await this.storeResponse(response);
      this.reloadFiles();
      $("#loader").hide();
      return response;
    } catch (error) {
      console.error("Error in fetching data:", error);
      $("#loader").hide();
      if (error.status === 401) {
        $("#errorAPIKey").show();

        let errorMessage = [error.responseJSON?.error, error.responseJSON?.message].filter(Boolean).join("<br>");
        $("#errorModalLabel").html();
        $("#errorAPIKey").html(errorMessage);
        $("#apiKeyModal").removeAttr("aria-hidden");
        $("#apiKeyModal").modal("show");
      } else if (error.status != 200) {
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

  async uploadAndProcessFile(event) {
    let files = event.target.files;
    let startingRow = parseInt(prompt("Enter the starting row number for the table (headers row):", "1"));
    if (isNaN(startingRow) || startingRow < 1) return;

    for (let file of files) {
      try {
        const buffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        let sheets = this.processSheets(workbook, startingRow);
        if (Object.keys(sheets).length > 0) {
          this.storeProcessedData(file.name, sheets);
        }
      } catch (err) {
        alert("Error processing Excel file: " + file.name + " - " + err.message);
      }
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
      let data = this.getSheetData(sheet, startingRow);
      if (data.length > 0) {
        sheets[sheet.name] = {
          data,
          headers: this.getHeaders(sheet, startingRow),
          format: this.getFormat(sheet, startingRow),
        };
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
        const normalizedRow = Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim().replace(/[^a-zA-Z0-9]+/g, "_"), value]));
        // Ensure _rowFormat exists for API data
        if (!normalizedRow._rowFormat) {
          normalizedRow._rowFormat = [];
        }
        return normalizedRow;
      }),
      headers: sheet.headers.map((value) => ({
        data: typeof value === "string" ? value.trim().replace(/[^a-zA-Z0-9]+/g, "_") : value,
        title: value,
      })),
      format: [],
    };
  }

  getSheetData(sheet, startingRow) {
    const jsonData = sheet.getSheetValues().slice(startingRow - 1);
    const headers = sheet.getRow(startingRow).values.map((header) => (typeof header === "string" ? header.trim() : header));

    return jsonData.slice(2).map((row, rowIndex) => {
      const rowData = headers.reduce((obj, header, index) => {
        obj[header.replace(/\s+/g, "_")] = row[index] || "";
        return obj;
      }, {});

      // Add row formatting information
      rowData._rowFormat = this.getRowFormat(sheet, startingRow + 2 + rowIndex, headers.length);

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
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const value = cell.value;
      headers.push({
        data: typeof value === "string" ? value.trim().replace(/\s+/g, "_") : value,
        title: value,
        width: sheet.getColumn(colNumber).width,
        // Get the header cell color if available; returns ARGB value or null
        color: cell.fill && cell.fill.fgColor ? cell.fill.fgColor.argb : null,
      });
    });
    return headers.filter((header) => header.title);
  }

  getFormat(sheet, startingRow) {
    const row = sheet.getRow(startingRow);
    const format = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const value = cell.value;

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

      format.push({
        data: typeof value === "string" ? value.trim().replace(/\s+/g, "_") : value,
        title: value,
        width: sheet.getColumn(colNumber).width,
        font: font,
        fill: fill,
        alignment: alignment,
        numFmt: numFmt,
      });
    });
    return format.filter((column) => column.title);
  }

  reloadFiles() {
    if (Object.keys(StorageService.currentRecord).length > 0) {
      $("#fileNamesCombo, #sheetNamesCombo").empty();
      Object.keys(StorageService.currentData).forEach((key) => $("#fileNamesCombo").append(new Option(key, key)));
      Object.keys(StorageService.currentData[StorageService.currentFile]).forEach((key) => $("#sheetNamesCombo").append(new Option(key, key)));
    }
  }
}
