// Define validateAndAddEntry in the global scope

document.addEventListener("DOMContentLoaded", () => {
  const $ = window.jQuery;
  const cachedDataKey = "sewadarsDataCache"; // Key for local storage
  const apiKeyModal = $("#apiKeyModal");
  const apiKeyInput = $("#apiKeyInput");
  const errorAPIKey = $("#errorAPIKey");
  const submitApiKeyButton = $("#submitApiKey");
  const apiKey = localStorage.getItem(API_KEYS.CURRENT_API_KEY);
  const currentDate = new Date().toISOString().split("T")[0]; // Get the current date in YYYY-MM-DD format

  if (!apiKey) {
    apiKeyModal.modal("show");
    errorAPIKey.hide();
  }

  $("#apiKeyForm").on("keydown", function (e) {
    if (e.key === "Enter" || e.keyCode === 13) {
      e.preventDefault();
      $("#submitApiKey").click();
    }
  });

  submitApiKeyButton.click(() => {
    const apiKeyValue = apiKeyInput.val().trim();
    if (apiKeyValue) {
      localStorage.setItem(API_KEYS.CURRENT_API_KEY, btoa(apiKeyValue)); // Store encoded API key
      apiKeyModal.modal("hide");
      window.location.reload();
    } else {
      errorAPIKey.text("Please enter a valid API key").show();
    }
  });

  const elements = {
    addButton: $("#addEntryButton"),
    exportButton: $("#exportButton"),
    entryForm: $("#entryForm"),
    errorMessage: $("#errorMessage"),
    grNoDropdown: $("#grNo"), // Corrected selector
  };

  let dataTable;

  initialize();

  function initialize() {
    initializeDataTable();
    fetchData(false, function () {
      attachEventListeners();
    });
  }
  function validateAndAddEntry() {
    const formData = {
      grNo: $("#grNo").val(),
      startDate: $("#startDate").val(),
      endDate: $("#endDate").val(),
      inTime: $("#inTime").val(),
      outTime: $("#outTime").val(),
      satsangArea: $("#satsangArea").val(),
      satsangCenter: $("#satsangCenter").val(),
    };

    let missingFields = [];

    // Check for missing fields
    if (!formData.grNo) missingFields.push("Gr No");
    if (!formData.startDate) missingFields.push("Start Date");
    if (!formData.endDate) missingFields.push("End Date");
    if (!formData.inTime) missingFields.push("In Time");
    if (!formData.outTime) missingFields.push("Out Time");
    if (!formData.satsangArea) missingFields.push("Satsang Area");
    if (!formData.satsangCenter) missingFields.push("Satsang Center");

    const existingData = dataTable.rows().data().toArray();
    const isDuplicate = existingData.some((row) => {
      if (typeof formData.grNo[0] === "string" && row.gr_no) {
        return formData.grNo[0].startsWith(`${row.gr_no} - ${row.name}`);
      }
      return false; // Return false if formData.grNo or row.gr_no is invalid
    });
    if (isDuplicate) {
      elements.grNoDropdown.val(null).trigger("change"); // Unselect the current value
      const errorMessage = `The entry with Gr No <strong>${formData.grNo}</strong> already exists in the table.`;
      $("#errorModal .modal-body").html(errorMessage); // Show duplicate error in the modal
      $("#errorModal").modal("show");
      return;
    }

    // Check for invalid date range
    if (formData.startDate && formData.endDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      missingFields.push("End Date must be greater than or equal to Start Date");
    }

    // Check for invalid time range
    if (
      formData.startDate &&
      formData.endDate &&
      formData.startDate === formData.endDate && // Ensure it's a single-day case
      formData.inTime &&
      formData.outTime &&
      formData.inTime >= formData.outTime
    ) {
      missingFields.push("Out Time must be greater than In Time");
    }

    // If there are missing or invalid fields, show the error modal
    if (missingFields.length > 0) {
      const errorMessage = `Please address the following issues before submitting:<ul>${missingFields.map((field) => `<li>${field}</li>`).join("")}</ul>`;
      $("#errorModal .modal-body").html(errorMessage); // Use .html() to render the list
      $("#errorModal").modal("show");
      return;
    }

    // Check for duplicates in the table

    // Store the last added values in localStorage
    localStorage.setItem("lastAddedData", JSON.stringify(formData));

    // If validation passes, proceed with adding entries
    const entries = generateEntries(formData, $("#grNo").find("option"));
    dataTable.rows.add(entries).draw();

    // Update the record count
    updateRecordCount();

    // Clear the Add Sewadar dropdown
    $("#grNo").val(null).trigger("change"); // Reset the dropdown value
    $("#errorMessage").text("");

    // Save table data to localStorage
    const tableData = dataTable.rows().data().toArray();
    localStorage.setItem("dataTableData", JSON.stringify(tableData));
  }

  function initializeDataTable() {
    // Load data from localStorage if available
    const storedData = JSON.parse(localStorage.getItem("dataTableData")) || [];
    const preloadedData = storedData.length > 0 ? storedData : [];

    dataTable = new DataTable("#dataTable", {
      data: preloadedData,
      columns: [
        { title: "Gr No", data: "gr_no" },
        { title: "Name", data: "name" },
        { title: "Gender", data: "gender" },
        { title: "Status", data: "status" },
        {
          title: "Action",
          orderable: false,
          searchable: false,
          className: "text-center",
          data: null,
          render: () => `<button class="btn btn-danger btn-sm delete-row fas fa-trash"></button>`,
        },
      ],
      paging: false,
      searching: true,
      responsive: true,
      autoWidth: false,
      scrollX: true,
      order: [],
    });
    updateRecordCount();
    $("#dataTable").on("click", ".delete-row", function () {
      const row = $(this).closest("tr");
      dataTable.row(row).remove().draw();
      const tableData = dataTable.rows().data().toArray();
      localStorage.setItem("dataTableData", JSON.stringify(tableData));
      updateRecordCount();
    });
  }

  async function fetchData(forceRefresh, callback) {
    try {
      const sewadarsDataCache = JSON.parse(localStorage.getItem("sewadarsDataCache")) || [];
      if (forceRefresh || sewadarsDataCache.length <= 0) {
        $("#loader").show();
        const response = await $.ajax({
          url: API_URLS.SEWA_JATHA_FETCH,
          type: "POST",
          dataType: "json",
          data: { api_key: apiKey },
        });

        if (response?.status === 401) {
          $("#loader").hide();
          localStorage.removeItem(API_KEYS.CURRENT_API_KEY);
          $("#apiKeyModal").modal("show");
          $("#errorAPIKey").show();
          errorAPIKey.text("Unauthorized access. Please enter a valid API key.");
          return;
        }

        const sewadarsSheet = response?.["Help Desk"]?.["SewaJatha"];
        if (!sewadarsSheet) {
          logError("S-Sewadars sheet not found.");
          return;
        }

        localStorage.setItem(cachedDataKey, JSON.stringify(sewadarsSheet.data));
        populateSelectPicker(elements.grNoDropdown, "Add Sewadar", "Gr_No", "Full_Name");
      } else {
        populateSelectPicker(elements.grNoDropdown, "Add Sewadar", "Gr_No", "Full_Name");
      }
    } catch (error) {
      $("#loader").hide(); // Ensure loader hides on error
      if (error.status === 401) {
        localStorage.removeItem(API_KEYS.CURRENT_API_KEY);
        $("#apiKeyModal").modal("show");
        $("#errorAPIKey").show();
        errorAPIKey.text("Unauthorized access. Please enter a valid API key.");
        return;
      }

      logError("Error fetching data:", error);
    } finally {
      $("#loader").hide();
      if (typeof callback === "function") callback();
    }
  }


  document.getElementById("clearStorageModalYes").addEventListener("click", () => {
    localStorage.removeItem("dataTableData");
    localStorage.removeItem("lastAddedData");
    localStorage.removeItem("sewadarsDataCache");
    window.location.reload();
  });

  document.getElementById("newStorageTrigger").addEventListener("click", () => {
    const lastAddedData = JSON.parse(localStorage.getItem("lastAddedData")) || {};
    const preservedData = {
      serialPrefix: lastAddedData.serialPrefix || "",
      startDate: lastAddedData.startDate || "",
      endDate: lastAddedData.endDate || "",
    };

    // Save the preserved data back to localStorage
    localStorage.setItem("lastAddedData", JSON.stringify(preservedData));
    localStorage.removeItem("dataTableData");
    window.location.reload();
  });

  document.getElementById("refreshStorageTrigger").addEventListener("click", () => {
    fetchData(true, {});
  });

  function populateSelectPicker(dropdown, placeholder, grKey, nameKey) {
    let data = JSON.parse(localStorage.getItem(cachedDataKey)) || [];

    if (!localStorage.getItem(cachedDataKey)) {
      localStorage.setItem(cachedDataKey, JSON.stringify(data));
    }

    const uniqueSet = new Set();

    elements.grNoDropdown.empty(); // Clear existing options
    data.forEach((row) => {
      const grNo = row[grKey];
      const name = row[nameKey];
      const combinedValue = `${grNo} - ${name} - ${row.Satsang_Center}`;
      if (grNo && !uniqueSet.has(combinedValue)) {
        uniqueSet.add(combinedValue);
        const option = `<option value="${combinedValue}" data-gr-no="${grNo}" data-name="${name}" data-gender="${row.Gender}" data-status="${row.Status}" data-satsang-center="${row.Satsang_Center}" data-satsang-area="${row.Satsang_Area}">${combinedValue}</option>`;
        elements.grNoDropdown.append(option);
      }
    });

    // Initialize Select2 with lazy loading
    elements.grNoDropdown.select2({
      placeholder: placeholder,
      allowClear: true,
      width: "100%",
      ajax: {
        transport: function (params, success, failure) {
          const searchTerm = params.data.term || "";
          const regex = new RegExp(searchTerm.replace(/\s/g, ".*"), "i");

          // Filter data based on the search term
          const filteredData = data.filter((row) => regex.test(`${row[grKey]} - ${row[nameKey]} - ${row.Satsang_Center}`));

          // Limit the results to the first 15 records
          const limitedData = filteredData.slice(0, 15);

          // Map the filtered data to the format required by Select2
          const results = limitedData.map((row) => ({
            id: `${row[grKey]} - ${row[nameKey]} - ${row.Satsang_Center}`,
            text: `${row[grKey]} - ${row[nameKey]} - ${row.Satsang_Center}`,
          }));

          success({ results });
        },
        processResults: function (data) {
          return { results: data.results };
        },
        delay: 200, // Add a delay for better performance
      },
    });
  }

  function attachEventListeners() {
    elements.addButton.on("click", () => {
      elements.errorMessage.text("");
      $("#entryModal").modal("show");
    });

    elements.exportButton.on("click", () => $(".buttons-excel").click());

    setupAddGrNoModal();
    setupSatsangAreaDropdown();

    // Monitor changes in the entryForm and store them in localStorage
    elements.entryForm.on("change input", function () {
      const formData = {
        serialPrefix: $("#serialPrefix").val(),
        startDate: $("#startDate").val(),
        endDate: $("#endDate").val(),
        inTime: $("#inTime").val(),
        outTime: $("#outTime").val(),
        satsangArea: $("#satsangArea").val(),
        satsangCenter: $("#satsangCenter").val(),
      };

      localStorage.setItem("lastAddedData", JSON.stringify(formData));
    });
    elements.entryForm.on("change select", function () {
      const formData = {
        serialPrefix: $("#serialPrefix").val(),
        startDate: $("#startDate").val(),
        endDate: $("#endDate").val(),
        inTime: $("#inTime").val(),
        outTime: $("#outTime").val(),
        satsangArea: $("#satsangArea").val(),
        satsangCenter: $("#satsangCenter").val(),
      };

      localStorage.setItem("lastAddedData", JSON.stringify(formData));
    });
  }

  function setupAddGrNoModal() {
    const addGrNoButton = $("#addGrNoButton");
    const addGrNoModal = $("#addGrNoModal");
    const addGrNoForm = $("#addGrNoForm");
    const submitGrNoButton = $("#submitGrNoButton");
    const modalErrorMessage = $("#modalErrorMessage");

    addGrNoButton.click(() => {
      addGrNoForm.trigger("reset");
      modalErrorMessage.text("");

      const selectedArea = $("#satsangArea").val();
      const selectedCenter = $("#satsangCenter").val();

      $("#satsangAreaInput").val(selectedArea).trigger("change");
      $("#satsangCenterInput").val(selectedCenter);

      addGrNoModal.modal("show");

      // Focus on the "Name" input field when the modal is shown
      addGrNoModal.on("shown.bs.modal", () => {
        $("#nameInput").focus();
      });
    });

    submitGrNoButton.click(async () => {
      $("#loader").show();
      const grNo = $("#grNoInput").val().trim();
      const name = $("#nameInput").val().trim();
      const gender = $("#genderInput").val();
      const status = $("#statusInput").val().trim();
      const satsangArea = $("#satsangAreaInput").val().trim();
      const satsangCenter = $("#satsangCenterInput").val().trim();

      if (!grNo || !name || !gender || !status || !satsangArea || !satsangCenter) {
        modalErrorMessage.text("All fields are required, Please fill the Satsang Area and Center as well.");
        $("#loader").hide();
        return;
      }

      try {
        const grNoData = {
          api_key: localStorage.getItem(API_KEYS.CURRENT_API_KEY),
          action: "addGrNo",
          gr_no: grNo,
          name: name,
          gender: gender,
          status: status,
          satsang_center: satsangCenter,
          satsang_area: satsangArea,
        };

        const response = await $.ajax({
          url: API_URLS.SEWA_JATHA_UPDATE,
          type: "POST",
          dataType: "json",
          data: grNoData,
        });
        if (response?.status === 401) {
          localStorage.removeItem(API_KEYS.CURRENT_API_KEY);
          $("#apiKeyModal").modal("show");
          $("#errorAPIKey").show();
          errorAPIKey.text("Unauthorized access. Please enter a valid API key.");
          $("#loader").hide();
          return;
        }

        if (response.success) {
          const sewadarsDataCache = JSON.parse(localStorage.getItem("sewadarsDataCache")) || [];
          const newRecord = {
            Gr_No: grNo,
            Full_Name: name,
            Gender: gender,
            Status: status,
            Satsang_Center: satsangCenter,
            Satsang_Area: satsangArea,
          };
          sewadarsDataCache.push(newRecord);
          localStorage.setItem("sewadarsDataCache", JSON.stringify(sewadarsDataCache));
          const combinedValue = `${grNo} - ${name} - ${satsangCenter}`;
          fetchData(false, function () {
            elements.grNoDropdown.val(combinedValue).trigger("change");
            validateAndAddEntry();
          });
          $("#loader").hide();
          addGrNoModal.modal("hide");
        } else {
          modalErrorMessage.text(response.error || "Failed to Add Sewadar.");
        }
      } catch (error) {
        $("#loader").hide();
        console.error("Error adding Gr No:", error);
        modalErrorMessage.text("An error occurred. Please try again.");
      }
      $("#loader").hide();
    });
  }

  function setupSatsangAreaDropdown() {
    const satsangAreaInputs = $("#satsangArea, #satsangAreaInput");
    const satsangCenterInputs = $("#satsangCenter, #satsangCenterInput");
    const areaData = {
      AHEMDABAD: [
        "AHEMDABAD-I",
        "JAMLA",
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

    satsangAreaInputs.each(function () {
      const satsangAreaInput = $(this);
      satsangAreaInput.empty().append('<option value="">Select Area</option>');
      Object.keys(areaData).forEach((area) => {
        satsangAreaInput.append(`<option value="${area}">${area}</option>`);
      });

      satsangAreaInput.on("change", function () {
        const selectedArea = $(this).val();
        const satsangCenterInput = satsangCenterInputs.filter(`[id="${satsangAreaInput.attr("id").replace("Area", "Center")}"]`);
        satsangCenterInput.empty().append('<option value="">Select Center</option>');

        if (selectedArea && areaData[selectedArea]) {
          areaData[selectedArea].forEach((center) => {
            satsangCenterInput.append(`<option value="${center}">${center}</option>`);
          });
        }

        satsangCenterInput.prop("disabled", !selectedArea);
      });
    });

    satsangCenterInputs.prop("disabled", true);
    const lastAddedData = JSON.parse(localStorage.getItem("lastAddedData"));

    if (lastAddedData) {
      $("#serialPrefix").val(lastAddedData.serialPrefix || ""); // Set Serial Prefix
      $("#startDate").val(lastAddedData.startDate || ""); // Set Start Date
      $("#endDate").val(lastAddedData.endDate || ""); // Set End Date
      $("#inTime").val(lastAddedData.inTime || ""); // Set In Time
      $("#outTime").val(lastAddedData.outTime || ""); // Set Out Time
      $("#satsangArea")
        .val(lastAddedData.satsangArea || "")
        .trigger("change"); // Set Satsang Area
      $("#satsangCenter")
        .val(lastAddedData.satsangCenter || "")
        .trigger("change"); // Set Satsang Center
    }
  }

  function validateForm({ grNo, startDate, endDate, inTime, outTime }) {
    const serialPrefix = $("#serialPrefix").val().trim(); // Get the Serial Prefix value

    if (!serialPrefix) {
      elements.errorMessage.text("Please enter a valid Serial Prefix.");
      return false;
    }

    if (!grNo || !startDate || !endDate || !inTime || !outTime) {
      elements.errorMessage.text("Please fill all the fields such as Gr No, Start Date, End Date, In Time, and Out Time.");
      return false;
    }

    if (new Date(endDate) < new Date(startDate)) {
      elements.errorMessage.text("End Date must be greater than or equal to Start Date.");
      return false;
    }

    if (inTime >= outTime) {
      elements.errorMessage.text("Out Time must be greater than In Time.");
      return false;
    }

    elements.errorMessage.text(""); // Clear any previous error messages
    return true;
  }

  function generateEntries({ grNo }, grNoOptions) {
    const entries = [];
    grNo.forEach((gr) => {
      const option = grNoOptions.filter(`[value="${gr}"]`);
      const gr_no = option.attr("data-gr-no");
      const name = option.attr("data-name");
      const gender = option.attr("data-gender");
      const status = option.attr("data-status");
      entries.push({ gr_no, name, gender, status });
    });
    return entries;
  }

  function logError(message, error = null) {
    console.error(message, error || "");
  }

  // Function to update the record count
  function updateRecordCount() {
    const recordCount = dataTable.rows().count();
    $("#recordCount").text(recordCount);
  }

  $("#saveAndExportButton").click(async () => {
    const tableData = dataTable.rows().data().toArray();
    if (tableData.length === 0) {
      alert("No data available to save.");
      return;
    }
    const formatDateTime = (date) => {
      const options = { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "numeric", hour12: true };
      return new Intl.DateTimeFormat("en-US", options).format(date);
    };

    const serialPrefix = $("#serialPrefix").val().trim();
    const startDate = $("#startDate").val();
    const endDate = $("#endDate").val();
    const providedInTime = $("#inTime").val();
    const providedOutTime = $("#outTime").val();
    const satsangArea = $("#satsangArea").val();
    const satsangCenter = $("#satsangCenter").val();

    if (!serialPrefix || !startDate || !endDate || !providedInTime || !providedOutTime || !satsangArea || !satsangCenter) {
      alert("Please fill all the required fields in the form.");
      return;
    }

    try {
      $("#loader").show();

      // Store serialPrefix in localStorage
      localStorage.setItem("serialPrefix", serialPrefix);

      const formattedData = [];
      tableData.forEach((row) => {
        let currentDate = new Date(startDate); // Reset the start date for each row

        while (currentDate <= new Date(endDate)) {
          const formattedDate = currentDate.toISOString().split("T")[0]; // Format the date as YYYY-MM-DD

          let inTime, outTime;
          if (formattedDate === startDate && formattedDate === endDate) {
            inTime = providedInTime;
            outTime = providedOutTime;
          } else if (formattedDate === startDate) {
            inTime = providedInTime;
            if (parseInt(providedInTime.substring(0, 2)) > 16) {
              if (parseInt(providedInTime.substring(0, 2)) >= 19) {
                outTime = providedInTime.substring(0, 2) + ":" + (parseInt(providedInTime.substring(3, 5)) + 5);
              } else {
                outTime = "19:00";
              }
            } else {
              outTime = "16:30";
            }
          } else if (formattedDate === endDate) {
            outTime = providedOutTime;
            if (parseInt(providedOutTime.substring(0, 2)) <= 7) {
              inTime = providedOutTime.substring(0, 2) + ":" + (parseInt(providedOutTime.substring(3, 5)) - 5);
            } else {
              inTime = "06:30";
            }
          } else {
            inTime = "06:30";
            outTime = "16:30";
          }

          formattedData.push([
            serialPrefix,
            formattedDate,
            row.gr_no,
            row.name,
            row.gender,
            row.status,
            satsangCenter,
            satsangArea,
            1,
            inTime,
            outTime,
            formatDateTime,
          ]);

          // Move to the next date
          currentDate.setDate(currentDate.getDate() + 1);
        }
      });

      console.log("Formatted Data:", formattedData);

      // Send the formatted data to the server
      const response = await $.ajax({
        url: API_URLS.SEWA_JATHA_STORE,
        type: "POST",
        dataType: "json",
        data: {
          api_key: localStorage.getItem(API_KEYS.CURRENT_API_KEY),
          action: "appendToGoogleSheet",
          data: formattedData,
        },
      });

      if (response?.status === 401) {
        localStorage.removeItem(API_KEYS.CURRENT_API_KEY);
        $("#apiKeyModal").modal("show");
        $("#errorAPIKey").show();
        errorAPIKey.text("Unauthorized access. Please enter a valid API key.");        return;
      }

      if (response.success) {
        $("#exportCustomCSVButton").click();
        $("#newStorageTrigger").click();
      } else {
        alert(response.error || "Failed to append data to Google Sheet.");
      }
      $("#loader").hide();
    } catch (error) {
      $("#loader").hide();
      console.error("Error appending data to Google Sheet:", error);
      alert("An error occurred. Please try again.");
    }
  });

  window.addEventListener("beforeunload", (event) => {
    event.preventDefault();
    event.returnValue = "Are you sure you want to leave this page? Unsaved changes may be lost.";
  });
  // Global keydown listener for Ctrl+S or Cmd+S
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "s") {
      event.preventDefault(); // Prevent the default browser save action
      validateAndAddEntry(); // Call the function to save the entry
    }
  });

  // Attach a change event listener to the Select2 dropdown
  $("#grNo").on("select2:select", function (event) {
    const selectedValue = event.params.data.id; // Get the selected value
    console.log("Selected value:", selectedValue);

    // Perform an action when an option is selected
    if (selectedValue) {
      // Example: Trigger the save button click
      validateAndAddEntry();
    }
  });

  function exportCustomCSV() {
    const tableData = dataTable.rows().data().toArray();
    if (tableData.length === 0) {
      alert("No data available to export.");
      return;
    }

    const startDate = $("#startDate").val();
    const endDate = $("#endDate").val();
    const providedInTime = $("#inTime").val();
    const providedOutTime = $("#outTime").val();
    const serialPrefix = $("#serialPrefix").val().trim();

    if (!startDate || !endDate || !providedInTime || !providedOutTime || !serialPrefix) {
      alert("Please fill all the required fields in the form, including Serial Prefix.");
      return;
    }

    const csvRows = [];
    csvRows.push('"gr_no","date","time","type","remarks"'); // Add the header row with double quotes

    tableData.forEach((row) => {
      if (row.gr_no === "No Badge") return; // Skip rows with "No Badge" in gr_no

      let currentDate = new Date(startDate);

      while (currentDate <= new Date(endDate)) {
        const formattedDate = currentDate.toISOString().split("T")[0]; // Format the date as YYYY-MM-DD

        // Determine inTime and outTime based on the date
        let inTime, outTime;
        if (formattedDate === startDate && formattedDate === endDate) {
          inTime = providedInTime;
          outTime = providedOutTime;
        } else if (formattedDate === startDate) {
          inTime = providedInTime;
          if (parseInt(providedInTime.substring(0, 2)) > 16) {
            if (parseInt(providedInTime.substring(0, 2)) >= 19) {
              outTime = providedInTime.substring(0, 2) + ":" + (parseInt(providedInTime.substring(3, 5)) + 5);
            } else {
              outTime = "19:00";
            }
          } else {
            outTime = "16:30";
          }
        } else if (formattedDate === endDate) {
          outTime = providedOutTime;
          if (parseInt(providedOutTime.substring(0, 2)) <= 7) {
            inTime = providedOutTime.substring(0, 2) + ":" + (parseInt(providedOutTime.substring(3, 5)) - 5);
          } else {
            inTime = "06:30";
          }
        } else {
          inTime = "06:30";
          outTime = "16:30";
        }

        // Add IN and OUT entries for the current date with double quotes
        csvRows.push(`"${row.gr_no}","${formattedDate}","${inTime}","IN","Added Sewa Jatha Entry for ${serialPrefix}."`);
        csvRows.push(`"${row.gr_no}","${formattedDate}","${outTime}","OUT",""`);

        // Move to the next date
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    // Convert the rows to a CSV string with standard line breaks (\r\n)
    const csvContent = csvRows.join("\r\n");

    // Create a Blob and download the file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${serialPrefix}.csv`); // Use SerialPrefix as the filename
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Add a button to trigger the export function
  $("#exportCustomCSVButton").on("click", exportCustomCSV);
});
