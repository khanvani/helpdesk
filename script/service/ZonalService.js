// script/service/ZonalService.js

class ZonalService {
  static cache;
  static securitySewadarsCache = [];
  constructor() {
    API_URLS.CURRENT_URL = API_URLS.ZONAL_DATA_FETCH;
    this.init();
  }

  async init() {
    await this.loadSewadarsData();
    this.setupPersonSelect();
    this.setupEditHandler();
    this.setupSaveHandler();
    this.fetchApiVersion();
  }

  async loadSewadarsData() {
    this.cache = [];
    this.securitySewadarsCache = [
      { Gr_No: "G00651", Name: "Hansraj Vacheta", Mobile: "9825763328" },
      { Gr_No: "G03001", Name: "Harsh Dholani", Mobile: "7575068231" },
      { Gr_No: "G02123", Name: "Sanjay Patel", Mobile: "9824540287" },
      { Gr_No: "L01738", Name: "Reshma bhagwani", Mobile: "9726995595" },
      { Gr_No: "L01579", Name: "Pushpa Sharma", Mobile: "9726077130" },
      { Gr_No: "L02043", Name: "Simran Jagnani", Mobile: "7226935055" },
      { Gr_No: "M00946", Name: "Indra Mulani", Mobile: "7698141239" },
      { Gr_No: "G00687", Name: "Haresh Punjabi", Mobile: "9879018490" },
      { Gr_No: "G01893", Name: "Rajkumar Asudani", Mobile: "9879175800" },
      { Gr_No: "M02027", Name: "Rajender Bathla", Mobile: "9725892505" },
    ];
    if (!this.cache.length) {
      try {
        const apiKey = localStorage.getItem(API_KEYS.CURRENT_API_KEY);
        const res = await $.ajax({
          url: API_URLS.ZONAL_DATA_FETCH,
          type: "POST",
          dataType: "json",
          data: { api_key: apiKey },
        });
        this.cache = res?.["Help Desk"]?.["Zonal Data"]?.data || [];
      } catch (err) {
        console.error("Failed to load sewadars data:", err);
      }
    }
  }

