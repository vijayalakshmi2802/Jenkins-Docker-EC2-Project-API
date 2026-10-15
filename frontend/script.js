
/*
 * TaskFlow — DevOps Task Manager
 * Supports GitHub Pages frontend and EC2-hosted frontend.
 *
 * IMPORTANT:
 * Set GITHUB_API_BASE to your real HTTPS API URL before publishing.
 * Example: "https://api.yourdomain.com"
 */

const GITHUB_API_BASE = "https://YOUR-HTTPS-API-DOMAIN";
const isGitHubPages =
  window.location.hostname === "vijayalakshmi2802.github.io";

const API = isGitHubPages ? GITHUB_API_BASE : "";

const $ = (id) => document.getElementById(id);

const state = {
  tasks: [],
  view: "all",
  search: ""
};

const dialog = $("taskDialog");

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    try {
      const data = await response.json();
      message = data.error || message;
    } catch (_) {}

    throw new Error(message);
  }

  if (response.status === 204) return null;

  return response.json();
}

function showMessage(message, type = "success") {
  const box = $("message");
  box.textContent = message;
  box.className = `message ${type}`;
  box.hidden = false;
}

function clearMessage() {
  $("message").hidden = true;
}

function setApiStatus(online) {
  $("apiStatus").textContent = online ? "Connected" : "Unavailable";

  const dot = document.querySelector(".status-dot");
  if (dot) {
    dot.className = online
      ? "status-dot online"
      : "status-dot offline";
  }
}

function statusLabel(status) {
  return String(status || "unknown")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isCompleted(task) {
  return task.status === "completed";
}

function renderTasks() {
  const query = state.search.toLowerCase();

  const filtered = state.tasks.filter((task) => {
    const matchesView =
      state.view === "all" ||
      (state.view === "pending" && task.status === "pending") ||
      (state.view === "completed" && isCompleted(task));

    const matchesSearch =
      `${task.title || ""} ${task.description || ""}`
        .toLowerCase()
        .includes(query);

    const selectedStatus = $("statusFilter").value;
    const matchesStatus =
      selectedStatus === "all" || task.status === selectedStatus;

    return matchesView && matchesSearch && matchesStatus;
  });

  $("totalCount").textContent = state.tasks.length;

  $("pendingCount").textContent =
    state.tasks.filter((task) => task.status === "pending").length;

  $("completedCount").textContent =
    state.tasks.filter(isCompleted).length;

  $("listTitle").textContent = {
    all: "All tasks",
    pending: "Pending tasks",
    completed: "Completed tasks"
  }[state.view];

  const list = $("taskList");

  if (!filtered.length) {
    list.innerHTML = `
      <div class="empty-state">
        <strong>No tasks found</strong>
        Try another search or create a new task.
      </div>`;
  } else {
    list.innerHTML = filtered.map((task) => {
      const completed = isCompleted(task);
      const statusClass = String(task.status || "")
        .toLowerCase()
        .replaceAll(" ", "-");

      return `
        <article class="task-card ${completed ? "is-completed" : ""}">
          <div class="task-main">
            <input
              class="task-check"
              type="checkbox"
              data-action="toggle"
              data-id="${escapeHTML(task.id)}"
              aria-label="Toggle task completion"
              ${completed ? "checked" : ""}
            >

            <div>
              <h3 class="task-title">${escapeHTML(task.title)}</h3>

              ${task.description ? `
                <p class="task-description">
                  ${escapeHTML(task.description)}
                </p>
              ` : ""}

              <div class="task-meta">
                <span class="task-id">
                  TASK #${escapeHTML(task.id)}
                </span>

                <span class="status-pill ${escapeHTML(statusClass)}">
                  ${escapeHTML(statusLabel(task.status))}
                </span>
              </div>
            </div>
          </div>

          <div class="task-actions">
            <button
              class="small-btn"
              data-action="edit"
              data-id="${escapeHTML(task.id)}"
            >Edit</button>

            <button
              class="danger-btn"
              data-action="delete"
              data-id="${escapeHTML(task.id)}"
            >Delete</button>
          </div>
        </article>`;
    }).join("");
  }

  $("listFooter").textContent =
    `Showing ${filtered.length} of ${state.tasks.length} tasks`;
}

async function loadTasks(showNotice = false) {
  clearMessage();

  $("taskList").innerHTML =
    '<div class="loading">Loading tasks…</div>';

  try {
    const tasks = await apiRequest("/api/tasks");

    if (!Array.isArray(tasks)) {
      throw new Error("Unexpected task list format from the API.");
    }

    state.tasks = tasks;
    setApiStatus(true);
    renderTasks();

    if (showNotice) {
      showMessage("Tasks refreshed successfully.");
    }
  } catch (error) {
    setApiStatus(false);

    $("taskList").innerHTML = `
      <div class="empty-state">
        <strong>Unable to load tasks</strong>
        ${escapeHTML(error.message)}
      </div>`;

    $("listFooter").textContent = "API connection failed";

    showMessage(
      `${error.message}. Check the API connection and database.`,
      "error"
    );
  }
}

async function checkHealth() {
  try {
    const result = await apiRequest("/health");

    if (result.status === "ok" && result.database === "up") {
      setApiStatus(true);
      return true;
    }

    throw new Error("Database is not healthy.");
  } catch (_) {
    setApiStatus(false);
    return false;
  }
}

function openCreateDialog() {
  $("taskForm").reset();
  $("taskId").value = "";
  $("taskStatus").value = "pending";
  $("dialogTitle").textContent = "Create a task";
  $("saveTaskBtn").textContent = "Create task";
  dialog.showModal();
  $("titleInput").focus();
}

function openEditDialog(task) {
  $("taskForm").reset();
  $("taskId").value = task.id;
  $("titleInput").value = task.title || "";
  $("descriptionInput").value = task.description || "";
  $("taskStatus").value = task.status || "pending";
  $("dialogTitle").textContent = "Edit task";
  $("saveTaskBtn").textContent = "Save changes";
  dialog.showModal();
  $("titleInput").focus();
}

$("taskForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage();

  const id = $("taskId").value;

  const payload = {
    title: $("titleInput").value.trim(),
    description: $("descriptionInput").value.trim(),
    status: $("taskStatus").value
  };

  if (!payload.title) {
    showMessage("Please enter a task title.", "error");
    return;
  }

  $("saveTaskBtn").disabled = true;
  $("saveTaskBtn").textContent = "Saving…";

  try {
    await apiRequest(
      id
        ? `/api/tasks/${encodeURIComponent(id)}`
        : "/api/tasks",
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload)
      }
    );

    dialog.close();
    await loadTasks();

    showMessage(
      id ? "Task updated successfully." : "Task created successfully."
    );
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    $("saveTaskBtn").disabled = false;
    $("saveTaskBtn").textContent =
      id ? "Save changes" : "Create task";
  }
});

