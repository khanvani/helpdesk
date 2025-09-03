// script/service/VisitService.js

class VisitService {
  static cache;
  static sewaJathaCache = [];

  constructor() {
    API_URLS.CURRENT_URL = API_URLS.VISIT_FETCH;
    this.cache = [];
    this.init();
  }

  async init() {
    this.setupModals();
    this.setupEventHandlers();
    this.loadSewaJathaData();
    this.setupAreaDropdowns();
    this.setupDepartmentDropdowns();
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
        VisitService.sewaJathaCache = response["Help Desk"]["SewaJatha"].data;
        localStorage.setItem("sewadarsDataCache", JSON.stringify(VisitService.sewaJathaCache));
      }
    } catch (error) {
      console.error("Failed to load Sewa Jatha data:", error);
      if (error.status === 401) {
        localStorage.removeItem(API_KEYS.CURRENT_API_KEY);
        $("#apiKeyModal").modal("show");
      }
    }
  }

  setupAreaDropdowns() {
    // Get areas from SewaJatha.js area data structure
    const areaData = {
      AHEMDABAD: [
        "AHEMDABAD-I",
        "JAMLA",
        "JESAR",
        "PATI",
        "ANODIA",
        "BAVLA",
        "BOTAD",
        "CHALODA",
        "DHANDHUKA",
        "GANDHINAGAR",
        "KALOL",
        "KATHLAL",
        "MODASA",
        "RUDATAL",
        "SURENDRANAGAR",
        "AHMEDABAD-II",
        "AHMEDABAD-IV",
        "NADIAD",
        "BHAVNAGAR",
        "HADALABHAL",
        "KAPADVANJ",
      ],
      MEHSANA: [
        "DEESA",
        "VADGAM",
        "DHOTA SAKLANA",
        "CHHAPI",
        "DHEDHAL",
        "VISNAGAR",
        "KHERALU",
        "PALASAR",
        "UNJHA",
        "VARAHI",
        "RADHANPUR",
        "BALISANA",
        "DESASAN",
        "VADASAN",
        "PALANPUR",
        "MEHSANA",
        "PANCHHA",
        "PATAN",
        "SIDHPUR",
        "NANI KADI",
        "FATEHPURA(GJ)",
        "KAHODA",
      ],
      VALSAD: [
        "CHANDVEGAN",
        "KANJAN RANCHHOD",
        "MOHANA KAUCHALI",
        "ARNAI",
        "DHARMPUR",
        "JOGVEL",
        "NAVERA",
        "MAROLI SANJAN",
        "DUMLAV",
        "SALVAV",
        "RABDI",
        "VAPI",
        "MOTAPONDHA",
        "VALSAD",
        "KILLA PARDI",
        "KUDGAM",
        "SUKHALA",
        "KAPRADA",
      ],
      VADODARA: [
        "ANAND",
        "GODHRA",
        "UMETA",
        "BABALIA",
        "BHANDOI",
        "HALOL",
        "DUNGARI",
        "NAVAGAM",
        "MANDER",
        "NALVAI",
        "DAGERIA",
        "ZALOD",
        "DUDHIA",
        "JALIAPADA",
        "GULTORA",
        "ANOPPURA",
        "MUNAVANI",
        "BHITODI",
        "SAGDAPADA",
        "ABHLOD",
        "VADODARA",
        "WARASIA",
        "DAHOD",
        "JETPUR",
      ],
      SURAT: [
        "SYADALA",
        "KHOLWAD",
        "OLPAD",
        "CHASVAD",
        "BHARUCH",
        "VARACHHA ROAD",
        "BHESTAN",
        "ANKLESHWAR",
        "KOSAD",
        "ABRAMA",
        "MAROLI",
        "UKAI",
        "BAJIPURA",
        "SURAT",
        "BARDOLI",
        "GHALA",
        "NAVSARI",
        "BILIMORA",
      ],
      ADIPUR: ["ADIPUR", "BHUJ", "KOTHARA", "MORBI", "JUNAGADH", "RAJKOT", "JAMNAGAR"],
    };

    const areas = Object.keys(areaData);

    $("#area").select2({
      placeholder: "Select Area",
      allowClear: true,
      width: "100%",
      data: areas.map((area) => ({ id: area, text: area })),
    });

    // Store area data globally for use in handleAreaChange
    window.AREA_DATA = areaData;
  }

  setupDepartmentDropdowns() {
    // Populate department dropdown from DEPARTMENT_SUB_DEPT constant
    const departments = Object.keys(DEPARTMENT_SUB_DEPT);
    const departmentSelect = $("#department");
    
    // Clear existing options except the first one
    departmentSelect.find('option:not(:first)').remove();
    
    // Add departments from DEPARTMENT_SUB_DEPT
    departments.forEach(dept => {
      departmentSelect.append(`<option value="${dept}">${dept}</option>`);
    });
    
    $("#department").select2({
      placeholder: "Select Department",
      allowClear: true,
      width: "100%",
    });

    $("#subDept").select2({
      placeholder: "Select Sub Department",
      allowClear: true,
      width: "100%",
    });
  }

  setupModals() {
    // Handle edit for visits using zonal pattern
    $(document).on("click", ".visit-edit-button", (e) => {
      if (API_URLS.CURRENT_URL === API_URLS.VISIT_FETCH) {
        e.preventDefault();
        const rowData = JSON.parse($(e.target).closest("button").attr("data-row"));
        this.populateEditModal(rowData);
        $("#editRowModal").modal("show");
      }
    });
  }

  populateEditModal(rowData) {
    console.log("Row data:", rowData);
    console.log("Age value:", rowData.Age, "Type:", typeof rowData.Age);
    console.log("Cleaned age:", this.cleanAgeValue(rowData.Age));

    const fields = [
      { name: "Id", value: rowData.Id, type: "hidden" },
      { name: "Gr_No", value: rowData.Gr_No, label: "Gr No", readonly: true },
      { name: "Name", value: rowData.Name, label: "Name", readonly: true },
      { name: "Middle_Name", value: rowData.Middle_Name, label: "Middle Name", readonly: true },
      { name: "Mobile", value: rowData.Mobile, label: "Mobile", readonly: true },
      { name: "Gender", value: rowData.Gender, label: "Gender", readonly: true },
      { name: "DOB", value: rowData.DOB, label: "Date of Birth", readonly: true },
      { name: "Age", value: this.cleanAgeValue(rowData.Age), label: "Age", readonly: true },
      {
        name: "Department",
        value: rowData.Department,
        label: "Department",
        type: rowData.Department === "General" ? "select" : "text",
        readonly: rowData.Department !== "General",
        options:
          rowData.Department === "General"
            ? Object.keys(DEPARTMENT_SUB_DEPT)
            : [],
      },
      {
        name: "Sub_Dept",
        value: rowData.Sub_Dept,
        label: "Sub Department",
        type: rowData.Department === "General" || rowData.Sub_Dept === "General" ? "select" : "select",
        readonly: !(rowData.Department === "General" || rowData.Sub_Dept === "General"),
        options: DEPARTMENT_SUB_DEPT[rowData.Department] || [""],
      },
      { name: "Area", value: rowData.Area, label: "Area", readonly: true },
      { name: "Center", value: rowData.Center, label: "Center", readonly: true },
      { name: "Initiated", value: rowData.Initiated, label: "Initiated", readonly: true },
      { name: "Emergency_Contact", value: rowData.Emergency_Contact, label: "Emergency Contact", readonly: true },
      { name: "Counter", value: rowData.Counter, label: "Counter", readonly: true },
      {
        name: "Status",
        value: rowData.Status || "General",
        label: "Status",
        readonly: true,
      },
      {
        name: "Badge",
        value: rowData.Badge || "Requested",
        label: "Badge",
        type: "select",
        options: ["Requested", "Ready", "Delivered", "Denied"],
        readonly: false,
      },
      { name: "Remarks", value: rowData.Remarks, label: "Remarks", type: "textarea", required: false },
    ];

    let html = "";
    fields.forEach((field) => {
      if (field.type === "hidden") {
        html += `<input type="hidden" name="${field.name}" value="${field.value || ""}">`;
      } else {
        const readonly = field.readonly ? "readonly" : "";
        const required = field.required ? "required" : "";

        html += `<div class="col-md-6 mb-3">
                    <div class="form-group">
                        <label class="font-weight-bold">${field.label}</label>`;

        if (field.type === "select") {
          html += `<select name="${field.name}" class="form-control ${required}" ${readonly} onchange="handleBadgeChange(this.value)" data-original-value="${field.value}">`;
          field.options.forEach((option) => {
            const selected = option === field.value ? "selected" : "";
            html += `<option value="${option}" ${selected}>${option}</option>`;
          });
          html += `</select>`;
        } else if (field.type === "textarea") {
          html += `<textarea name="${field.name}" class="form-control ${required}" rows="3" ${readonly}>${field.value || ""}</textarea>`;
        } else if (field.name === "Age") {
          // Special handling for Age field to ensure it's a clean number
          const cleanAge = this.cleanAgeValue(field.value);
          html += `<input type="number" name="${field.name}" class="form-control ${required}" value="${cleanAge}" ${readonly} min="0" max="150">`;
        } else {
          html += `<input type="text" name="${field.name}" class="form-control ${required}" value="${field.value || ""}" ${readonly}>`;
        }

        html += `</div></div>`;
      }
    });

    $("#dynamicFields").html(`<div class="row">${html}</div>`);

    // Add badge change handler
    window.handleBadgeChange = (badgeStatus) => {
      const departmentField = $("input[name='Department']");
      const subDeptField = $("input[name='Sub_Dept']");

      if (badgeStatus === "Ready") {
        // Make department and sub department editable when badge status is Ready
        if (departmentField.val() === "General") {
          departmentField.prop("readonly", false);
          departmentField.removeClass("form-control").addClass("form-control select2");

          // Also make sub department editable when department is General
          subDeptField.prop("readonly", false);
          subDeptField.removeClass("form-control").addClass("form-control select2");
        }

        if (subDeptField.val() === "General") {
          subDeptField.prop("readonly", false);
          subDeptField.removeClass("form-control").addClass("form-control select2");
        }
      } else {
        // Make fields readonly again for other badge statuses
        departmentField.prop("readonly", true);
        subDeptField.prop("readonly", true);
      }
    };

    // Add department change handler for edit modal
    $(document).on("change", 'select[name="Department"]', function () {
      const department = $(this).val();
      const subDeptSelect = $('select[name="Sub_Dept"]');
      const currentSubDept = subDeptSelect.data("original-value") || "";

      // Clear existing options
      subDeptSelect.empty();

      // Add sub departments based on selected department
      if (department && DEPARTMENT_SUB_DEPT[department]) {
        DEPARTMENT_SUB_DEPT[department].forEach((subDept) => {
          const displayText = subDept === "" ? "Blank" : subDept;
          const selected = subDept === currentSubDept ? "selected" : "";
          subDeptSelect.append(`<option value="${subDept}" ${selected}>${displayText}</option>`);
        });
      }

      // If department is no longer General, make sub department readonly again
      if (department !== "General") {
        subDeptSelect.prop("readonly", true);
        subDeptSelect.removeClass("form-control select2").addClass("form-control");
      }

      subDeptSelect.trigger("change");
    });
  }

  setupEventHandlers() {
    // New Visit Form Submit
    $("#newVisitForm").on("submit", (e) => {
      e.preventDefault();
      this.submitNewVisit();
    });

    // Handle visit save button
    $(document).on("click", "#visit-save-btn", (e) => {
      if (API_URLS.CURRENT_URL === API_URLS.VISIT_FETCH) {
        e.preventDefault();
        this.updateVisit();
      }
    });

    // New Visit Modal Trigger
    $(document).on("click", "#newVisitTrigger", (e) => {
      e.preventDefault();
      // Clear form data
      $("#newVisitForm")[0].reset();
      $("#name").val("");
      $("#middleName").val("");
      $("#mobile").val("");
      $("#gender").val("").trigger("change");
      $("#dob").val("");
      $("#age").val("");
      $("#department").val("").trigger("change");
      $("#subDept").val("").trigger("change");
      $("#area").val("").trigger("change");
      $("#center").val("").trigger("change");
      $("#initiated").val("").trigger("change");
      $("#emergencyContact").val("");
      $("#remarks").val("");
      $("#newVisitModal").modal("show");
    });

    // Department change handler
    window.handleDepartmentChange = () => {
      const department = $("#department").val();
      const subDeptSelect = $("#subDept");

      // Clear existing options
      subDeptSelect.empty().append('<option value="">Select Sub Department</option>');

      // Add sub departments based on selected department
      if (department && DEPARTMENT_SUB_DEPT[department]) {
        DEPARTMENT_SUB_DEPT[department].forEach((subDept) => {
          const displayText = subDept === "" ? "Blank" : subDept;
          subDeptSelect.append(`<option value="${subDept}">${displayText}</option>`);
        });
      }

      subDeptSelect.trigger("change");
    };

    // Area change handler
    window.handleAreaChange = () => {
      const area = $("#area").val();
      const centerSelect = $("#center");

      // Clear existing options
      centerSelect.empty().append('<option value="">Select Center</option>');

      // Add centers based on selected area
      if (area && window.AREA_DATA && window.AREA_DATA[area]) {
        window.AREA_DATA[area].forEach((center) => {
          centerSelect.append(`<option value="${center}">${center}</option>`);
        });
      }

      centerSelect.trigger("change");
    };

    // Age calculation handler
    window.calculateAge = () => {
      const dob = $("#dob").val();
      if (dob) {
        const today = new Date();
        const birthDate = new Date(dob);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }

        $("#age").val(age);
      }
    };
  }

  async submitNewVisit() {
    const formData = {
      name: $("#name").val().trim(),
      middleName: $("#middleName").val().trim(),
      mobile: $("#mobile").val().trim(),
      gender: $("#gender").val(),
      dob: $("#dob").val(),
      age: $("#age").val(),
      department: $("#department").val(),
      subDept: $("#subDept").val(),
      area: $("#area").val(),
      center: $("#center").val(),
      initiated: $("#initiated").val().trim(),
      emergencyContact: $("#emergencyContact").val().trim(),
      remarks: $("#remarks").val().trim(),
      api_key: localStorage.getItem(API_KEYS.CURRENT_API_KEY),
    };

    // Validation
    if (!formData.name) {
      this.showMessage("Error", "Name is required");
      return;
    }

    if (!formData.middleName) {
      this.showMessage("Error", "Middle Name is required");
      return;
    }

    if (!formData.mobile) {
      this.showMessage("Error", "Mobile is required");
      return;
    }

    // Validate mobile number format (10 digits)
    if (!/^[0-9]{10}$/.test(formData.mobile)) {
      this.showMessage("Error", "Mobile number must be 10 digits");
      return;
    }

    if (!formData.gender) {
      this.showMessage("Error", "Gender is required");
      return;
    }

    if (!formData.dob) {
      this.showMessage("Error", "Date of Birth is required");
      return;
    }

    if (!formData.department) {
      this.showMessage("Error", "Department is required");
      return;
    }

    if (!formData.area) {
      this.showMessage("Error", "Area is required");
      return;
    }

    if (!formData.center) {
      this.showMessage("Error", "Center is required");
      return;
    }

    if (!formData.initiated || !["Yes", "No"].includes(formData.initiated)) {
      this.showMessage("Error", "Please select Yes or No for Initiated");
      return;
    }

    // Validate sub department is not blank
    if (formData.subDept === "") {
      this.showMessage("Error", "Sub Department cannot be blank");
      return;
    }

    // Validate emergency contact format if provided (10 digits)
    if (formData.emergencyContact && !/^[0-9]{10}$/.test(formData.emergencyContact)) {
      this.showMessage("Error", "Emergency Contact must be 10 digits");
      return;
    }

    $("#loader").show();

    try {
      const response = await $.ajax({
        url: API_URLS.VISIT_STORE,
        type: "POST",
        dataType: "json",
        data: formData,
        crossDomain: true,
      });

      $("#loader").hide();

      if (response.success) {
        this.showMessage("Success", "Visit record created successfully!");
        $("#newVisitModal").modal("hide");
        $("#newVisitForm")[0].reset();
        // Refresh page to show updated data
        setTimeout(() => window.location.reload(), 200);
      } else {
        this.showMessage("Error", response.error || "Failed to create visit record");
      }
    } catch (error) {
      $("#loader").hide();
      console.error("Error creating visit record:", error);

      if (error.status === 401) {
        localStorage.removeItem(API_KEYS.CURRENT_API_KEY);
        $("#apiKeyModal").modal("show");
      } else {
        this.showMessage("Error", error.responseJSON?.error || "Failed to create visit record");
      }
    }
  }

  async updateVisit() {
    const badgeStatus = $("select[name='Badge']").val();
    const originalBadge = $("select[name='Badge']").data("original-value") || "Requested";
    const department = $("input[name='Department']").val() || $("select[name='Department']").val();
    const subDept = $("input[name='Sub_Dept']").val() || $("select[name='Sub_Dept']").val();

    // Validate department and sub department when badge status is Ready
    if (badgeStatus === "Ready") {
      if (department === "General") {
        this.showMessage("Error", "Department cannot be 'General' when updating badge status to 'Ready'. Please update the department first.");
        return;
      }
      if (subDept === "General" || department === "General") {
        this.showMessage("Error", "Sub Department cannot be 'General' when updating badge status to 'Ready'. Please update the sub department first.");
        return;
      }
    }

    const data = {
      visitId: $("input[name='Id']").val(),
      badgeStatus: badgeStatus,
      department: department,
      subDept: subDept,
      remarks: $("textarea[name='Remarks']").val(),
      api_key: localStorage.getItem(API_KEYS.CURRENT_API_KEY),
    };

    if (!data.visitId) {
      this.showMessage("Error", "Visit ID is required");
      return;
    }

    $("#loader").show();

    try {
      const response = await $.ajax({
        url: API_URLS.VISIT_UPDATE,
        type: "POST",
        dataType: "json",
        data: data,
        crossDomain: true,
      });

      $("#loader").hide();

      if (response.success) {
        // Format the message for better display
        let message = response.message || "Visit record updated successfully!";
        if (response.sewadarName) {
          message = message.replace(/\n/g, "<br>");
        }
        this.showMessage("Success", message);
        $("#editRowModal").modal("hide");

        // Update the row in table instead of refreshing
        const table = $("#h-dataTable").DataTable();
        const rowIndex = table
          .rows()
          .indexes()
          .filter((index) => {
            const rowData = table.row(index).data();
            return rowData && rowData.Id == data.visitId;
          })[0];

        if (rowIndex !== undefined) {
          const rowData = table.row(rowIndex).data();
          rowData.Badge = data.badgeStatus;
          rowData.Department = data.department;
          rowData.Sub_Dept = data.subDept;
          rowData.Remarks = data.remarks;

          // Increment counter if badge status changed from Ready to Delivered
          if (originalBadge === "Ready" && data.badgeStatus === "Delivered") {
            rowData.Counter = (parseInt(rowData.Counter) || 0) + 1;
          }

          // Update age with the calculated value from backend
          if (response.updatedFields && response.updatedFields.Age !== undefined) {
            rowData.Age = response.updatedFields.Age;
          } else if (rowData.Age) {
            // Fallback: ensure age is properly formatted
            rowData.Age = this.cleanAgeValue(rowData.Age);
          }

          rowData.Updated_By = response.updatedBy || "Unknown";
          rowData.Updated_On = new Date().toISOString().slice(0, 19).replace("T", " ");

          // Update remarks with the new combined value
          if (response.updatedFields && response.updatedFields.Remarks !== undefined) {
            rowData.Remarks = response.updatedFields.Remarks;
          }

          table.row(rowIndex).data(rowData).draw();
        }
      } else {
        this.showMessage("Error", response.error || "Failed to update visit record");
      }
    } catch (error) {
      $("#loader").hide();
      console.error("Error updating visit record:", error);

      if (error.status === 401) {
        localStorage.removeItem(API_KEYS.CURRENT_API_KEY);
        $("#apiKeyModal").modal("show");
      } else {
        this.showMessage("Error", error.responseJSON?.error || "Failed to update visit record");
      }
    }
  }

  showMessage(title, message) {
    $("#errorModalLabel").text(title);
    $("#errorModalBody").html(message);
    $("#errorModal").modal("show");
  }

  // Helper method to clean age value
  cleanAgeValue(age) {
    if (!age) return "";

    // Convert to string and remove quotes, apostrophes, and extra whitespace
    let cleanAge = String(age).replace(/['"]/g, "").trim();

    // Remove any HTML entities or special characters
    cleanAge = cleanAge.replace(/&[a-zA-Z]+;/g, "").replace(/[^\w\s]/g, "");

    // Try to convert to number and back to ensure it's a valid age
    const numAge = parseInt(cleanAge);
    if (!isNaN(numAge) && numAge >= 0 && numAge <= 150) {
      return numAge.toString();
    }

    // If not a valid number, return the cleaned string
    return cleanAge;
  }
}
