function loadUserMenus() {
  const apiKey = localStorage.getItem("zonalApiKey") || localStorage.getItem("jathaApiKey") || localStorage.getItem("apiKey");
  if (!apiKey) return;

  $.ajax({
    url: "php/user-menus.php",
    method: "POST",
    data: { api_key: apiKey },
    success: function (response) {
      if (response.menus) {
        renderMenus(response.menus);
        $("#loggedInUsername").text(response.username);
      }
    },
    error: function () {
      localStorage.clear();
      window.location.href = "index.html";
    },
  });
}

function renderMenus(menus) {
  const menuContainer = $("#dynamic-menus");
  // Remove existing menu items (but keep right-side items)
  menuContainer.find(".sidebar-item:not(.right)").remove();

  // Get current page to highlight selected menu
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  // Add user's allowed menus
  menus.forEach((menu) => {
    const isSelected = menu.url === currentPage ? " selected" : "";
    const menuItem = `
            <a href="${menu.url}" id="${menu.id}" class="sidebar-item force-show${isSelected}">
                <i class="${menu.icon}"></i>
                <span class="sidebar-text">${menu.name}</span>
            </a>
        `;
    menuContainer.append(menuItem);
  });
}

function handleLogout() {
  const apiKey = localStorage.getItem("zonalApiKey") || localStorage.getItem("jathaApiKey") || localStorage.getItem("apiKey");
  $.ajax({
    url: "php/logout.php",
    method: "POST",
    data: { api_key: apiKey || "" },
    timeout: 5000,
  }).always(function () {
    localStorage.clear();
    window.location.href = "index.html";
  });
}

$(document).ready(function () {
  // Load dynamic menus based on user permissions
  loadUserMenus();

  // Bind logout handler
  $(document).on("click", "#clearStorageModalYes", function (e) {
    e.preventDefault();
    handleLogout();
  });
});