$("taskList").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;

  const task = state.tasks.find(
    (item) => String(item.id) === String(id)
  );

  if (!task) return;

  clearMessage();

  if (action === "edit") {
    openEditDialog(task);
    return;
  }

  if (action === "delete") {
    if (!confirm(`Delete "${task.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      await apiRequest(
        `/api/tasks/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );

      await loadTasks();
      showMessage("Task deleted successfully.");
    } catch (error) {
      showMessage(error.message, "error");
    }
  }
});

$("taskList").addEventListener("change", async (event) => {
  const checkbox = event.target.closest(
    'input[data-action="toggle"]'
  );

  if (!checkbox) return;

  const task = state.tasks.find(
    (item) => String(item.id) === String(checkbox.dataset.id)
  );

  if (!task) return;

  const nextStatus = checkbox.checked ? "completed" : "pending";

  try {
    await apiRequest(
      `/api/tasks/${encodeURIComponent(task.id)}`,
      {
        method: "PUT",
        body: JSON.stringify({ status: nextStatus })
      }
    );

    await loadTasks();
    showMessage("Task status updated.");
  } catch (error) {
    checkbox.checked = !checkbox.checked;
    showMessage(error.message, "error");
  }
});

function setView(view) {
  state.view = view;

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.remove("active");
  });

  const navId = {
    all: "allNav",
    pending: "pendingNav",
    completed: "completedNav"
  }[view];

  $(navId).classList.add("active");
  renderTasks();
}

$("allNav").addEventListener("click", () => setView("all"));
$("pendingNav").addEventListener("click", () => setView("pending"));
$("completedNav").addEventListener("click", () => setView("completed"));

$("addTaskTop").addEventListener("click", openCreateDialog);
$("refreshBtn").addEventListener("click", () => loadTasks(true));

$("searchInput").addEventListener("input", (event) => {
  state.search = event.target.value;
  renderTasks();
});

$("statusFilter").addEventListener("change", renderTasks);
$("closeDialog").addEventListener("click", () => dialog.close());
$("cancelDialog").addEventListener("click", () => dialog.close());


checkHealth();
loadTasks();
