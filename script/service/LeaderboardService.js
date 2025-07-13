// LeaderboardService.js
// All leaderboard logic moved from leaderboard.html

$(document).ready(function () {
  // Set the correct endpoint and API key for leaderboard
  API_URLS.CURRENT_URL = "https://sewasamiti.ahujaenterprise.com/php/leaderboard-api.php";
  API_KEYS.CURRENT_API_KEY = localStorage.getItem(API_KEYS.ZONAL) || localStorage.getItem(API_KEYS.QUERY);

  // Global variables
  let leaderboardChart = null;
  let leaderboardTable = null;
  let currentData = [];

  // Register Chart.js plugins
  if (typeof ChartDataLabels !== "undefined") {
    Chart.register(ChartDataLabels);
    console.log("ChartDataLabels plugin registered successfully");
  } else {
    console.warn("ChartDataLabels plugin not available, count labels may not display");
  }

  // Initialize application
  console.log("Leaderboard page initialized");

  // Check authentication - use ZONAL if available, otherwise use QUERY
  let apiKey = localStorage.getItem(API_KEYS.ZONAL);
  if (!apiKey) {
    // Fallback to QUERY API key
    apiKey = localStorage.getItem(API_KEYS.QUERY);
    if (apiKey) {
      console.log("ZONAL API key not found, using QUERY API key");
      localStorage.setItem(API_KEYS.ZONAL, apiKey); // Store QUERY key as ZONAL for consistency
    }
  }

  if (!apiKey) {
    console.log("No API key found, showing login modal");
    $("#apiKeyModal").modal("show");
    $("#errorAPIKey").hide();
  } else {
    console.log("API key found, initializing page");
    initializePage();
    loadLeaderboardData();
  }

  // Attach event listeners
  attachEventListeners();

  function attachEventListeners() {
    // Download chart button
    $("#downloadChart").on("click", function () {
      console.log("Download chart button clicked");
      downloadChart();
    });

    // Refresh button
    $("#refreshLeaderboard").on("click", function () {
      console.log("Refresh button clicked");
      loadLeaderboardData();
    });

    // Filter changes
    $("#dateRange, #topCount").on("change", function () {
      console.log("Filter changed:", $(this).attr("id"), $(this).val());
      loadLeaderboardData();
      // Update display visibility based on date range
      if ($(this).attr("id") === "dateRange") {
        updateDisplayVisibility();
      }
    });

    // Logout
    $("#clearStorageModalYes").on("click", function () {
      localStorage.clear();
      window.location.href = "index.html";
    });

    // API Key form
    $("#submitApiKey").on("click", function () {
      const apiKey = $("#apiKeyInput").val();
      if (apiKey) {
        localStorage.setItem(API_KEYS.ZONAL, btoa(btoa(apiKey)));
        $("#apiKeyModal").modal("hide");
        window.location.reload();
      } else {
        $("#errorAPIKey").text("Please enter a valid password").show();
      }
    });

    // Enter key in API key form
    $("#apiKeyForm").on("keydown", function (e) {
      if (e.key === "Enter" || e.keyCode === 13) {
        e.preventDefault();
        $("#submitApiKey").click();
      }
    });
  }

  function initializePage() {
    console.log("Initializing page components");

    // Set username
    const apiKey = localStorage.getItem(API_KEYS.ZONAL);
    if (apiKey) {
      try {
        const decodedApiKey = atob(apiKey);
        const finalDecoded = atob(decodedApiKey);
        const parts = finalDecoded.split(",");
        if (parts.length === 2) {
          const username = parts[0].trim();
          $("#loggedInUsername").text(username);
        }
      } catch (error) {
        console.error("Error decoding API key:", error);
      }
    }

    // Initialize DataTable
    leaderboardTable = $("#leaderboardTable").DataTable({
      responsive: true,
      pageLength: 25,
      order: [[2, "desc"]], // Sort by forms completed descending
      columnDefs: [
        { targets: 0, width: "80px" }, // Rank
        { targets: 1, width: "250px" }, // Name
        { targets: 2, width: "150px" }, // Forms Completed
        { targets: 3, width: "150px" }, // Last Activity
      ],
    });

    console.log("Page components initialized");
  }

  function loadLeaderboardData() {
    console.log("Loading leaderboard data");
    $("#loader").show();

    const dateRange = $("#dateRange").val();
    const topCount = $("#topCount").val();
    const apiKey = API_KEYS.CURRENT_API_KEY;

    if (!apiKey) {
      $("#loader").hide();
      showError("Authentication required. Please login again.");
      return;
    }

    $.ajax({
      url: API_URLS.CURRENT_URL,
      method: "POST",
      data: {
        api_key: apiKey,
        dateRange: dateRange,
        topCount: topCount,
      },
      success: function (response) {
        $("#loader").hide();
        console.log("API Response:", response);

        if (response.success) {
          currentData = response.data;
          console.log("Data received:", currentData);
          console.log("Debug info:", response.debug);

          if (currentData && currentData.length > 0) {
            updateChart();
            updateTable(response);
          } else {
            showError("No data available for the selected criteria. Debug: " + JSON.stringify(response.debug));
          }
        } else {
          showError(response.message || "Failed to load leaderboard data");
        }
      },
      error: function (xhr, status, error) {
        $("#loader").hide();
        console.error("API Error:", error);
        showError("Network error: " + error);
      },
    });
  }

  function updateChart() {
    console.log("Updating chart with data:", currentData);

    // Check if Chart.js is available
    if (typeof Chart === "undefined") {
      console.error("Chart.js is not available");
      showError("Chart library is not available. Please refresh the page.");
      return;
    }

    const canvas = document.getElementById("leaderboardChart");
    if (!canvas) {
      console.error("Canvas element not found");
      return;
    }

    // Destroy existing chart
    if (leaderboardChart) {
      leaderboardChart.destroy();
    }

    // Prepare data
    const labels = currentData.map((item) => item.user);
    const data = currentData.map((item) => item.formCount || 0); // Ensure no undefined values
    const colors = generateColors(currentData.length);

    console.log("Chart data prepared:", { labels, data, colors });

    // Validate data
    if (!data || data.length === 0) {
      console.warn("No valid data for chart");
      return;
    }

    try {
      // Register datalabels plugin if available
      if (typeof ChartDataLabels !== "undefined") {
        Chart.register(ChartDataLabels);
      }

      // Get current date range for title
      const currentDateRange = $("#dateRange").val();
      let chartTitle = "Sewadar Updation Leaderboard";

      if (currentDateRange !== "all") {
        const now = new Date();
        switch (currentDateRange) {
          case "today":
            const today = now.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            });
            chartTitle = `Updation on ${today}`;
            break;
          case "week":
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6); // Sunday
            const weekStartStr = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const weekEndStr = weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            chartTitle = `Performance: ${weekStartStr} - ${weekEndStr}`;
            break;
          case "month":
            const monthYear = now.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            });
            chartTitle = `Performance for ${monthYear}`;
            break;
          case "year":
            const year = now.getFullYear();
            chartTitle = `Performance for ${year}`;
            break;
        }
      }

      leaderboardChart = new Chart(canvas, {
        type: "bar",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Forms Completed",
              data: data,
              backgroundColor: colors,
              borderColor: colors.map((color) => color.replace("0.8", "1")),
              borderWidth: 1,
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: chartTitle,
              font: {
                size: 18,
                weight: "bold",
              },
              color: "#333",
              padding: {
                top: 10,
                bottom: 20,
              },
            },
            legend: {
              display: false,
            },
            tooltip: {
              backgroundColor: "rgba(0, 0, 0, 0.9)",
              titleColor: "white",
              bodyColor: "white",
              borderColor: "rgba(54, 162, 235, 1)",
              borderWidth: 1,
              cornerRadius: 8,
              displayColors: false,
              callbacks: {
                label: function (context) {
                  return `Forms: ${context.parsed.y}`;
                },
              },
            },
            datalabels: {
              color: "#333",
              anchor: "end",
              align: "top",
              offset: 8,
              font: {
                weight: "bold",
                size: 13,
              },
              formatter: function (value, context) {
                if (context.parsed && context.parsed.y !== undefined) {
                  return context.parsed.y;
                }
                return value || "";
              },
              display: function (context) {
                return context.parsed && context.parsed.y && context.parsed.y > 0;
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: "rgba(0, 0, 0, 0.05)",
                drawBorder: false,
              },
              ticks: {
                color: "#666",
                font: {
                  size: 11,
                },
                padding: 8,
              },
              title: {
                display: false,
              },
            },
            x: {
              grid: {
                display: false,
              },
              ticks: {
                color: "#666",
                font: {
                  size: 10,
                },
                maxRotation: 45,
                minRotation: 0,
              },
              title: {
                display: false,
              },
            },
          },
        },
      });
      console.log("Chart created successfully");

      // Debug: Check if datalabels are working
      if (typeof ChartDataLabels !== "undefined") {
        console.log("ChartDataLabels plugin is available and should show count labels");
      } else {
        console.warn("ChartDataLabels plugin not loaded - count labels may not appear");
        // Fallback: Manually add count labels
        addManualCountLabels();
      }
    } catch (error) {
      console.error("Error creating chart:", error);
      showError("Failed to create chart: " + error.message);
    }
  }

  function updateTable(response) {
    console.log("Updating table with data:", currentData);

    if (!leaderboardTable) {
      console.error("DataTable not initialized");
      return;
    }

    // Get total completed forms from API response
    const totalCompletedForms = response.totalCompletedForms || 0;
    const totalTargetForms = 13660; // Total target forms
    const remainingForms = totalTargetForms - totalCompletedForms;
    const progressPercentage = Math.round((totalCompletedForms / totalTargetForms) * 100);

    // Get current date range
    const currentDateRange = $("#dateRange").val();

    // Update completed forms (always shown)
    $("#totalForms").text(totalCompletedForms.toLocaleString());

    // Show/hide remaining forms and progress based on date range
    if (currentDateRange === "all") {
      // Show remaining forms and progress for "All Time"
      $("#remainingForms").text(remainingForms.toLocaleString());
      $("#progressPercentage").text(progressPercentage + "%");

      // Update progress bar
      $("#progressBar").css("width", progressPercentage + "%");

      // Change progress bar color based on completion
      if (progressPercentage >= 80) {
        $("#progressBar").removeClass("bg-warning bg-danger").addClass("bg-success");
      } else if (progressPercentage >= 50) {
        $("#progressBar").removeClass("bg-success bg-danger").addClass("bg-warning");
      } else {
        $("#progressBar").removeClass("bg-success bg-warning").addClass("bg-danger");
      }

      // Show remaining forms section and progress bar
      $(".remaining-forms-section").show();
      $(".progress-section").show();
    } else {
      // Hide remaining forms and progress for other date ranges
      $(".remaining-forms-section").hide();
      $(".progress-section").hide();
    }

    // Clear existing data
    leaderboardTable.clear();

    // Add new data
    currentData.forEach((item, index) => {
      const rank = index + 1;
      let rankDisplay = rank;

      if (rank === 1) {
        rankDisplay = `<span class="badge badge-warning" style="background: linear-gradient(45deg, #FFD700, #FFA500); color: #000; font-weight: bold;">
          ${rank}
        </span>`;
      } else if (rank === 2) {
        rankDisplay = `<span class="badge badge-secondary" style="background: linear-gradient(45deg, #C0C0C0, #A0A0A0); color: #000; font-weight: bold;">
          ${rank}
        </span>`;
      } else if (rank === 3) {
        rankDisplay = `<span class="badge badge-danger" style="background: linear-gradient(45deg, #CD7F32, #B8860B); color: #fff; font-weight: bold;">
          ${rank}
        </span>`;
      }

      leaderboardTable.row.add([rankDisplay, item.user, `<span class="badge badge-success">${item.formCount}</span>`, formatDate(item.lastActivity)]);
    });

    leaderboardTable.draw();
    console.log("Table updated successfully");
  }

  function generateColors(count) {
    const colors = [
      "rgba(255, 99, 132, 0.8)",
      "rgba(54, 162, 235, 0.8)",
      "rgba(255, 206, 86, 0.8)",
      "rgba(75, 192, 192, 0.8)",
      "rgba(153, 102, 255, 0.8)",
      "rgba(255, 159, 64, 0.8)",
      "rgba(199, 199, 199, 0.8)",
      "rgba(83, 102, 255, 0.8)",
      "rgba(78, 252, 3, 0.8)",
      "rgba(252, 3, 244, 0.8)",
    ];

    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length]);
    }
    return result;
  }

  function formatDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return (
      date.toLocaleDateString("en-IN") +
      " " +
      date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }

  function addManualCountLabels() {
    if (!leaderboardChart) return;

    const canvas = document.getElementById("leaderboardChart");
    const ctx = canvas.getContext("2d");

    // Get chart data
    const data = leaderboardChart.data.datasets[0].data;
    const meta = leaderboardChart.getDatasetMeta(0);

    // Draw count labels manually
    data.forEach((value, index) => {
      if (value > 0 && meta.data[index] && meta.data[index].y !== undefined) {
        const bar = meta.data[index];
        const x = bar.x;
        const y = bar.y - 10; // Position above the bar

        // Draw background for better readability
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.fillRect(x - 15, y - 15, 30, 20);

        // Draw the count text
        ctx.fillStyle = "#333";
        ctx.font = "bold 13px Arial";
        ctx.textAlign = "center";
        ctx.fillText(value, x, y);
      }
    });
  }

  function updateDisplayVisibility() {
    const currentDateRange = $("#dateRange").val();

    if (currentDateRange === "all") {
      // Show remaining forms section and progress bar for "All Time"
      $(".remaining-forms-section").show();
      $(".progress-section").show();
    } else {
      // Hide remaining forms and progress for other date ranges
      $(".remaining-forms-section").hide();
      $(".progress-section").hide();
    }
  }

  function downloadChart() {
    if (!leaderboardChart) {
      showError("No chart available to download. Please load data first.");
      return;
    }

    try {
      // Get current date range and top count for filename
      const dateRange = $("#dateRange").val();
      const topCount = $("#topCount").val();
      const currentDate = new Date().toISOString().split("T")[0];

      // Create filename
      let filename = `leaderboard_${dateRange}`;
      if (topCount !== "all") {
        filename += `_top${topCount}`;
      }
      filename += `_${currentDate}.png`;

      // Download the chart as PNG
      const canvas = document.getElementById("leaderboardChart");
      const link = document.createElement("a");
      link.download = filename;
      link.href = canvas.toDataURL("image/png");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log("Chart downloaded successfully:", filename);
    } catch (error) {
      console.error("Error downloading chart:", error);
      showError("Failed to download chart: " + error.message);
    }
  }

  function showError(message) {
    $("#errorModalBody").text(message);
    $("#errorModal").modal("show");
  }
});
