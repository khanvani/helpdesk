function loadUserMenus() {
  const apiKey = localStorage.getItem("zonalApiKey") || localStorage.getItem("jathaApiKey") || localStorage.getItem("apiKey");
  if (!apiKey) return;

  $.ajax({
    url: API_URLS.USER_MENUS,
    method: "POST",
    data: { api_key: apiKey },
    crossDomain: true, // Enable CORS
    success: function (response) {
      if (response.menus) {
        renderMenus(response.menus);
        $("#loggedInUsername").text(response.username);
        $("#sidebar-username").text(response.username);
      }
    },
    error: function () {
      localStorage.clear();
      window.location.href = "index.html";
    },
  });
}

function renderMenus(menus) {
  const sidebarMenu = $("#sidebar-menu");
  sidebarMenu.empty();

  // Get current page to highlight selected menu
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  let currentMenuName = "Helpdesk";

  // Add user's allowed menus
  menus.forEach((menu) => {
    const isActive = menu.url === currentPage ? " active" : "";
    if (menu.url === currentPage) {
      currentMenuName = menu.name;
    }
    const menuItem = `
            <a href="${menu.url}" id="${menu.id}" class="sidebar-menu-item${isActive}">
                <i class="${menu.icon}"></i>
                <span>${menu.name}</span>
            </a>
        `;
    sidebarMenu.append(menuItem);
  });

  // Display current menu in top bar
  if ($("#current-menu").length === 0) {
    $("#dynamic-menus").append(`<span id="current-menu">${currentMenuName}</span>`);
  } else {
    $("#current-menu").text(currentMenuName);
  }

  // Add logout option at the bottom
  const logoutItem = `
        <a href="#" id="sidebar-logout" class="sidebar-menu-item" data-toggle="modal" data-target="#clearStorageModal">
            <i class="fas fa-sign-out-alt"></i>
            <span>Logout</span>
        </a>
    `;
  $("#sidebar-actions").html(logoutItem);
}

function handleLogout() {
  const apiKey = localStorage.getItem("zonalApiKey") || localStorage.getItem("jathaApiKey") || localStorage.getItem("apiKey");
  $.ajax({
    url: "php/logout.php",
    method: "POST",
    data: { api_key: apiKey || "" },
    timeout: 5000,
    crossDomain: true, // Enable CORS
  }).always(function () {
    localStorage.clear();
    window.location.href = "index.html";
  });
}

$(document).ready(function () {
  // Load dynamic menus based on user permissions
  loadUserMenus();

  // Sidebar toggle functionality
  $(document).on("click", "#sidebar-toggle", function() {
    $("#sidebar").toggleClass("open");
    $("#sidebar-overlay").toggleClass("show");
  });

  // Close sidebar when clicking overlay (mobile)
  $(document).on("click", "#sidebar-overlay", function() {
    $("#sidebar").removeClass("open");
    $("#sidebar-overlay").removeClass("show");
  });

  // Close sidebar when clicking menu item (all devices)
  $(document).on("click", ".sidebar-menu-item", function() {
    $("#sidebar").removeClass("open");
    $("#sidebar-overlay").removeClass("show");
  });

  // Bind logout handler
  $(document).on("click", "#clearStorageModalYes, #sidebar-logout", function (e) {
    if ($(this).attr('id') === 'sidebar-logout') {
      e.preventDefault();
      return; // Let modal handle it
    }
    e.preventDefault();
    handleLogout();
  });
});
