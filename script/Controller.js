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
      $("#clearStorageModalYes").click(this.clearStorageAndReload);
      $("#sidebar-toggle-btn").click(this.toggleSidebar);
      $("#m-mf-pivot").click(this.pivotByMaleFemale);
      $("#filterTrigger").click(this.filter);
      $("#clearFilterTrigger").click(this.clearFilter);
      $("#downloadModalYes").click(this.download);
      $("#submitApiKey").click(this.submitApiKey);
      $("#refreshTrigger").click(this.refreshTrigger);
    });
    this.excelService.reloadFiles();
    this.init(event);
  }

  init(event) {
    const apiKey = localStorage.getItem('apiKey');
    if (!apiKey) {
      $('#apiKeyModal').modal('show');
      $("#errorAPIKey").hide();
    }else{
      this.loadHomePage();
    }
    this.filterService.initFilters();
    this.downloadService.initFilters();
  }

  uploadAndProcessFile(event) {
    if (this.excelService) {
      this.excelService
        .uploadAndProcessFile(event)
        .then(() => $("#fileNamesCombo").val(StorageService.currentFile).change())
        .then(()=>$("#inputExcel").val(""))
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

    refreshTrigger()
    {
            this.excelService.call().then(() => {
                this.tableService.generateTable(StorageService.currentRecord);
                this.filterService.initFilters();
                this.downloadService.initFilters();
                $("#sheetNamesCombo").val($("#sheetNamesCombo option:first").val()).trigger("change");
            }).catch(err => {
              console.error("Error loading the table:", err);
            });
    }


  submitApiKey(){
    const apiKey = $('#apiKeyInput').val();
    if (apiKey) {
      localStorage.setItem('apiKey', apiKey);
      $('#apiKeyModal').modal('hide');
      this.refreshTrigger();
    } else {
      $('#apiKeyModal').modal('show');
      console.log('Please enter a valid API key');
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
