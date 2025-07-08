class DownloadService {
  constructor(filterService) {
    this.filterService = filterService;
    this.download = this.download.bind(this);
    this.initFilters = this.initFilters.bind(this);
  }

  initFilters() {
    if (Object.keys(StorageService.currentRecord).length > 0) {
      const options = StorageService.currentRecord.headers
        .map((columnObj) => `<option value="${columnObj.data}" ${columnObj.data == "Group_By" ? "selected" : ""}>${columnObj.title}</option>`)
        .join("");
      const AllOptions = StorageService.currentRecord.headers.map((columnObj) => `<option value="${columnObj.data}">${columnObj.title}</option>`).join("");
      let selectHtml = `
    <div class="form-group">
      <label for="selectColumns">Select Columns to Display</label>
      <select id="selectColumns" class="form-control" multiple data-live-search="true">
      <option value="All" selected>All</option>
      ${AllOptions}
      </select>
    </div>`;
      $("#selectColumnContainer").html(selectHtml);
      $("#selectColumns").selectpicker();

      selectHtml = `
    <div class="form-group">
      <label for="downloadType">Download Files Group By : </label>
      <select id="downloadType" class="form-control" data-live-search="true">
        ${options}
      </select>
    </div>`;
      $("#downloadTypeContainer").html(selectHtml);
      $("#downloadType").selectpicker();
      selectHtml = `
         <div class="form-group">
           <label for="parentFolder">Parent Folders:</label>
           <select id="parentFolder" class="form-control" data-live-search="true">
             ${options}
           </select>
         </div>
         <div class="form-group">
           <label>Download By:</label>
           <div>
             <label>
               <input type="radio" name="separateFiles" value="true" checked> Separate Files
             </label>
           </div>
           <div>
             <label>
               <input type="radio" name="separateFiles" value="false"> Separate Sheets
             </label>
           </div>
         </div>`;

      $("#parentFolderContainer").html(selectHtml);
      $("#parentFolder").selectpicker();
    }
    $("#apiKeyModal").on("show.bs.modal", function () {
      $(this).removeAttr("aria-hidden");
    });

    $("#apiKeyModal").on("hidden.bs.modal", function () {
      $(this).attr("aria-hidden", "true");
    });
  }

  async download() {
    try {
      const type = $("#downloadType").val();
      const separateFiles = $("input[name='separateFiles']:checked").val();
      const groupedByType = this.groupDataByType(type);
      await this.createAndPopulateExcelSheets(groupedByType, separateFiles);
    } catch (error) {
      console.error(error);
      alert("Failed to download files. See console for details.");
    }
  }

  groupDataByType(type) {
    return StorageService.currentRecord.data.reduce((acc, item) => {
      let key = (item[type] || "").toLowerCase(); // Convert key to lowercase
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }

  addTitleRow(worksheet, groupbyName, gender, parentFolder) {
    //const department = parentFolder ? parentFolder + " - " : "";
    const title = $("#titleValue").val() + ` : ${groupbyName.replace(/\b\w/g, (c) => c.toUpperCase())}  ${gender}`;
    const titleRow = worksheet.getRow(1);
    titleRow.values = [title];
    titleRow.font = { size: 18, bold: true };
    titleRow.getCell(1).alignment = { horizontal: "center" };
    titleRow.commit();
    worksheet.mergeCells(1, 1, 1, worksheet.columns.length);
  }

  addHeaderRow(worksheet, headers) {
    const defaultFont = { bold: true, size: 12, name: "Arial" };
    const defaultFill = { type: "pattern", pattern: "solid", fgColor: { argb: "d0d3d4" } };
    const defaultAlignment = { horizontal: "center", vertical: "middle" };
    const defaultNumFmt = "@";

    const headerRow = worksheet.addRow(headers.map((header) => header.title));

    // Map header format to match the current header order
    const originalHeaders = StorageService.currentRecord.headers || [];
    const originalFormat = StorageService.currentRecord.format || [];
    const mappedHeaderFormat = headers.map((header) => {
      const origIdx = originalHeaders.findIndex((h) => h.data === header.data);
      return origIdx !== -1 ? originalFormat[origIdx] : {};
    });

    // Set row height if available
    if (mappedHeaderFormat[0] && mappedHeaderFormat[0].rowHeight) {
      headerRow.height = mappedHeaderFormat[0].rowHeight;
    }

    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber - 1];
      const format = mappedHeaderFormat[colNumber - 1] || {};
      cell.font = format.font || header.font || defaultFont;
      cell.fill = format.fill || header.fill || defaultFill;
      cell.alignment = format.alignment || header.alignment || defaultAlignment;
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.numFmt = format.numFmt || header.numFmt || defaultNumFmt;
    });
  }

  async createAndPopulateExcelSheets(groupedByType, separateFiles) {
    const zip = new JSZip();
    let workbook;
    if (separateFiles == "false") {
      workbook = new ExcelJS.Workbook();
    }

    for (const [type, typeData] of Object.entries(groupedByType)) {
      let sheetName = type.replace(/[&*?:\\/[\]]/g, "").substring(0, 31);
      if (separateFiles == "true") {
        workbook = new ExcelJS.Workbook();
      }
      const parentFolderColumn = $("#parentFolder").val();
      const groupByColumn = $("#downloadType").val();
      const isSameFolderAndGroupBy = parentFolderColumn === groupByColumn;
      const worksheet = workbook.addWorksheet(sheetName); // Use 'type' as sheet name for clarity

      let headers = $("#selectColumns").val();
      let selectedValue = $("#selectColumns").val();
      const fileNameSelectValue = $("#downloadType").val();
      if (selectedValue.includes("All")) {
        headers = [];
        $("#selectColumns option:not([value='All'])").each(function () {
          if (this.value != fileNameSelectValue && this.value != parentFolderColumn) headers.push(this.value);
        });
      }
      headers = $.map(headers, function (key) {
        var obj = $.grep(StorageService.currentRecord.headers, function (o) {
          return o.data === key;
        })[0];
        return obj ? obj : null;
      });

      worksheet.columns = headers.map((header) => ({
        header: header.title,
        key: header.title.trim().replace(/[\s.]+/g, "_"),
        width: header.title.includes("Name") ? header.width ?? header.title.length + 15 : header.width ?? header.title.length + 5,
      }));

      this.addHeaderRow(worksheet, headers);
      this.addTitleRow(worksheet, sheetName, "", parentFolder);
      const dataFormat = StorageService.currentRecord.format;

      // Create a mapping from selected column indices to original column indices
      const originalHeaders = StorageService.currentRecord.headers;
      const columnMapping = headers.map((selectedHeader, selectedIndex) => {
        const originalIndex = originalHeaders.findIndex((header) => header.data === selectedHeader.data);
        return { selectedIndex, originalIndex };
      });

      // Debug: Log column mapping information
      console.log("Column Mapping:", {
        originalHeadersCount: originalHeaders.length,
        selectedHeadersCount: headers.length,
        mapping: columnMapping.map((m) => ({
          selectedIndex: m.selectedIndex,
          originalIndex: m.originalIndex,
          headerData: headers[m.selectedIndex]?.data,
          headerTitle: headers[m.selectedIndex]?.title,
        })),
      });

      // Check if the first selected column is a serial number column
      const srNoColumnNames = ["sr no", "sr_no", "sr. no", "serial no", "serial_no", "serial number"];
      const isSrNoFirstColumn = headers.length > 0 && srNoColumnNames.includes(headers[0].title.toString().trim().toLowerCase());

      typeData.forEach((dataRow, rowIndex) => {
        // Clone the dataRow to avoid mutating the original
        const rowToAdd = { ...dataRow };
        if (isSrNoFirstColumn) {
          // Overwrite the value for the first column with the serial number (1-based)
          const firstHeaderKey = headers[0].data;
          rowToAdd[firstHeaderKey] = rowIndex + 1;
        }
        const currentRow = worksheet.addRow(rowToAdd);
        currentRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const defaultFormat = {
            font: { bold: false, color: { argb: "000000" } },
            fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF" } },
            alignment: { horizontal: "left", vertical: "middle" },
            numFmt: null,
          };

          // Get the mapping for this column
          const mapping = columnMapping[colNumber - 1];
          const originalColumnIndex = mapping && mapping.originalIndex >= 0 ? mapping.originalIndex : colNumber - 1;

          // Use row-specific formatting if available, otherwise fall back to header format
          const rowFormat = dataRow._rowFormat && dataRow._rowFormat[originalColumnIndex] ? dataRow._rowFormat[originalColumnIndex] : null;
          const headerFormat = dataFormat && dataFormat[originalColumnIndex] ? dataFormat[originalColumnIndex] : {};
          const finalFormat = { ...defaultFormat, ...headerFormat, ...rowFormat };

          // Debug: Log formatting information for first few rows
          if (rowIndex < 3 && colNumber === 1) {
            console.log(`Row ${rowIndex + 1}:`, {
              hasRowFormat: !!dataRow._rowFormat,
              rowFormatLength: dataRow._rowFormat ? dataRow._rowFormat.length : 0,
              selectedColumnIndex: colNumber - 1,
              originalColumnIndex: originalColumnIndex,
              finalFillColor: finalFormat.fill?.fgColor?.argb,
            });
          }

          // Apply formatting with error handling
          try {
            cell.font = finalFormat.font;
            cell.fill = finalFormat.fill;
            cell.alignment = finalFormat.alignment;
            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };

            if (finalFormat.numFmt) {
              cell.numFmt = finalFormat.numFmt;
            }
          } catch (error) {
            console.warn(`Error applying formatting to cell ${colNumber}:`, error);
            // Apply default formatting as fallback
            cell.font = defaultFormat.font;
            cell.fill = defaultFormat.fill;
            cell.alignment = defaultFormat.alignment;
            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
          }
        });
      });
      if (separateFiles == "true") {
        const fileBuffer = await this.getExcelFileBuffer(workbook, type, parentFolder);
        if (!isSameFolderAndGroupBy && parentFolder) {
          const departmentFolder = zip.folder(parentFolder);
          departmentFolder.file(fileBuffer.filename, fileBuffer.buffer);
        } else {
          zip.file(fileBuffer.filename, fileBuffer.buffer);
        }
      }
    }

    if (separateFiles == "false") {
      const fileBuffer = await this.getExcelFileBuffer(workbook, "", "");
      const blob = new Blob([fileBuffer.buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(blob, fileBuffer.filename);
    } else {
      zip.generateAsync({ type: "blob" }).then(function (content) {
        const dateString = new Date().toISOString().split("T")[0].replace(/-/g, "");
        saveAs(content, `output-${dateString}.zip`);
      });
    }
  }

  async getExcelFileBuffer(workbook, type, parentFolder) {
    const buffer = await workbook.xlsx.writeBuffer();
    const dateString = new Date().toISOString().split("T")[0].replace(/-/g, "");
    let filename = "";
    filename += $("#fileNameValue").val() ? $("#fileNameValue").val().trim() + "-" : "";
    filename += type ? type.replace(/ /g, "-").trim() + "-" : "";
    filename += `${dateString}.xlsx`;
    return {
      filename,
      buffer,
    };
  }
  async downloadExcelFile(workbook, type) {
    const buffer = await workbook.xlsx.writeBuffer();
    const dateString = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    let filename = $("#fileNameValue").val() ? $("#fileNameValue").val().trim() + "-" : "";
    filename =
      filename +
      (type
        ? type
            .replace(/\b\w/g, (c) => c.toUpperCase())
            .replace(/ /g, "-")
            .trim() + "-"
        : "");
    filename = filename + `${dateString}.xlsx`;
    saveAs(blob, filename);
  }
}
