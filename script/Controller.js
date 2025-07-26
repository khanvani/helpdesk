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
    this.attachEventListeners(this);
    this.submitApiKey = this.submitApiKey.bind(this);
    this.refreshTrigger = this.refreshTrigger.bind(this);
  }

  attachEventListeners(event) {
    $(document).ready(() => {
      $("#m-home").click(this.loadHomePage);
      $("#uploadTrigger").click(() => $("#inputExcel").trigger("click"));
      $("#inputExcel").change(this.uploadAndProcessFile);
      $("#fileNamesCombo").change(this.loadDataFromFiles);
      $("#sheetNamesCombo").change(this.loadDataFromSheet);
      // Remove this line since MenuService handles logout now
      $("#sidebar-toggle-btn").click(this.toggleSidebar);
      $("#m-mf-pivot").click(this.pivotByMaleFemale);
      $("#filterTrigger").click(this.filter);
      $("#clearFilterTrigger").click(this.clearFilter);
      $("#downloadModalYes").click(this.download);
      $("#submitApiKey").click(this.submitApiKey);
      $("#refreshTrigger").click(this.refreshTrigger);
      $("#apiKeyForm").on("keydown", function (e) {
        if (e.key === "Enter" || e.keyCode === 13) {
          e.preventDefault();
          $("#submitApiKey").click();
        }
      });
    });
    this.excelService.reloadFiles();
    this.init(event);
  }

  init(event) {
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
    /**
    document.addEventListener('contextmenu', function (e) {
      e.preventDefault();
    });

    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey && e.shiftKey && e.key === 'I') || (e.key === 'F12')) {
        e.preventDefault();
      }
    });**/
  }

  fetchApiVersion() {
    $.ajax({
      url: "php/version.php",
      type: "GET",
      dataType: "json",
      timeout: 5000,
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
      },
      error: (xhr, status, error) => {
        console.log("Could not fetch API version:", error);
        $("#apiLastUpdated").text("Unavailable");
      },
    });
    this.displayUsername();
  }

  displayUsername() {
    try {
      // Add loading state
      const encodedApiKey = localStorage.getItem(API_KEYS.CURRENT_API_KEY);
      $("#loggedInUsername").addClass("loading").text("Loading...");
      // Decode the base64 API key
      const decodedApiKey = atob(encodedApiKey);
      // Decode it again (double encoded as per PHP config)
      const finalDecoded = atob(decodedApiKey);
      // Split by comma to get username and password
      const parts = finalDecoded.split(",");
      if (parts.length === 2) {
        const username = parts[0].trim();

        // Update the username display with animation
        $("#loggedInUsername").removeClass("loading").addClass("success").text(username).removeClass("loaded");

        // Trigger animation
        setTimeout(() => {
          $("#loggedInUsername").addClass("loaded");
        }, 100);

        // Show the logout button
        $("#clearStorageTrigger").show();
      } else {
        console.error("Invalid API key format");
        $("#loggedInUsername").removeClass("loading success").text("User");
        $("#clearStorageTrigger").hide();
      }
    } catch (error) {
      console.error("Error decoding API key:", error);
      $("#loggedInUsername").removeClass("loading success").text("User");
      $("#clearStorageTrigger").hide();
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

    if (StorageService.currentFile) {
      this.tableService.generateTable(StorageService.currentRecord);
    } else {
      this.refreshTrigger();
    }
  }

  refreshTrigger() {
    this.excelService
      .call()
      .then(() => {
        this.tableService.generateTable(StorageService.currentRecord);
        this.filterService.initFilters();
        this.downloadService.initFilters();
        localStorage.removeItem("zonalDataCache");
        $("#sheetNamesCombo").val($("#sheetNamesCombo option:first").val()).trigger("change");
        
        // Refresh ZonalService cache if it exists
        if (window.zonalService) {
          window.zonalService.refreshCache();
        }
      })
      .catch((err) => {
        console.error("Error loading the table:", err);
      });
  }

  submitApiKey() {
    const apiKey = $("#apiKeyInput").val();
    if (apiKey) {
      localStorage.setItem(API_KEYS.CURRENT_API_KEY, btoa(apiKey)); // Store encoded API key
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
    Object.keys(file).forEach((key, index) => {
      $("#sheetNamesCombo").append(
        $("<option>", {
          value: key,
          text: key,
        })
      );
    });
    $("#sheetNamesCombo").val($("#sheetNamesCombo option:first").val()).trigger("change");
    this.init(event);
  }
  loadDataFromSheet(event) {
    StorageService.currentFile = $("#fileNamesCombo").val();
    StorageService.currentSheet = $("#sheetNamesCombo").val();
    StorageService.currentRecord = jQuery.extend(true, {}, StorageService.currentData[StorageService.currentFile][StorageService.currentSheet]);
    this.init(event);
  }
}

const storageService = new StorageService();
const tableService = new TableService();
const excelService = new ExcelService(storageService);
const filterService = new FilterService(storageService);
const downloadService = new DownloadService(filterService);
const pivotService = new PivotService();
const controller = new Controller(excelService, tableService, storageService, filterService, downloadService, pivotService);
