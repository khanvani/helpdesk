// script/service/RequestsService.js

class RequestsService {
  static cache;
  static sewaJathaCache = [];

  constructor() {
    API_URLS.CURRENT_URL = API_URLS.REQUESTS_FETCH;
    this.cache = [];
    this.init();
  }

  async init() {
    this.setupModals();
    this.setupEventHandlers();
    this.loadSewaJathaData();
  }

  refreshCache() {
    if (StorageService.currentRecord?.data) {
      this.cache = StorageService.currentRecord.data;
    }
  }

  async loadSewaJathaData() {
    try {
      // Always fetch fresh data on page load
      const response = await $.ajax({
        url: API_URLS.SEWA_JATHA_FETCH,
        type: "POST",
        dataType: "json",
        data: {
          api_key: localStorage.getItem(API_KEYS.CURRENT_API_KEY),
          nobadge: true,
        },
        crossDomain: true,
      });

      if (response && response["Help Desk"] && response["Help Desk"]["SewaJatha"]) {
        RequestsService.sewaJathaCache = response["Help Desk"]["SewaJatha"].data;
        localStorage.setItem("sewadarsDataCache", JSON.stringify(RequestsService.sewaJathaCache));
        this.setupSewadarDropdowns();
      }
    } catch (error) {
      console.error("Failed to load Sewa Jatha data:", error);
      if (error.status === 401) {
        localStorage.removeItem(API_KEYS.CURRENT_API_KEY);
        $("#apiKeyModal").modal("show");
      }
    }
  }

  setupSewadarDropdowns() {
    const cache = RequestsService.sewaJathaCache || [];

    $(".person").select2({
      placeholder: "Select Sewadar",
      allowClear: true,
      width: "100%",
      minimumResultsForSearch: 0,
      ajax: {
        transport: (params, success) => {
          const searchTerm = params.data.term || "";
          const regex = new RegExp(searchTerm.replace(/\s/g, ".*"), "i");

          const results =
            searchTerm.length === 0
              ? cache.slice(0, 15).map((row) => {
                  const label = `${row.Gr_No} - ${row.Full_Name} - ${row.Satsang_Center || ""}`;
                  return { id: `${row.Gr_No}`, text: label };
                })
              : cache
                  .filter((row) => {
                    const label = `${row.Gr_No} - ${row.Full_Name} - ${row.Satsang_Center || ""}`;
                    return regex.test(label);
                  })
                  .slice(0, 15)
                  .map((row) => {
                    const label = `${row.Gr_No} - ${row.Full_Name} - ${row.Satsang_Center || ""}`;
                    return { id: `${row.Gr_No}`, text: label };
                  });

          success({ results });
        },
        processResults: (data) => ({ results: data.results }),
        delay: 200,
      },
    });

    // Prevent multiple selections like ZonalService
    $(".person").on("select2:select", function (e) {
      try {
        const selectedValue = e.params.data.id;
        $(this).val(selectedValue).trigger("change");
      } catch {
        console.warn("Error selecting person:", e);
      }
    });
  }

  setupModals() {
    // Handle edit for requests using zonal pattern
    $(document).on("click", ".zonal-edit-button", (e) => {
      if (API_URLS.CURRENT_URL === API_URLS.REQUESTS_FETCH) {
        e.preventDefault();
        const rowData = JSON.parse($(e.target).closest("button").attr("data-row"));

        // Prevent editing closed requests
        if (rowData.Status === "Closed") {
          this.showMessage("Info", "Closed requests cannot be edited");
          return;
        }

        this.populateEditModal(rowData);
        $("#editRowModal").modal("show");
      }
    });
  }

