class FilterService {
  static filterFields = ["Type","Open/Perm","Place","Secretary_/_Care_Taker","Care_Taker","Secretary","Satsang_Place","Department", "SubDept", "Gender", "Status", "Center", "Area", "OutSide","OS", "Satsang_Center","SatsangCenter", "Sub_Dept", "Sub_Department","SubDepartment","Satsang_Area","SatsangArea","Initiated","Initiation_Place","InitiationPlace"];

  constructor(storageService) {
    this.storageService = storageService;
    this.filters = {};
    this.initFilters = this.initFilters.bind(this);
    this.filter = this.filter.bind(this);
    this.clearFilter = this.clearFilter.bind(this);
    this.getFilters = this.getFilters.bind(this);
  }

  initFilters() {
    if (Object.keys(StorageService.currentRecord).length > 0) {
      FilterService.filterFields.forEach((field) => {
        this.filters[field] = new Set();
      });
      if (this.fillFilters(StorageService.currentRecord.data)) {
        this.renderSelectBoxes("#filterModal .modal-body");
        $(".selectpicker").selectpicker();
      }
    }
  }

  getFilters() {
    return this.filters;
  }

  fillFilters(data) {
    try {
      if (!data || !Array.isArray(data)) {
        console.error("Invalid or empty dataset.");
        return;
      }

      data.forEach((item) => {
        FilterService.filterFields.forEach((field) => {
          if (item.hasOwnProperty(field)) {
            this.filters[field].add(item[field]);
          }
        });
      });
    } catch {
      console.log("Error while generating Filters");
    }
    return true;
  }

  renderSelectBoxes(filterModalBodySelector) {
      const filterModalBody = $(filterModalBodySelector);
      filterModalBody.empty();

      Object.keys(this.filters).forEach((field) => {
          if (this.filters[field].size) {
              const options = Array.from(this.filters[field])
                  .map((val) => {
                      return `<option value="${val}">${val}</option>`;
                  })
                  .join("");
              const displayValue = String(field).trim().replace(/_/g, " ");

              const selectHtml = `
                  <div class="form-group filter-container">
                      <label for="filter-${field}">${displayValue}</label>
                      <select id="filter-${field}" class="selectpicker form-control" multiple data-live-search="true">
                          ${options}
                      </select>
                  </div>
              `;

              filterModalBody.append(selectHtml);
          }
      });
  }

  filter() {
      const data = StorageService.currentData[StorageService.currentFile][StorageService.currentSheet].data;

      this.filters = Object.fromEntries(
          Object.keys(this.filters).map(field => {
              const sanitizedField = field.trim().replace(/[^a-zA-Z0-9]+/g, "_");
              return [field, $(`#filter-${sanitizedField}`).val()];
          })
      );

      $("#filterModal").modal("hide");

      return data.filter((item) =>
          Object.entries(this.filters).every(([key, values]) => !values || !values.length || values.includes(item[key]))
      );
  }


  clearFilter() {
      Object.keys(this.filters).forEach(field => {
          const sanitizedField = field.trim().replace(/[^a-zA-Z0-9]+/g, "_");
          $(`#filter-${sanitizedField}`).val([]).selectpicker("refresh");
      });

      return StorageService.currentData[StorageService.currentFile][StorageService.currentSheet].data;
  }


  initializeFilters(columns) {
      this.filters = columns.reduce((acc, column) => {
          acc[column] = new Set();
          return acc;
      }, {});
  }
}
