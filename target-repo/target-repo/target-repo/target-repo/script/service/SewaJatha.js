document.addEventListener("DOMContentLoaded", () => {
  const $ = window.jQuery;

  const apiKeyModal = $("#apiKeyModal");
  const apiKeyInput = $("#apiKeyInput");
  const errorAPIKey = $("#errorAPIKey");
  const submitApiKeyButton = $("#submitApiKey");
  const apiKey = localStorage.getItem("apiKey");
  const currentDate = new Date().toISOString().split("T")[0]; // Get the current date in YYYY-MM-DD format
  $("#startDate").val(currentDate); // Set the default Start Date
  $("#endDate").val(currentDate); // Set the default End Date
  $("#inTime").val("07:00"); // Set the default In Time
  $("#outTime").val("17:00"); // Set the default Out Time

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
      localStorage.setItem("apiKey", btoa(apiKeyValue)); // Store encoded API key
      apiKeyModal.modal("hide");
      window.location.reload();
    } else {
      errorAPIKey.text("Please enter a valid API key").show();
    }
  });

  function refreshData() {
    console.log("Refreshing data...");
    fetchData();
  }

  const elements = {
    addButton: $("#addEntryButton"),
    exportButton: $("#exportButton"),
    submitButton: $("#submitEntryButton"),
    entryForm: $("#entryForm"),
    errorMessage: $("#errorMessage"),
    grNoDropdown: $("#grNo"), // Corrected selector
  };

  let dataTable;

  initialize();

  function initialize() {
    initializeDataTable();
    fetchData();
    attachEventListeners();

    // Retrieve serialPrefix from localStorage and set it in the input field
    const storedSerialPrefix = localStorage.getItem("serialPrefix");
    if (storedSerialPrefix) {
      $("#serialPrefix").val(storedSerialPrefix);
    }
  }

  function initializeDataTable() {
    const preloadedData = StorageService.currentRecord?.data || []; // Use preloaded data from helpdesk

    dataTable = new DataTable("#dataTable", {
      data: preloadedData,
      columns: [
        { title: "Gr No", data: "gr_no" },
        { title: "Name", data: "name" },
        { title: "Gender", data: "gender" },
        { title: "Status", data: "status" },
        { title: "Satsang Center", data: "satsang_center" },
        { title: "Satsang Area", data: "satsang_area" },
        { title: "Date", data: "date" },
        { title: "Time", data: "time" },
        { title: "Type", data: "type" },
        {
          title: "Action",
          orderable: false,
          searchable: false,
          className: "text-center",
          data: null,
          render: () => `<button class="btn btn-danger btn-sm delete-row">Delete</button>`,
        },
      ],
      dom: "Bfrtip",
      buttons: [
        {
          extend: "csvHtml5",
          text: "Export",
          className: "btn btn-primary",
          filename: () => $("#serialPrefix").val().trim() || "export",
          exportOptions: {
            columns: [0, 6, 7, 8],
          },
        },
      ],
      paging: true,
      searching: true,
      responsive: true,
      autoWidth: false,
      scrollX: true,
      order: [], // Disable default sorting
    });

    $("#dataTable").on("click", ".delete-row", function () {
      const row = $(this).closest("tr");
      dataTable.row(row).remove().draw();

      // Update the record count
      updateRecordCount();
    });
  }

  async function fetchData() {
    try {
      $("#loader").show();
      const response = await $.ajax({
        url: API_URLS.SEWA_JATHA_FETCH,
        type: "POST",
        dataType: "json",
        data: { api_key: apiKey },
      });

      if (response?.status === 401) {
        localStorage.removeItem("apiKey");
        $("#apiKeyModal").modal("show");
        return;
      }

      $("#loader").hide();

      const sewadarsSheet = response?.["Help Desk"]?.["SewaJatha"];
      if (!sewadarsSheet) {
        logError("S-Sewadars sheet not found.");
        return;
      }
      StorageService.currentRecord = sewadarsSheet;
      populateSelectPicker(elements.grNoDropdown, "Add Sewadar", "Gr_No", "Full_Name");
    } catch (error) {
      logError("Error fetching data:", error);
    } finally {
      $("#loader").hide();
    }
  }

  function populateSelectPicker(dropdown, placeholder, grKey, nameKey) {
    const cachedDataKey = "sewadarsDataCache"; // Key for local storage
    let data = JSON.parse(localStorage.getItem(cachedDataKey)) || StorageService.currentRecord?.data || [];

    if (!localStorage.getItem(cachedDataKey)) {
      localStorage.setItem(cachedDataKey, JSON.stringify(data));
    }

    const uniqueSet = new Set();

    dropdown.empty(); // Clear existing options
    data.forEach((row) => {
      const grNo = row[grKey];
      const name = row[nameKey];
      const combinedValue = `${grNo} - ${name} - ${row.Satsang_Center}`;
      if (grNo && !uniqueSet.has(combinedValue)) {
        uniqueSet.add(combinedValue);
        const option = `<option value="${combinedValue}" data-gr-no="${grNo}" data-name="${name}" data-gender="${row.Gender}" data-status="${row.Status}" data-satsang-center="${row.Satsang_Center}" data-satsang-area="${row.Satsang_Area}">${combinedValue}</option>`;
        dropdown.append(option);
      }
    });

    // Initialize Select2 with lazy loading
    dropdown.select2({
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

    elements.submitButton.on("click", () => {
      const formData = {
        grNo: elements.grNoDropdown.val(),
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

      // Check for invalid date range
      if (formData.startDate && formData.endDate && new Date(formData.endDate) < new Date(formData.startDate)) {
        missingFields.push("End Date must be greater than or equal to Start Date");
      }

      // Check for invalid time range
      if (formData.inTime && formData.outTime && formData.inTime >= formData.outTime) {
        missingFields.push("Out Time must be greater than In Time");
      }

      // If there are missing or invalid fields, show the error modal
      if (missingFields.length > 0) {
        const errorMessage = `Please address the following issues before submitting:<ul>${missingFields.map((field) => `<li>${field}</li>`).join("")}</ul>`;
        $("#errorModal .modal-body").html(errorMessage); // Use .html() to render the list
        $("#errorModal").modal("show");
        return;
      }

      // If validation passes, proceed with adding entries
      const entries = generateEntries(formData, elements.grNoDropdown.find("option"));
      dataTable.rows.add(entries).draw();

      // Update the record count
      updateRecordCount();

      // Clear the Add Sewadar dropdown
      elements.grNoDropdown.val(null).trigger("change"); // Reset the dropdown value
      elements.errorMessage.text("");
    });
    setupAddGrNoModal();
    setupSatsangAreaDropdown();
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
          api_key: localStorage.getItem("apiKey"),
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
          localStorage.removeItem("apiKey");
          $("#apiKeyModal").modal("show");
          $("#loader").hide();
          return;
        }

        if (response.success) {
          // Add the new entry to the dropdown
          const combinedValue = `${grNo} - ${name} - ${satsangCenter}`;
          const newOption = `<option value="${combinedValue}" data-gr-no="${grNo}" data-name="${name}" data-gender="${gender}" data-status="${status}" data-satsang-center="${satsangCenter}" data-satsang-area="${satsangArea}">${combinedValue}</option>`;
          elements.grNoDropdown.append(newOption);

          // Retain previously selected entries and merge with the new entry
          const selectedValues = elements.grNoDropdown.val() || [];
          selectedValues.push(combinedValue);
          //elements.grNoDropdown.val([...new Set(selectedValues)]); // Ensure no duplicates
          elements.grNoDropdown.selectpicker("refresh");
          $("#submitEntryButton").click();
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

  function generateEntries({ grNo, startDate, endDate, inTime, outTime }, grNoOptions) {
    const entries = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    while (start <= end) {
      const formattedDate = start.toISOString().split("T")[0];
      grNo.forEach((gr) => {
        const option = grNoOptions.filter(`[value="${gr}"]`);
        const gr_no = option.attr("data-gr-no");
        const name = option.attr("data-name");
        const gender = option.attr("data-gender");
        const status = option.attr("data-status");
        const satsangArea = $("#satsangArea").val().trim();
        const satsangCenter = $("#satsangCenter").val().trim();

        entries.push(
          { gr_no, name, gender, status, satsang_center: satsangCenter, satsang_area: satsangArea, date: formattedDate, time: inTime, type: "IN" },
          { gr_no, name, gender, status, satsang_center: satsangCenter, satsang_area: satsangArea, date: formattedDate, time: outTime, type: "OUT" }
        );
      });
      start.setDate(start.getDate() + 1);
    }

    return entries;
  }

  function logError(message, error = null) {
    console.error(message, error || "");
  }

  // Function to update the record count
  function updateRecordCount() {
    const recordCount = dataTable.rows().count(); // Get the total number of rows in the table

    // Get the start and end dates
    const startDate = new Date($("#startDate").val());
    const endDate = new Date($("#endDate").val());

    // Calculate the number of days difference
    const timeDifference = endDate - startDate;
    const dayDifference = timeDifference > 0 ? Math.ceil(timeDifference / (1000 * 60 * 60 * 24)) + 1 : 1;

    // Calculate the adjusted record count
    const adjustedRecordCount = Math.floor(recordCount / dayDifference / 2);

    // Update the count in the badge
    $("#recordCount").text(adjustedRecordCount);
  }

  $("#saveButton").click(async () => {
    const tableData = dataTable.rows().data().toArray();
    if (tableData.length === 0) {
      alert("No data available to save.");
      return;
    }

    const serialPrefix = $("#serialPrefix").val().trim();
    if (!serialPrefix) {
      alert("Please enter a valid Serial Prefix.");
      return;
    }

    // Store serialPrefix in localStorage
    localStorage.setItem("serialPrefix", serialPrefix);

    const groupedData = {};
    const now = new Date();
    tableData.forEach((row) => {
      const key = `${row.gr_no}-${row.name}-${row.date}`;
      if (!groupedData[key]) {
        groupedData[key] = {
          gr_no: row.gr_no,
          name: row.name,
          gender: row.gender,
          status: row.status,
          satsang_center: row.satsang_center,
          satsang_area: row.satsang_area,
          date: row.date,
          in_time: "",
          out_time: "",
        };
      }
      if (row.type === "IN") {
        groupedData[key].in_time = row.time;
      } else if (row.type === "OUT") {
        groupedData[key].out_time = row.time;
      }
    });

    const formatDateTime = (date) => {
      const options = { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "numeric", hour12: true };
      return new Intl.DateTimeFormat("en-US", options).format(date);
    };
    const formattedDateTime = formatDateTime(now);

    const formattedData = Object.values(groupedData).map((row, index) => [
      serialPrefix,
      row.date,
      row.gr_no,
      row.name,
      row.gender,
      row.status,
      row.satsang_center,
      row.satsang_area,
      1,
      row.in_time,
      row.out_time,
      formattedDateTime,
    ]);

    try {
      $("#loader").show();
      const response = await $.ajax({
        url: API_URLS.SEWA_JATHA_STORE,
        type: "POST",
        dataType: "json",
        data: { api_key: localStorage.getItem("apiKey"), action: "appendToGoogleSheet", data: formattedData },
      });

      if (response?.status === 401) {
        localStorage.removeItem("apiKey");
        $("#apiKeyModal").modal("show");
        return;
      }

      if (response.success) {
        $(".buttons-html5").click();
        window.location.reload();
      } else {
        alert(response.error || "Failed to append data to Google Sheet.");
      }
      $("#loader").hide();
    } catch (error) {
      $("#loader").show();
      console.error("Error appending data to Google Sheet:", error);
      alert("An error occurred. Please try again.");
    }
  });
});

window.addEventListener("beforeunload", (event) => {
  event.preventDefault();
  event.returnValue = "Are you sure you want to leave this page? Unsaved changes may be lost.";
});
// Global keydown listener for Ctrl+S or Cmd+S
document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "s") {
    event.preventDefault(); // Prevent the default browser save action
    $("#submitEntryButton").click(); // Trigger the save button click
  }
});

// Attach a change event listener to the Select2 dropdown
$("#grNo").on("select2:select", function (event) {
  const selectedValue = event.params.data.id; // Get the selected value
  console.log("Selected value:", selectedValue);

  // Perform an action when an option is selected
  if (selectedValue) {
    // Example: Trigger the save button click
    $("#submitEntryButton").click();
  }
});