  populateEditModal(rowData) {
    console.log("Row data:", rowData);
    console.log("Type value:", rowData.Type);
    const currentStatus = rowData.Status || "Pending";
    const isClosed = currentStatus === "Closed";

    const fields = [
      { name: "Id", value: rowData.Id, type: "hidden" },
      { name: "Gr_No", value: rowData.Gr_No, label: "Gr No", readonly: true },
      { name: "Name", value: rowData.Name, label: "Name", readonly: true },
      {
        name: "Type",
        value: rowData.Type || "Not Found",
        label: "Type",
        type: "text",
        readonly: true,
      },
      {
        name: "Status",
        value: currentStatus,
        label: "Status",
        type: "select",
        options: ["Pending", "Completed", "Closed"],
        readonly: isClosed,
      },
      { name: "Details", value: rowData.Details, label: "Details", readonly: true },
    ];

    // Add Assigned To only for New status
    if (currentStatus === "Pending" || currentStatus === "Draft" || currentStatus === "New") {
      // Keep Draft for backward compatibility
      fields.push({ name: "Assigned_To", value: rowData.Assigned_To, label: "Assigned To", type: "select2" });
    }

    // Add Remarks (mandatory for Closed status)
    fields.push({ name: "Remarks", value: rowData.Remarks, label: "Remarks", type: "textarea", required: currentStatus === "Closed" });

    let html = "";
    fields.forEach((field) => {
      if (field.type === "hidden") {
        html += `<input type="hidden" name="${field.name}" value="${field.value || ""}">`;
      } else {
        const readonly = field.readonly ? "readonly" : "";
        const required = field.required ? "required" : field.readonly ? "" : "";

        html += `<div class="col-md-6 mb-3">
                    <div class="form-group">
                        <label class="font-weight-bold">${field.label}</label>`;

        if (field.type === "select") {
          html += `<select name="${field.name}" class="form-control ${required}" ${readonly} onchange="handleStatusChange(this.value)">`;
          field.options.forEach((option) => {
            const selected = option === field.value ? "selected" : "";
            html += `<option value="${option}" ${selected}>${option}</option>`;
          });
          html += `</select>`;
        } else if (field.type === "select2") {
          const existingValue = field.value || "";
          html += `<select name="${field.name}" multiple="multiple" class="form-control select2 person ${required}" ${readonly} data-existing="${existingValue}"></select>`;
        } else if (field.type === "textarea") {
          html += `<textarea name="${field.name}" class="form-control ${required}" rows="3" ${readonly}>${field.value || ""}</textarea>`;
        } else {
          html += `<input type="text" name="${field.name}" class="form-control ${required}" value="${field.value || ""}" ${readonly}>`;
        }

        html += `</div></div>`;
      }
    });

    $("#dynamicFields").html(`<div class="row">${html}</div>`);

    // Initialize Select2 for edit modal after DOM is ready
    setTimeout(() => {
      this.setupSewadarDropdowns();

      // Set existing values for Assigned To
      const assignedToField = $("select[name='Assigned_To']");
      const existingValue = assignedToField.data("existing");
      if (existingValue) {
        // Find matching sewadar and set the value
        const cache = RequestsService.sewaJathaCache || [];
        const matchingSewadar = cache.find((row) => row.Full_Name === existingValue);
        if (matchingSewadar) {
          const newOption = new Option(
            `${matchingSewadar.Gr_No} - ${matchingSewadar.Full_Name} - ${matchingSewadar.Satsang_Center}`,
            matchingSewadar.Gr_No,
            true,
            true
          );
          assignedToField.append(newOption).trigger("change");
        }
      }

      // Add status change handler
      window.handleStatusChange = (status) => {
        const assignedToRow = $("select[name='Assigned_To']").closest(".col-md-6");
        const remarksField = $("textarea[name='Remarks']");

        if (status === "Completed" || status === "Closed") {
          assignedToRow.hide();
        } else {
          assignedToRow.show();
        }

        if (status === "Closed") {
          remarksField.attr("required", true);
        } else {
          remarksField.removeAttr("required");
        }
      };
    }, 200);
  }

