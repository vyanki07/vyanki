const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const toast = (message) => {
  const element = $(".toast");
  element.textContent = message;
  element.classList.add("visible");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => element.classList.remove("visible"), 2800);
};

const savedIntersections = JSON.parse(localStorage.getItem("signalflow-intersections") || "null");
const intersections = savedIntersections || [
  { name: "Riverside Ave & 8th St", status: "Operational", wait: "42 sec", vehicles: "1,248" },
  { name: "Market St & 5th Ave", status: "Operational", wait: "36 sec", vehicles: "1,086" },
  { name: "Central Blvd & Pine St", status: "Attention", wait: "78 sec", vehicles: "1,504" },
  { name: "Oak St & 3rd Ave", status: "Operational", wait: "39 sec", vehicles: "972" },
  { name: "7th St & Main Ave", status: "Critical", wait: "—", vehicles: "846" },
  { name: "Hill Rd & 12th St", status: "Operational", wait: "45 sec", vehicles: "1,111" },
];
const alerts = [
  { title: "Signal malfunction", location: "7th St & Main Ave", time: "4 min ago", severity: "Critical" },
  { title: "Heavy congestion", location: "Central Blvd & Pine St", time: "18 min ago", severity: "Medium" },
  { title: "Maintenance due", location: "Oak St & 3rd Ave", time: "42 min ago", severity: "Low" },
];

const signalRadiusKm = 3;
const ambulanceDistanceKm = 2.4;
const suggestionPanel = $("#priority-suggestion");
const suggestionButton = $("#suggest-green-btn");
const suggestionKey = "signalflow-priority-suggestion-dismissed";

function evaluateAmbulanceProximity(distanceKm) {
  if (distanceKm <= signalRadiusKm && localStorage.getItem(suggestionKey) !== "true") {
    $("#nearby-distance").textContent = `${distanceKm.toFixed(1)} km`;
    suggestionPanel.hidden = false;
    return true;
  }
  suggestionPanel.hidden = true;
  return false;
}

evaluateAmbulanceProximity(ambulanceDistanceKm);

suggestionButton?.addEventListener("click", () => {
  suggestionButton.textContent = "Green phase suggested";
  suggestionButton.disabled = true;
  suggestionButton.classList.add("accepted");
  $("#priority-btn").focus();
  toast("Operator suggestion created: review before activating green wave");
});

$$(".control-action").forEach((button) => {
  button.addEventListener("click", () => {
    const row = button.closest(".control-row");
    const signalName = row.dataset.signal;
    const actionLabels = {
      "green-wave": "Green wave requested",
      "hold-phase": "Current phase held for 10 seconds",
      "normal-cycle": "Normal cycle restored",
      "acknowledge-fault": "Controller fault acknowledged",
    };
    button.classList.add("completed");
    button.textContent = actionLabels[button.classList[1]] || "Action applied";
    toast(`${actionLabels[button.classList[1]]} — ${signalName}`);
    if (button.classList.contains("normal-cycle")) {
      row.querySelector(".control-name p").innerHTML = "Normal cycle <span>•</span> Automatic mode";
      row.classList.remove("priority-active");
    } else if (button.classList.contains("green-wave")) {
      row.querySelector(".control-name p").innerHTML = "Priority corridor <span>•</span> Green wave active";
      row.classList.add("priority-active");
    }
  });
});

$("#dismiss-suggestion")?.addEventListener("click", () => {
  localStorage.setItem(suggestionKey, "true");
  suggestionPanel.hidden = true;
  toast("Proximity suggestion dismissed");
});

let priorityActive = false;
$("#priority-btn")?.addEventListener("click", (event) => {
  priorityActive = !priorityActive;
  event.currentTarget.classList.toggle("active", priorityActive);
  event.currentTarget.textContent = priorityActive ? "Green wave active" : "Activate green wave";
  $(".emergency-live").textContent = priorityActive ? "● GREEN WAVE ACTIVE" : "● PRIORITY READY";
  $(".emergency-live").style.color = priorityActive ? "#2fbf89" : "";
  toast(priorityActive ? "Priority corridor activated for Ambulance A-104" : "Priority corridor deactivated");
});

