document.addEventListener("DOMContentLoaded", () => {
  const $ = window.jQuery;

  const apiKeyModal = $("#apiKeyModal");
  const apiKeyInput = $("#apiKeyInput");
  const errorAPIKey = $("#errorAPIKey");
  const submitApiKeyButton = $("#submitApiKey");
  const apiKey = localStorage.getItem("apiKey");

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
      localStorage.setItem("apiKey", apiKeyValue);
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
    grNoDropdown: $("#grNo.selectpicker"),
  };

  let dataTable;

  initialize();

  function initialize() {
    initializeDataTable();
    fetchData();
    attachEventListeners();
  }

  function initializeDataTable() {
    dataTable = new DataTable("#dataTable", {
      data: [],
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
          title: null,
          filename: function () {
            // Get the value of the serialPrefix input field
            const serialPrefix = $("#serialPrefix").val().trim();
            return serialPrefix || "export"; // Default to "export" if serialPrefix is empty
          },
          exportOptions: {
            columns: [0, 6, 7, 8], // Export only gr_no, date, time, and type
            format: {
              header: function (data, columnIdx) {
                // Map column indices to desired headers
                const headers = {
                  0: "gr_no",
                  6: "date",
                  7: "time",
                  8: "type",
                };
                return headers[columnIdx];
              },
            },
            rows: function (idx, data, node) {
              // Exclude rows where Gr No is "No Badge"
              return data.gr_no !== "No Badge";
            },
          },
        },
      ],
      paging: true,
      searching: true,
      responsive: true,
      autoWidth: false,
      scrollX: true,
    });

    $("#dataTable").on("click", ".delete-row", function () {
      const row = $(this).closest("tr");
      dataTable.row(row).remove().draw();
    });
  }

  async function fetchData() {
    try {
      $("#loader").show();
      const response = await $.ajax({
        url: "https://sewasamiti.ahujaenterprise.com/php/sewa-jatha.php",
        type: "POST",
        dataType: "json",
        data: { api_key: apiKey },
      });
      if (response?.status === 401) {
        localStorage.removeItem("apiKey"); // Clear the invalid API key
        $("#apiKeyModal").modal("show"); // Show the API key modal
        return;
      }

      $("#loader").hide();

      const sewadarsSheet = response?.["Help Desk"]?.["SewaJatha"];
      if (!sewadarsSheet) {
        logError("S-Sewadars sheet not found.");
        return;
      }

      StorageService.currentRecord = sewadarsSheet;
      console.log("S-Sewadars data loaded successfully.");
      populateSelectPicker(elements.grNoDropdown, "Search Sewadar", "Gr_No", "Full_Name");
    } catch (error) {
      logError("Error fetching data:", error);
    } finally {
      $("#loader").hide();
    }
  }

  function populateSelectPicker(dropdown, placeholder, grKey, nameKey) {
    dropdown.empty();
    const data = StorageService.currentRecord?.data || [];
    const uniqueSet = new Set();

    data.forEach((row) => {
      const grNo = row[grKey];
      const name = row[nameKey];
      const combinedValue = `${grNo} - ${name}`;
      if (grNo && !uniqueSet.has(combinedValue)) {
        uniqueSet.add(combinedValue);
        dropdown.append(
          `<option value="${combinedValue}" data-gr-no="${grNo}" data-name="${name}" data-gender="${row.Gender}" data-status="${row.Status}" data-satsang-center="${row.Satsang_Center}" data-satsang-area="${row.Satsang_Area}">${combinedValue}</option>`
        );
      }
    });

    dropdown.selectpicker({ liveSearch: true, noneSelectedText: placeholder });
    dropdown.selectpicker("refresh");
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
      };

      if (!validateForm(formData)) return;

      const entries = generateEntries(formData, elements.grNoDropdown.find("option"));
      dataTable.rows.add(entries).draw();
      //elements.entryForm.trigger("reset");
      elements.grNoDropdown.selectpicker("refresh");
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
      // Reset the modal form
      addGrNoForm.trigger("reset");
      modalErrorMessage.text("");

      // Get the selected values from the outer dropdowns
      const selectedArea = $("#satsangArea").val();
      const selectedCenter = $("#satsangCenter").val();

      // Set the modal dropdowns to match the outer dropdowns
      $("#satsangAreaInput").val(selectedArea).trigger("change");
      $("#satsangCenterInput").val(selectedCenter);

      // Show the modal
      addGrNoModal.modal("show");
    });

    submitGrNoButton.click(async () => {
      const grNo = $("#grNoInput").val().trim();
      const name = $("#nameInput").val().trim();
      const gender = $("#genderInput").val();
      const status = $("#statusInput").val().trim();
      const satsangArea = $("#satsangArea").val().trim();
      const satsangCenter = $("#satsangCenter").val().trim();

      if (!grNo || !name || !gender || !status || !satsangArea || !satsangCenter) {
        modalErrorMessage.text("All fields are required.");
        return;
      }

      try {
        $("#loader").show();
        const response = await $.ajax({
          url: "https://sewasamiti.ahujaenterprise.com/php/sewa-jatha-update.php",
          type: "POST",
          dataType: "json",
          data: {
            api_key: localStorage.getItem("apiKey"),
            action: "addGrNo",
            gr_no: grNo,
            name: name,
            gender: gender,
            status: status,
            satsang_center: satsangCenter,
            satsang_area: satsangArea,
          },
        });

        if (response?.status === 401) {
          localStorage.removeItem("apiKey"); // Clear the invalid API key
          $("#apiKeyModal").modal("show"); // Show the API key modal
          return;
        }

        if (response.success) {
          addGrNoModal.modal("hide");
          fetchData(); // Refresh the dropdown data
        } else {
          modalErrorMessage.text(response.error || "Failed to add Gr No.");
        }
      } catch (error) {
        console.error("Error adding Gr No:", error);
        modalErrorMessage.text("An error occurred. Please try again.");
      } finally {
        $("#loader").hide();
      }
    });
  }

  function setupSatsangAreaDropdown() {
    const satsangAreaInputs = $("#satsangArea, #satsangAreaInput"); // Both form and modal dropdowns
    const satsangCenterInputs = $("#satsangCenter, #satsangCenterInput"); // Both form and modal dropdowns
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
    if (!grNo || !startDate || !endDate || !inTime || !outTime) {
      elements.errorMessage.text("All fields are required.");
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

    elements.errorMessage.text("");
    return true;
  }

  function generateEntries({ grNo, startDate, endDate, inTime, outTime }, grNoOptions) {
    const entries = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    while (start <= end) {
      const formattedDate = start.toISOString().split("T")[0]; // Format as YYYY-MM-DD
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

  $("#saveButton").click(async () => {
    const tableData = dataTable.rows().data().toArray();
    if (tableData.length === 0) {
      alert("No data available to save.");
      return;
    }

    // Get the serialPrefix value from the textbox
    const serialPrefix = $("#serialPrefix").val().trim();
    if (!serialPrefix) {
      alert("Please enter a valid Serial Prefix.");
      return;
    }

    // Group data by gr_no, name, and date
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

    // Format the current date and time
    const formatDateTime = (date) => {
      const options = { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "numeric", hour12: true };
      return new Intl.DateTimeFormat("en-US", options).format(date);
    };
    const formattedDateTime = formatDateTime(now); // e.g., "1-Apr-2025 10:00 AM"

    // Convert grouped data into an array for submission
    const formattedData = Object.values(groupedData).map((row, index) => [
      serialPrefix, // Use the serialPrefix from the textbox
      row.date, // Date
      row.gr_no, // Gr No
      row.name, // Name
      row.gender, // Gender
      row.status, // Status
      row.satsang_center, // Satsang Center
      row.satsang_area, // Satsang Area
      1,
      row.in_time, // IN Time
      row.out_time, // OUT Time
      formattedDateTime, // Formatted date and time
    ]);

    try {
      $("#loader").show();
      const response = await $.ajax({
        url: "https://sewasamiti.ahujaenterprise.com/php/sewa-jatha-store.php",
        type: "POST",
        dataType: "json",
        data: { api_key: localStorage.getItem("apiKey"), action: "appendToGoogleSheet", data: formattedData },
      });

      if (response?.status === 401) {
        localStorage.removeItem("apiKey"); // Clear the invalid API key
        $("#apiKeyModal").modal("show"); // Show the API key modal
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