  setupEventHandlers() {
    // New Request Form Submit
    $("#newRequestForm").on("submit", (e) => {
      e.preventDefault();
      this.submitNewRequest();
    });

    // Handle zonal save button for requests
    $(document).on("click", "#zonal-save-btn", (e) => {
      if (API_URLS.CURRENT_URL === API_URLS.REQUESTS_FETCH) {
        e.preventDefault();
        this.updateRequest();
      }
    });

    // New Request Button - add to header
    if (!$("#newRequestTrigger").length) {
      $("#clearStorageTrigger").after(`
                <a href="#" id="newRequestTrigger" class="sidebar-item right force-show">
                    <i class="fas fa-plus"></i>
                    <span class="sidebar-text force-show">New Request</span>
                </a>
            `);
    }

    // New Request Modal Trigger
    $(document).on("click", "#newRequestTrigger", (e) => {
      e.preventDefault();
      // Clear form data
      $("#newRequestForm")[0].reset();
      $("#sewadarGrNo").val("").trigger("change");
      $("#requestType").val("").trigger("change");
      $(".naam-daan-info").remove();
      $("#detailsRequired").hide();
      $("#detailsOptional").show();
      $("#details").removeAttr("required");
      $("#newRequestModal").modal("show");
    });

    // Initialize select2 for request type
    $("#requestType")
      .select2({
        placeholder: "Select Request Type",
        allowClear: true,
        width: "100%",
      })
      .on("change", function () {
        handleRequestTypeChange($(this).val());
      });

    // Add request type change handler
    window.handleRequestTypeChange = (requestType) => {
      const detailsField = $("#details");
      const detailsRequired = $("#detailsRequired");
      const detailsOptional = $("#detailsOptional");
      const sewadarField = $("#sewadarGrNo");
      const sewadarLabel = $("label[for='sewadarGrNo']");

      // Handle sewadar field requirement
      if (requestType === "New Enrollment Request" || requestType === "Others") {
        sewadarField.removeAttr("required");
        sewadarLabel.html("Sewadar Gr. No (Optional)");
      } else {
        sewadarField.attr("required", true);
        sewadarLabel.html("Sewadar Gr. No (Required)");
      }

      // Remove existing info message
      $(".naam-daan-info").remove();

      const detailsRequiredTypes = ["Naam Daan Update", "Zonal Data Update", "Demise Update", "New Enrollment Request", "Others"];
      if (detailsRequiredTypes.includes(requestType)) {
        detailsField.attr("required", true);
        detailsRequired.show();
        detailsOptional.hide();

        // Add specific info for different request types
        let infoMessage = "";
        switch (requestType) {
          case "Naam Daan Update":
            infoMessage = "Please provide Naam Daan Date, Place and Initiated By details in the detail section";
            break;
          case "Zonal Data Update":
            infoMessage = "Please provide updated zonal information details, In case of attachments please send it on queries.sewasamitiahmedabad@gmail.com";
            break;
          case "Demise Update":
            infoMessage = "Please provide Date of Demise and any relevant documentation details";
            break;
          case "New Enrollment Request":
            infoMessage = "Please provide complete personal information for new enrollment, Mobile Number & Name is mandatory";
            break;
          case "Others":
            infoMessage = "Please provide detailed description of your request";
            break;
        }

        if (infoMessage) {
          const infoHtml = `<div class="alert alert-info naam-daan-info mt-2">
            <i class="fas fa-info-circle"></i> ${infoMessage}
          </div>`;
          detailsField.after(infoHtml);
        }
      } else {
        detailsField.removeAttr("required");
        detailsRequired.hide();
        detailsOptional.show();
      }
    };
  }

  async submitNewRequest() {
    const sewadarGrNo = $("#sewadarGrNo").val();
    const selectedData = $("#sewadarGrNo").select2("data")[0];
    const sewadarName = selectedData?.text?.split(" - ")[1] || "";

    const formData = {
      sewadarGrNo: sewadarGrNo,
      sewadarName: sewadarName,
      requestType: $("#requestType").val(),
      details: $("#details").val(),
      api_key: localStorage.getItem(API_KEYS.CURRENT_API_KEY),
    };

    // Check if sewadar is required for this request type
    if (!formData.sewadarGrNo && formData.requestType !== "New Enrollment Request" && formData.requestType !== "Others") {
      this.showMessage("Error", "Please select a Sewadar Gr. No");
      return;
    }

    if (!formData.requestType) {
      this.showMessage("Error", "Please select a Request Type");
      return;
    }

    // Check if details are required for specific request types
    const detailsRequiredTypes = ["Naam Daan Update", "Zonal Data Update", "Demise Update", "New Enrollment Request", "Others"];
    if (detailsRequiredTypes.includes(formData.requestType) && !formData.details.trim()) {
      this.showMessage("Error", "Details are required for " + formData.requestType);
      return;
    }

    // Check for duplicate card requests
    if (formData.requestType === "Duplicate Card" && formData.sewadarGrNo) {
      const table = $("#h-dataTable").DataTable();
      let existingRequest = null;

      table.rows().every(function () {
        const rowData = this.data();
        if (
          rowData.Gr_No === formData.sewadarGrNo[0] &&
          rowData.Type === "Duplicate Card" &&
          (rowData.Status === "Pending" || rowData.Status === "Completed")
        ) {
          existingRequest = rowData;
          return false; // Break the loop
        }
      });

      if (existingRequest) {
        $("#newRequestModal").modal("hide");
        this.showMessage("Error", `A duplicate card request already exists for Gr No ${formData.sewadarGrNo} with status: ${existingRequest.Status}`);
        return;
      }
    }

    $("#loader").show();

    try {
      const response = await $.ajax({
        url: API_URLS.REQUESTS_STORE,
        type: "POST",
        dataType: "json",
        data: formData,
        crossDomain: true,
      });

      $("#loader").hide();

      if (response.success) {
        this.showMessage("Success", "Request created successfully!");
        $("#newRequestModal").modal("hide");
        $("#newRequestForm")[0].reset();
        $("#sewadarGrNo").val("").trigger("change");
        // Refresh page to show updated data
        setTimeout(() => window.location.reload(), 200);
      } else {
        this.showMessage("Error", response.error || "Failed to create request");
      }
    } catch (error) {
      $("#loader").hide();
      console.error("Error creating request:", error);

      if (error.status === 401) {
        localStorage.removeItem(API_KEYS.CURRENT_API_KEY);
        $("#apiKeyModal").modal("show");
      } else {
        this.showMessage("Error", error.responseJSON?.error || "Failed to create request");
      }
    }
  }

