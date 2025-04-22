class DownloadService {
  constructor(filterService) {
    this.filterService = filterService;
    this.download = this.download.bind(this);
    this.initFilters = this.initFilters.bind(this);
  }

  initFilters() {
    if (Object.keys(StorageService.currentRecord).length > 0) {
    const options = StorageService.currentRecord.headers
      .map((columnObj) =>
        `<option value="${columnObj.data}" ${columnObj.data == "Group_By" ? "selected" : ""}>${columnObj.title}</option>`
      )
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
    $('#apiKeyModal').on('show.bs.modal', function () {
            $(this).removeAttr('aria-hidden');
        });

        $('#apiKeyModal').on('hidden.bs.modal', function () {
            $(this).attr('aria-hidden', 'true');
        });
  }

  async download() {
    try {
      const type = $("#downloadType").val();
      const separateFiles = $("input[name='separateFiles']:checked").val();
      const groupedByType = this.groupDataByType(type);
      await this.createAndPopulateExcelSheets(groupedByType,separateFiles);
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
    const title = $("#titleValue").val() + ` : ${groupbyName.replace(/\b\w/g, c => c.toUpperCase())}  ${gender}`;
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

    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber - 1];
      cell.font = header.font || defaultFont;
      cell.fill = header.fill || defaultFill;
      cell.alignment = header.alignment || defaultAlignment;
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };

      cell.numFmt = header.numFmt || defaultNumFmt;
    });
  }

  async createAndPopulateExcelSheets(groupedByType, separateFiles) {
      const zip = new JSZip();
      let workbook;
      if (separateFiles == 'false') {
          workbook = new ExcelJS.Workbook();
      }

      for (const [type, typeData] of Object.entries(groupedByType)) {
        let sheetName = type.replace(/[&*?:\\/[\]]/g, "").substring(0, 31);
        if (separateFiles == 'true') {
            workbook = new ExcelJS.Workbook();
        }
        const parentFolderColumn = $("#parentFolder").val();
        const parentFolder = typeData && typeData[0] && typeData[0][parentFolderColumn];
        const worksheet = workbook.addWorksheet(sheetName);  // Use 'type' as sheet name for clarity

        let headers = $("#selectColumns").val();
        let selectedValue = $("#selectColumns").val();
        const fileNameSelectValue = $("#downloadType").val();
        if (selectedValue.includes("All")) {
            headers = [];
            $("#selectColumns option:not([value='All'])").each(function () {
              if(this.value != fileNameSelectValue && this.value != parentFolderColumn)
                headers.push(this.value);
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
            width: header.title.includes("Name")
                ? (header.width ?? header.title.length + 15)
                : (header.width ?? header.title.length + 5),
        }));

        this.addHeaderRow(worksheet, headers);
        this.addTitleRow(worksheet, sheetName, "", parentFolder);
        const dataFormat = StorageService.currentRecord.format;
        typeData.forEach((dataRow) => {
            const currentRow = worksheet.addRow(dataRow);
            currentRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const defaultFormat = {
                    font: { bold: false, color: { argb: "000000" } },
                    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF" } },
                    alignment: { horizontal: "left", vertical: "middle" },
                    numFmt: null
                };

                const header = { ...defaultFormat, ...dataFormat[colNumber - 1] };

                cell.font = header.font;
                cell.fill = header.fill;
                cell.alignment = header.alignment;
                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };

                if (header.numFmt) {
                    cell.numFmt = header.numFmt;
                }
            });

        });
        if (separateFiles == 'true') {
            const fileBuffer = await this.getExcelFileBuffer(workbook, type, parentFolder);
            const departmentFolder = zip.folder(parentFolder);
            departmentFolder.file(fileBuffer.filename, fileBuffer.buffer);
        }
      }

    if (separateFiles == 'false') {
        const fileBuffer = await this.getExcelFileBuffer(workbook,  "", "");
        const blob = new Blob([fileBuffer.buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
    filename = filename + (type ? type.replace(/\b\w/g, c => c.toUpperCase()).replace(/ /g, "-").trim() + "-" : "");
    filename = filename + `${dateString}.xlsx`;
    saveAs(blob, filename);
  }
}