$("#dispatch-btn")?.addEventListener("click", (event) => {
  event.currentTarget.textContent = "Ambulance dispatched";
  event.currentTarget.disabled = true;
  toast("Ambulance A-104 dispatch recorded");
});

function saveIntersections() {
  localStorage.setItem("signalflow-intersections", JSON.stringify(intersections));
}

function openDetails(intersection) {
  const modal = $(".modal-backdrop");
  $("#modal-title").textContent = intersection.name;
  $(".modal-status").textContent = intersection.status;
  $(".modal-status").className = `modal-status ${intersection.status.toLowerCase()}`;
  const values = $$(".details-grid strong");
  values[1].textContent = intersection.status === "Critical" ? "Flashing red" : "North / South";
  values[2].textContent = intersection.wait;
  values[3].textContent = intersection.vehicles;
  modal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeDetails() {
  $(".modal-backdrop").hidden = true;
  document.body.classList.remove("modal-open");
}

const pinNames = $$(".pin");
pinNames.forEach((pin, index) => {
  pin.addEventListener("click", () => {
    $$(".pin").forEach((item) => item.classList.remove("selected"));
    pin.classList.add("selected");
    openDetails(intersections[index]);
  });
});

$$(".modal-close").forEach((button) => button.addEventListener("click", closeDetails));
$(".modal-backdrop").addEventListener("click", (event) => {
  if (event.target === event.currentTarget) closeDetails();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeDetails();
});

const selector = $(".intersection-select");
selector?.addEventListener("click", () => {
  const current = intersections.findIndex((item) => item.name === selector.firstChild.textContent.trim());
  const next = intersections[(current + 1) % intersections.length];
  selector.firstChild.textContent = next.name;
  $(".signal-panel p").textContent = next.name;
  $(".cycle-time strong").innerHTML = next.status === "Critical" ? "—" : `${next.wait.split(" ")[0]}<span>s</span>`;
  toast(`Now viewing ${next.name}`);
});

$$(".alert-row").forEach((row, index) => {
  const action = document.createElement("button");
  action.className = "alert-action";
  action.textContent = "Acknowledge";
  action.addEventListener("click", () => {
    row.classList.add("resolved");
    action.textContent = "Acknowledged";
    action.disabled = true;
    const count = $(".alert-count");
    count.textContent = String(Math.max(0, Number(count.textContent) - 1));
    toast(`${alerts[index].title} acknowledged`);
  });
  row.append(action);
});

$(".date-button")?.addEventListener("click", () => {
  const today = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(new Date());
  $(".eyebrow").firstChild.textContent = `${today.toUpperCase()} `;
  toast("Dashboard data refreshed");
});

$(".period-btn")?.addEventListener("click", (event) => {
  const periods = ["Last 24 hours", "Last 7 days", "Last 30 days"];
  const current = periods.indexOf(event.currentTarget.textContent.split(" ")[0] === "Last" ? event.currentTarget.textContent.replace(" ⌄", "") : "");
  event.currentTarget.textContent = `${periods[(current + 1) % periods.length]} ⌄`;
  toast(`Showing ${event.currentTarget.textContent.replace(" ⌄", "")}`);
});

$$(".nav-item").forEach((item) => item.addEventListener("click", () => {
  $$(".nav-item").forEach((link) => link.classList.remove("active"));
  item.classList.add("active");
}));

let remaining = 18;
setInterval(() => {
  const clock = $(".cycle-time strong");
  if (!clock || clock.textContent.includes("—")) return;
  remaining = remaining > 1 ? remaining - 1 : 18;
  clock.innerHTML = `${remaining}<span>s</span>`;
}, 1000);

saveIntersections();