  async updateRequest() {
    const assignedToField = $("select[name='Assigned_To']");
    let assignedToName = "";

    if (assignedToField.length > 0 && assignedToField.val()) {
      const assignedToData = assignedToField.select2("data")[0];
      assignedToName = assignedToData?.text?.split(" - ")[1] || assignedToField.val();
    }

    const data = {
      requestId: $("input[name='Id']").val(),
      requestType: $("input[name='Type']").val(),
      requestStatus: $("select[name='Status']").val(),
      assignedTo: assignedToName,
      remarks: $("textarea[name='Remarks']").val(),
      api_key: localStorage.getItem(API_KEYS.CURRENT_API_KEY),
    };

    if (!data.requestId || !data.requestStatus) {
      this.showMessage("Error", "Request ID and Status are required");
      return;
    }
    if (data.requestStatus === "Closed" && !data.remarks.trim()) {
      this.showMessage("Error", "Remarks are mandatory when closing a request");
      return;
    }

    $("#loader").show();

    try {
      const response = await $.ajax({
        url: API_URLS.REQUESTS_UPDATE,
        type: "POST",
        dataType: "json",
        data: data,
        crossDomain: true,
      });

      $("#loader").hide();

      if (response.success) {
        this.showMessage("Success", "Request updated successfully!");
        $("#editRowModal").modal("hide");

        // Update the row in table instead of refreshing
        const table = $("#h-dataTable").DataTable();
        const rowIndex = table
          .rows()
          .indexes()
          .filter((index) => {
            const rowData = table.row(index).data();
            return rowData && rowData.Id == data.requestId;
          })[0];

        if (rowIndex !== undefined) {
          const rowData = table.row(rowIndex).data();
          rowData.Status = data.requestStatus;
          rowData.Assigned_To = data.assignedTo;
          rowData.Remarks = data.remarks;
          rowData.Updated_By = response.updatedBy || "Unknown";
          rowData.Updated_On = new Date().toISOString().slice(0, 19).replace("T", " ");

          table.row(rowIndex).data(rowData).draw();
        }
      } else {
        this.showMessage("Error", response.error || "Failed to update request");
      }
    } catch (error) {
      $("#loader").hide();
      console.error("Error updating request:", error);

      if (error.status === 401) {
        localStorage.removeItem(API_KEYS.CURRENT_API_KEY);
        $("#apiKeyModal").modal("show");
      } else {
        this.showMessage("Error", error.responseJSON?.error || "Failed to update request");
      }
    }
  }

  showMessage(title, message) {
    $("#errorModalLabel").text(title);
    $("#errorModalBody").html(message);
    $("#errorModal").modal("show");
  }

  // Method to add edit buttons to the table - matching zonaldata pattern
  addEditButtons() {
    setTimeout(() => {
      $("#dataTable tbody tr").each(function () {
        const $row = $(this);
        if (!$row.find(".zonal-edit-button").length && !$row.find(".closed-status").length) {
          const rowData = $("#dataTable").DataTable().row($row).data();
          if (rowData) {
            if (rowData.Status === "Closed") {
              const $closedSpan = $(`<span class="text-muted closed-status">Closed</span>`);
              $row.find("td:last").append($closedSpan);
            } else {
              const $editBtn = $(`<button class="btn btn-sm btn-primary zonal-edit-button" data-row='${JSON.stringify(rowData)}'>
                                                  <i class="fas fa-edit"></i>
                                              </button>`);
              $row.find("td:last").append($editBtn);
            }
          }
        }
      });
    }, 100);
  }
}
