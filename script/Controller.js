class Controller {
  constructor(excelService, tableService, storageService, filterService, downloadService, pivotService) {
    this.excelService = excelService;
    this.tableService = tableService;
    this.storageService = storageService;
    this.filterService = filterService;
    this.downloadService = downloadService;
    this.pivotService = pivotService;
    this.attachEventListeners = this.attachEventListeners.bind(this);
    this.uploadAndProcessFile = this.uploadAndProcessFile.bind(this);
    this.loadDataFromFiles = this.loadDataFromFiles.bind(this);
    this.loadDataFromSheet = this.loadDataFromSheet.bind(this);
    this.clearStorageAndReload = this.clearStorageAndReload.bind(this);
    this.toggleSidebar = this.toggleSidebar.bind(this);
    this.filter = this.filter.bind(this);
    this.clearFilter = this.clearFilter.bind(this);
    this.download = this.download.bind(this);
    this.pivotByMaleFemale = this.pivotByMaleFemale.bind(this);
    this.init = this.init.bind(this);
    this.refreshQueryStudioTable = this.refreshQueryStudioTable.bind(this);
    this.attachEventListeners(this);
    this.submitApiKey = this.submitApiKey.bind(this);
    this.refreshTrigger = this.refreshTrigger.bind(this);

    if (window.OFFLINE_MODE) {
      window.queryStudioFilterEngine = new FilterEngine();
      window.queryStudioUI = new QueryStudioUI(window.queryStudioFilterEngine, this.refreshQueryStudioTable);
    }
  }

  attachEventListeners(event) {
    $(document).ready(() => {
      $("#m-home").click(this.loadHomePage);
      $("#uploadTrigger").click(() => $("#inputExcel").trigger("click"));
      $("#inputExcel").change(this.uploadAndProcessFile);
      $("#fileNamesCombo").change(this.loadDataFromFiles);
      $("#sheetNamesCombo").change(this.loadDataFromSheet);
      $("#sidebar-toggle-btn").click(this.toggleSidebar);
      $("#m-mf-pivot").click(this.pivotByMaleFemale);
      $("#downloadModalYes").click(this.download);
      if (window.OFFLINE_MODE) {
        $("#clearStorageModalYes").click(this.clearStorageAndReload);
      } else {
        $("#filterTrigger").click(this.filter);
        $("#clearFilterTrigger").click(this.clearFilter);
        $("#submitApiKey").click(this.submitApiKey);
        $("#refreshTrigger").click(this.refreshTrigger);
        $("#apiKeyForm").on("keydown", function (e) {
          if (e.key === "Enter" || e.keyCode === 13) {
            e.preventDefault();
            $("#submitApiKey").click();
          }
        });
      }
    });
    this.excelService.reloadFiles();
    this.init(event);
  }

  init(event) {
    if (window.OFFLINE_MODE) {
      if (window.queryStudioUI) window.queryStudioUI.setStudioMode("empty");
      window.updateQueryStudioSheetControl();
      this.syncQueryStudioSheet();
      this.loadHomePage();
      return;
    }

    const apiKey = localStorage.getItem(API_KEYS.CURRENT_API_KEY);
    if (!apiKey) {
      $("#apiKeyModal").modal("show");
      $("#errorAPIKey").hide();
    } else {
      this.loadHomePage();
    }
    this.filterService.initFilters();
    this.downloadService.initFilters();
    this.fetchApiVersion();
  }

  syncQueryStudioSheet() {
    if (!window.queryStudioFilterEngine) return;
    if (StorageService.currentRecord && Object.keys(StorageService.currentRecord).length) {
      if (!StorageService.currentRecord.columns && StorageService.currentRecord.headers) {
        StorageService.currentRecord.columns = ColumnSchemaService.inferColumns(
          StorageService.currentRecord.headers,
          StorageService.currentRecord.data || []
        );
      }
      window.queryStudioFilterEngine.setSheet(StorageService.currentRecord);
      window.queryStudioFilterEngine.resetFilters(false);
    } else {
      window.queryStudioFilterEngine.setSheet({ data: [], columns: [], headers: [] });
      window.queryStudioFilterEngine.resetFilters(false);
    }
  }

  refreshQueryStudioTable(fullRebuild = true) {
    if (!window.OFFLINE_MODE) return;
    const hasSource = Boolean(window.queryStudioFilterEngine?.sourceData?.length || StorageService.currentRecord?.data?.length);
    if (!hasSource) {
      this.tableService.generateTable({ data: [], headers: [] });
      if (window.queryStudioUI) window.queryStudioUI.setStudioMode("empty");
      return;
    }
    if (fullRebuild === false && this.tableService.studioGrid) {
      const rows = window.queryStudioFilterEngine.getViewRows();
      this.tableService.studioGrid.setRows(rows);
      $("#h-dataTable thead .qs-header-title-row th").each((_, th) => {
        const key = $(th).attr("data-key");
        const active = window.queryStudioFilterEngine
          .getFilters()
          .some((filter) => filter.column === key && window.queryStudioFilterEngine.isFilterActive(filter));
        $(th).toggleClass("is-filtered", active);
      });
      if (window.queryStudioUI) {
        window.queryStudioUI.setStudioMode("ready");
        window.queryStudioUI.updateResultsBar();
        window.queryStudioUI.renderFilterChips();
        window.queryStudioUI.syncColumnFilterMarkers();
        window.queryStudioUI.updateFilterBadge();
      }
      return;
    }
    this.tableService.generateTable(StorageService.currentRecord, { preservePaging: true });
  }

  fetchApiVersion() {
    $.ajax({
      url: API_URLS.VERSION,
      type: "GET",
      dataType: "json",
      timeout: 5000,
      crossDomain: true,
      success: (response) => {
        if (response && response.version) {
          const date = new Date(response.version);
          const formattedDate = date.toLocaleString("en-IN", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
          $("#apiLastUpdated").text(formattedDate);
        } else {
          $("#apiLastUpdated").text("Unknown");
        }
        this.displayUsername(response?.username);
      },
      error: (xhr, status, error) => {
        console.log("Could not fetch API version:", error);
        $("#apiLastUpdated").text("Unavailable");
        this.displayUsername();
      },
    });
  }

  displayUsername(username) {
    if (username) {
      $("#loggedInUsername").removeClass("loading").addClass("success").text(username).removeClass("loaded");
      setTimeout(() => {
        $("#loggedInUsername").addClass("loaded");
      }, 100);
      $("#clearStorageTrigger").show();
    }
  }

  uploadAndProcessFile(event) {
    if (this.excelService) {
      this.excelService
        .uploadAndProcessFile(event)
        .then(() => $("#fileNamesCombo").val(StorageService.currentFile).change())
        .then(() => $("#inputExcel").val(""))
        .catch((error) => console.error("Error processing Excel file", error));
    }
  }

  loadHomePage() {
    $(".custom-card").removeClass("show");
    $("#c-home").addClass("show");

    if (window.OFFLINE_MODE) {
      if (StorageService.currentFile && StorageService.currentRecord?.data?.length) {
        this.refreshQueryStudioTable(true);
      } else {
        this.tableService.generateTable({ data: [], headers: [] });
        if (window.queryStudioUI) window.queryStudioUI.setStudioMode("empty");
      }
      return;
    }

    if (StorageService.currentFile) {
      this.tableService.generateTable(StorageService.currentRecord);
    } else {
      this.refreshTrigger();
    }
  }

  refreshTrigger() {
    if (window.OFFLINE_MODE) {
      return;
    }
    this.excelService
      .call()
      .then(() => {
        this.tableService.generateTable(StorageService.currentRecord);
        this.filterService.initFilters();
        this.downloadService.initFilters();
        localStorage.removeItem("zonalDataCache");
        localStorage.removeItem("sewadarsDataCache");
        $("#sheetNamesCombo").val($("#sheetNamesCombo option:first").val()).trigger("change");
        if (window.zonalService) {
          window.zonalService.refreshCache();
        }
        if (window.requestsService) {
          window.requestsService.refreshCache();
        }
      })
      .catch((err) => {
        console.error("Error loading the table:", err);
      });
  }

  submitApiKey() {
    if (window.OFFLINE_MODE) {
      return;
    }
    const apiKey = $("#apiKeyInput").val();
    if (apiKey) {
      localStorage.setItem(API_KEYS.CURRENT_API_KEY, btoa(apiKey));
      $("#apiKeyModal").modal("hide");
      this.refreshTrigger();
      window.location.reload();
    } else {
      $("#apiKeyModal").modal("show");
      console.log("Please enter a valid API key");
    }
  }

  clearStorageAndReload() {
    this.storageService.clear();
    $("#clearStorageModal").modal("hide");
    window.location.reload();
  }

  toggleSidebar() {
    $("#sidebarMenu, .container.main-content").toggleClass("expanded");
  }

  download() {
    if ($("#titleValue").val().trim() == "") {
      alert("Please provide the title name");
      return false;
    }
    this.downloadService.download();
  }
  filter() {
    $("#filterIcon").addClass("blink");
    StorageService.currentRecord.data = this.filterService.filter();
    this.loadHomePage();
  }
  clearFilter() {
    $("#filterIcon").removeClass("blink");
    StorageService.currentRecord.data = this.filterService.clearFilter();
    this.loadHomePage();
  }
  pivotByMaleFemale() {
    $(".custom-card").removeClass("show");
    $("#c-mf-pivot").addClass("show");
    this.pivotService.pivotByMaleFemale();
  }
  loadDataFromFiles(event) {
    StorageService.currentFile = $("#fileNamesCombo").val();
    $("#sheetNamesCombo").empty();
    const file = StorageService.currentData[StorageService.currentFile];
    Object.keys(file || {}).forEach((key) => {
      $("#sheetNamesCombo").append(
        $("<option>", {
          value: key,
          text: key,
        })
      );
    });
    if (window.OFFLINE_MODE) window.updateQueryStudioSheetControl();
    $("#sheetNamesCombo").val($("#sheetNamesCombo option:first").val()).trigger("change");
  }
  loadDataFromSheet(event) {
    StorageService.currentFile = $("#fileNamesCombo").val();
    StorageService.currentSheet = $("#sheetNamesCombo").val();
    StorageService.currentRecord = jQuery.extend(true, {}, StorageService.currentData[StorageService.currentFile][StorageService.currentSheet]);
    if (window.OFFLINE_MODE) {
      window.updateQueryStudioSheetControl();
      this.syncQueryStudioSheet();
      this.loadHomePage();
      return;
    }
    this.init(event);
  }
}

window.updateQueryStudioSheetControl = function updateQueryStudioSheetControl() {
  const $control = $("#qsSheetControl");
  if (!$control.length) return;
  const file = StorageService.currentFile && StorageService.currentData ? StorageService.currentData[StorageService.currentFile] : null;
  const sheetNames = file ? Object.keys(file) : [];
  const sheetCount = sheetNames.length;
  const hasSheets = sheetCount > 0 && $("#sheetNamesCombo option").length > 0 && $("#sheetNamesCombo option:first").val() !== "None";

  if (!hasSheets) {
    $control.prop("hidden", true).removeClass("is-visible is-single").find(".qs-sheet-chip").remove();
    $control.find(".sidebar-text").show();
    return;
  }

  $control.prop("hidden", false).addClass("is-visible");
  $control.find(".qs-sheet-chip").remove();

  if (sheetCount === 1) {
    const name = sheetNames[0];
    $control.addClass("is-single");
    $control.find(".sidebar-text").hide();
    $control.append(`<span class="qs-sheet-chip" title="Sheet">${name}</span>`);
  } else {
    $control.removeClass("is-single");
    $control.find(".sidebar-text").show();
  }
};

const storageService = new StorageService();
const tableService = new TableService();
const excelService = new ExcelService(storageService);
const filterService = new FilterService(storageService);
const downloadService = new DownloadService(filterService);
const pivotService = new PivotService();
const controller = new Controller(excelService, tableService, storageService, filterService, downloadService, pivotService);
