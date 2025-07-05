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

      // Inactivity warning modal handlers
      $("#stayLoggedInBtn").click(() => {
        $("#inactivityWarningModal").modal("hide");
        if (this.resetInactivityTimer) {
          this.resetInactivityTimer();
        }
      });

      $("#logoutNowBtn").click(() => {
        $("#inactivityWarningModal").modal("hide");
        this.autoLogout();
      });

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
      this.displayUsername(apiKey);
      this.initAutoLogout();
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
    // Update activity timestamp on API call
    updateActivityTimestamp();

    $.ajax({
      url: API_URLS.CURRENT_URL.replace("/query-desk.php", "/version.php"),
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
      })
      .catch((err) => {
        console.error("Error loading the table:", err);
      });
  }

  submitApiKey() {
    const apiKey = $("#apiKeyInput").val();
    if (apiKey) {
      localStorage.setItem(API_KEYS.CURRENT_API_KEY, btoa(apiKey)); // Store encoded API key

      // Initialize session timestamps on login
      const now = Date.now();
      localStorage.setItem(SESSION_CONFIG.LAST_ACTIVITY_KEY, now.toString());
      localStorage.setItem(SESSION_CONFIG.SESSION_START_KEY, now.toString());

      $("#apiKeyModal").modal("hide");
      this.displayUsername(btoa(apiKey));
      this.refreshTrigger();
      window.location.reload();
    } else {
      $("#apiKeyModal").modal("show");
      console.log("Please enter a valid API key");
    }
  }

  displayUsername(encodedApiKey) {
    try {
      // Add loading state
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

  initAutoLogout() {
    let inactivityTimer;
    let warningTimer;
    let isWarningShown = false;

    // Check if session has expired on page load
    this.checkSessionExpiry();

    // Function to update last activity timestamp
    const updateLastActivity = () => {
      if (localStorage.getItem(API_KEYS.CURRENT_API_KEY)) {
        localStorage.setItem(SESSION_CONFIG.LAST_ACTIVITY_KEY, Date.now().toString());
      }
    };

    // Function to reset timers
    const resetTimers = () => {
      clearTimeout(inactivityTimer);
      clearTimeout(warningTimer);
      isWarningShown = false;

      // Clear countdown timer if running
      if (this.countdownInterval) {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
      }

      // Hide warning modal if it's open
      $("#inactivityWarningModal").modal("hide");

      // Update last activity timestamp
      updateLastActivity();

      // Set new timers
      inactivityTimer = setTimeout(() => {
        this.autoLogout();
      }, SESSION_CONFIG.INACTIVITY_TIMEOUT);

      // Show warning before logout
      warningTimer = setTimeout(() => {
        this.showInactivityWarning();
      }, SESSION_CONFIG.INACTIVITY_TIMEOUT - SESSION_CONFIG.WARNING_TIME);
    };

    // Function to handle user activity
    const handleUserActivity = (event) => {
      // Don't reset timers if the warning modal is open
      if ($("#inactivityWarningModal").hasClass("show") || $("#inactivityWarningModal").is(":visible")) {
        return;
      }

      if (localStorage.getItem(API_KEYS.CURRENT_API_KEY)) {
        resetTimers();
      }
    };

    // Track user activity events
    const activityEvents = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click", "focus", "input", "change", "submit"];

    activityEvents.forEach((event) => {
      document.addEventListener(event, handleUserActivity, true);
    });

    // Initialize timers
    resetTimers();

    // Store the reset function for manual calls
    this.resetInactivityTimer = resetTimers;
  }

  checkSessionExpiry() {
    const apiKey = localStorage.getItem(API_KEYS.CURRENT_API_KEY);
    if (!apiKey) return;

    const lastActivity = localStorage.getItem(SESSION_CONFIG.LAST_ACTIVITY_KEY);
    const sessionStart = localStorage.getItem(SESSION_CONFIG.SESSION_START_KEY);

    if (!lastActivity || !sessionStart) {
      // Initialize session timestamps if not present
      const now = Date.now();
      localStorage.setItem(SESSION_CONFIG.LAST_ACTIVITY_KEY, now.toString());
      localStorage.setItem(SESSION_CONFIG.SESSION_START_KEY, now.toString());
      return;
    }

    const now = Date.now();
    const timeSinceLastActivity = now - parseInt(lastActivity);
    const totalSessionTime = now - parseInt(sessionStart);

    // Check if session has expired
    if (timeSinceLastActivity > SESSION_CONFIG.INACTIVITY_TIMEOUT) {
      console.log("Session expired due to inactivity");
      this.autoLogout();
      return;
    }

    // Check if total session time exceeds maximum session time
    if (totalSessionTime > SESSION_CONFIG.MAX_SESSION_TIME) {
      console.log("Session expired due to maximum session time");
      this.autoLogout();
      return;
    }

    // If session is still valid, update last activity
    localStorage.setItem(SESSION_CONFIG.LAST_ACTIVITY_KEY, now.toString());
  }

  showInactivityWarning() {
    $("#inactivityWarningModal").modal("show");

    // Start countdown timer (WARNING_TIME in seconds)
    const warningTimeSeconds = Math.floor(SESSION_CONFIG.WARNING_TIME / 1000);
    this.countdownInterval = startCountdownTimer(warningTimeSeconds, "countdownTimer");
  }

  autoLogout() {
    // Hide any open modals
    $(".modal").modal("hide");

    // Show logout notification
    this.showLogoutNotification("You have been automatically logged out due to inactivity.");

    // Clear storage and reload
    this.storageService.clear();

    // Redirect to login after a short delay
    setTimeout(() => {
      window.location.reload();
    }, SESSION_CONFIG.REDIRECT_DELAY);
  }

  showLogoutNotification(message) {
    // Create notification element
    const notification = $(`
      <div id="logoutNotification" style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #8b0002 0%, #a52a2a 100%);
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 300px;
        font-weight: 500;
        border: 2px solid rgba(255,255,255,0.2);
      ">
        <i class="fas fa-info-circle" style="margin-right: 8px;"></i>
        ${message}
      </div>
    `);

    // Add to page
    $("body").append(notification);

    // Auto-remove after configured time
    setTimeout(() => {
      notification.fadeOut(500, function () {
        $(this).remove();
      });
    }, SESSION_CONFIG.NOTIFICATION_DISPLAY_TIME);
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