  setupPersonSelect() {
    const $select = $(".person").empty().append("<option></option>");
    /*
    this.cache.forEach((row) => {
      const label = `${row.Gr_No} - ${row.Name} - ${row.Mobile}`;
      $select.append(
        `<option value="${row.Gr_No}" 
          data-gr-no="${row.Gr_No}" 
          data-name="${row.Name}" 
          data-gender="${row.Gender}" 
          data-status="${row.Status}" 
          data-satsang-center="${row.Center}" 
          data-satsang-area="${row.Area}">
          ${label}
        </option>`
      );
    });
    */

    $("#editRowModal .person").select2({
      placeholder: "Select Sewadar",
      allowClear: true,
      width: "100%",
      minimumResultsForSearch: 3,
      ajax: {
        transport: (params, success) => {
          const term = (params.data.term || "").toLowerCase();
          const results =
            term.length === 0
              ? this.cache.slice(0, 15).map((row) => {
                  const label = `${row.Gr_No} - ${row.Name} - ${row.Mobile}`;
                  return { id: `${row.Gr_No}`, text: label };
                })
              : this.cache
                  .filter((row) => {
                    const label = `${row.Gr_No} - ${row.Name} - ${row.Mobile}`.toLowerCase();
                    return label.indexOf(term) !== -1;
                  })
                  .slice(0, 15)
                  .map((row) => {
                    const label = `${row.Gr_No} - ${row.Name} - ${row.Mobile}`;
                    return { id: `${row.Gr_No}`, text: label };
                  });

          success({ results });
        },
        processResults: (data) => ({ results: data.results }),
        delay: 200,
      },
    });

    $("#editRowModal .staticperson").select2({
      placeholder: "Select Sewadar",
      allowClear: true,
      width: "100%",
      minimumResultsForSearch: 3,
      ajax: {
        transport: (params, success) => {
          const term = (params.data.term || "").toLowerCase();
          const results =
            term.length === 0
              ? this.securitySewadarsCache.slice(0, 15).map((row) => {
                  const label = `${row.Gr_No} - ${row.Name} - ${row.Mobile}`;
                  return { id: `${row.Gr_No}`, text: label };
                })
              : this.securitySewadarsCache
                  .filter((row) => {
                    const label = `${row.Gr_No} - ${row.Name} - ${row.Mobile}`.toLowerCase();
                    return label.indexOf(term) !== -1;
                  })
                  .slice(0, 15)
                  .map((row) => {
                    const label = `${row.Gr_No} - ${row.Name} - ${row.Mobile}`;
                    return { id: `${row.Gr_No}`, text: label };
                  });

          success({ results });
        },
        processResults: (data) => ({ results: data.results }),
        delay: 200,
      },
    });

    $("#editRowModal .person").select2({
      placeholder: "Select Sewadar",
      allowClear: true,
      width: "100%",
      minimumResultsForSearch: 3,
      ajax: {
        transport: (params, success) => {
          const term = (params.data.term || "").toLowerCase();
          const results =
            term.length === 0
              ? this.cache.slice(0, 15).map((row) => {
                  const label = `${row.Gr_No} - ${row.Name} - ${row.Mobile}`;
                  return { id: `${row.Gr_No}`, text: label };
                })
              : this.cache
                  .filter((row) => {
                    const label = `${row.Gr_No} - ${row.Name} - ${row.Mobile}`.toLowerCase();
                    return label.indexOf(term) !== -1;
                  })
                  .slice(0, 15)
                  .map((row) => {
                    const label = `${row.Gr_No} - ${row.Name} - ${row.Mobile}`;
                    return { id: `${row.Gr_No}`, text: label };
                  });

          success({ results });
        },
        processResults: (data) => ({ results: data.results }),
        delay: 200,
      },
    });

    $select.on("select2:open", () => {
      $(".select2-search__field").on("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          setTimeout(() => {
            $(this).closest(".select2-container").prev("select").closest(".form-group").nextAll(".form-group").find("input, select, textarea").first().focus();
          }, 100);
        }
      });
    });

    $("#editRowModal .select2").on("select2:select", function (e) {
      try {
        const selectedValue = e.params.data.id;
        $(this).val(selectedValue).trigger("change");
      } catch {
        console.warn("Error selecting person:", e);
      }
    });
  }

  setupEditHandler() {
    const $editRowModal = $("#editRowModal");
    const self = this;
    $("body").on("click", ".zonal-edit-button", function () {
      // Store the clicked edit button reference
      self.currentEditButton = $(this);

      $("#loader").show();
      $editRowModal.find("input, select, textarea").val("").removeClass("is-invalid");
      $("#editRowModal .select2").val("").trigger("change");
      const rowData = JSON.parse($(this).attr("data-row"));
      const headers = StorageService.currentRecord.headers;
      const formFields = [];
      let colCount = 0;
      const grNo = rowData["Gr_No"] || "Unknown";
      const sewadarName = rowData["Name"] || "Unknown";
      $editRowModal.find(".modal-title").text(`${grNo} - ${sewadarName}`);

      headers.forEach((header) => {
        const key = header.data || header.title;
        const value = rowData[key] || "";
        const isEditable = header.title.startsWith("R_") || header.title.startsWith("E_") || header.title === "Id";
        const isRelevant = isEditable && !header.title.trim().endsWith("Sewadar");
        if (!isRelevant) return;

        const displayTitle = header.title.replace(/^E_/, "").replace(/^R_/, "");
        const isHidden = key === "Id" ? 'style="display: none"' : "";

        if (colCount % 2 === 0) formFields.push('<div class="row">');

        if (header.title.startsWith("R_")) {
          formFields.push(`
            <div class="col-md-6 mb-3" ${isHidden}>
              <div class="form-group">
                <label for="${key}" class="font-weight-bold">${displayTitle}</label>
                <input type="text" class="form-control blink" id="${key}" name="${key}" value="${value}" readonly/>
              </div>
            </div>
          `);
        } else {
          formFields.push(`
            <div class="col-md-6 mb-3" ${isHidden}>
              <div class="form-group">
                <label for="${key}" class="font-weight-bold">${displayTitle}</label>
                <input type="text" class="form-control required" id="${key}" name="${key}" value="${value}" />
              </div>
            </div>
          `);
        }

        if ((colCount + 1) % 2 === 0) formFields.push("</div>");
        colCount++;
      });

      // Close an open row if columns remain
      if (colCount % 2 !== 0) formFields.push("</div>");

      $("#dynamicFields").html(`
        <div class="col-md-3 mb-3" style="display: none">
          <div class="form-group">
            <label class="font-weight-bold">Id</label>
            <input type="text" class="form-control required" name="Id" value="${rowData.Id}" />
          </div>
        </div>
        <div class="col-md-3 mb-3" style="display: none">
          <div class="form-group">
            <label class="font-weight-bold">Gr No</label>
            <input type="text" class="form-control required" name="Gr_No" value="${rowData.Gr_No}" />
          </div>
        </div>
        ${formFields.join("")}
      `);
      $editRowModal.modal("show");
      $("#loader").hide();
    });
  }

  setupSaveHandler() {
    const self = this;
    $("body").on("click", "#zonal-save-btn", function () {
      const data = {};
      let allFieldsFilled = true;

      $("#editRowModal")
        .find("input.required:not([readonly]), select.required:not([readonly]), textarea.required:not([readonly])")
        .each(function () {
          if (this.name) {
            const rawVal = $(this).val();
            const trimmedVal = rawVal?.toString().trim();

            if (trimmedVal === "") {
              allFieldsFilled = false;
              $(this).addClass("is-invalid");
            } else {
              $(this).removeClass("is-invalid");

              if (this.name.endsWith("Sewadar") && Array.isArray(rawVal)) {
                data[this.name] = rawVal.join(", ");
              } else {
                data[this.name] = rawVal;
              }
            }
          }
        });

      $("#editRowModal")
        .find("input:not([readonly]), select:not([readonly]), textarea:not([readonly])")
        .each(function () {
          if (this.name) {
            const rawVal = $(this).val();
            const trimmedVal = rawVal?.toString().trim();
            if (this.name.endsWith("Sewadar") && Array.isArray(rawVal)) {
              data[this.name] = rawVal.join(", ");
            } else {
              data[this.name] = rawVal;
            }
          }
        });

      // Validate family references (up to 5 families)
      const familyFields = [
        { member: "E_Family_1_Sewadar", relation: "E_Family_1_RWith_Sewadar", name: "Family 1" },
        { member: "E_Family_2_Sewadar", relation: "E_Family_2_RWith_Sewadar", name: "Family 2" },
        { member: "E_Family_3_Sewadar", relation: "E_Family_3_RWith_Sewadar", name: "Family 3" },
        { member: "E_Family_4_Sewadar", relation: "E_Family_4_RWith_Sewadar", name: "Family 4" },
        { member: "E_Family_5_Sewadar", relation: "E_Family_5_RWith_Sewadar", name: "Family 5" },
      ];

      for (const family of familyFields) {
        const familyMember = data[family.member];
        const familyRelation = data[family.relation];

        if (familyMember && (!familyRelation || familyRelation.trim() === "")) {
          allFieldsFilled = false;
          $(`select[name="${family.relation}"]`).addClass("is-invalid");
          alert(`Please fill ${family.name} relation field.`);
          return;
        }
      }

      if (!allFieldsFilled) {
        console.warn("Some fields are empty, preventing save.");
        alert("Please fill all required fields.");
        return;
      }

      data.api_key = localStorage.getItem(API_KEYS.CURRENT_API_KEY);
      $("#loader").show();

      $.ajax({
        url: API_URLS.ZONAL_DATA_UPDATE,
        type: "POST",
        dataType: "json",
        data,
        success: function (response) {
          $("#loader").hide();

          if (response?.status === 401) {
            localStorage.removeItem(API_KEYS.CURRENT_API_KEY);
            $("#apiKeyModal").modal("show");
            return;
          }

          const modal = $("#errorModal");
          const body = modal.find("#errorModalBody");
          const label = modal.find("#errorModalLabel");

          if (response.success) {
            let msg = `<b>Update successful for: ${response.name || "Record"}</b><br>`;

            if (response.updated_fields && Object.keys(response.updated_fields).length) {
              msg +=
                "<ul>" +
                Object.entries(response.updated_fields)
                  .map(([field, change]) => `<li>${field.replace(/^E_/, "")}: <b>${change.from}</b> → <b>${change.to}</b></li>`)
                  .join("") +
                "</ul>";
            }

            label.text("Success");
            body.html(msg);
            modal.modal("show");
            $("#editRowModal").modal("hide");

            // --- New code to update the edit button state and row data ---
            self.currentEditButton.attr("disabled", "disabled");
            // --- End new code ---
          } else {
            label.text("Error");
            body.html(response.error || "Update failed");
            modal.modal("show");
          }
        },
        error: function (xhr) {
          $("#loader").hide();
          const msg = xhr.responseJSON?.error || xhr.responseText || "Update failed";
          $("#errorModalLabel").text("Error");
          $("#errorModalBody").html(msg);
          $("#errorModal").modal("show");
        },
      });
    });
  }

  fetchApiVersion() {
    $.ajax({
      url: API_URLS.ZONAL_DATA_FETCH.replace("/zonal-data.php", "/version.php"),
      type: "GET",
      dataType: "json",
      timeout: 5000,
      success: (response) => {
        if (response && response.version) {
          const date = new Date(response.version);
          const formattedDate = date.toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZoneName: "short",
          });
          $("#apiLastUpdated").text(formattedDate);
        } else {
          $("#apiLastUpdated").text("Unknown");
        }
      },
      error: (xhr, status, error) => {
        console.log("Could not fetch API version:", error);
        $("#apiLastUpdated").text("Unavailable");
      },
    });
  }
}
