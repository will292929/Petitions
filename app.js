const STORAGE_KEY = "petition-workstation-v2";
const MAX_RESULTS = 25;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"]);

const mappingFields = [
  ["firstName", "First name"],
  ["middleName", "Middle name"],
  ["lastName", "Last name"],
  ["houseNumber", "House number"],
  ["street", "Street / address"],
  ["city", "City / town"],
  ["zip", "Zip"],
  ["voterIdDoc", "VoterID Doc"],
  ["rncVoterId", "RNC voter ID"],
];

const defaultAppendColumns = [
  { name: "PetitionStatus", value: "petitionStatus" },
  { name: "LoggedBy", value: "loggedBy" },
  { name: "CollectedBy", value: "collectedBy" },
  { name: "SheetImage", value: "sheet" },
  { name: "SheetLine", value: "line" },
  { name: "EntryNotes", value: "notes" },
];

const defaultLayoutSettings = {
  imageWidth: 62,
  matchHeight: 360,
  savedHeight: 220,
  entryLayout: "compact",
  entryWidth: 520,
  entryColumns: 4,
};

const state = loadState();
let imageFiles = [];
let currentImageIndex = 0;
let currentImageUrl = "";
let votersRaw = [];
let voters = [];
let votersByCity = new Map();
let imageView = { scale: state.imageSettings?.scale || 1, rotation: state.imageSettings?.rotation || 0, x: 0, y: 0 };
let dragging = null;
let matchRenderTimer = 0;

const el = {
  workTab: document.querySelector("#workTab"),
  settingsTab: document.querySelector("#settingsTab"),
  workView: document.querySelector("#workView"),
  settingsView: document.querySelector("#settingsView"),
  chooseImageFolderBtn: document.querySelector("#chooseImageFolderBtn"),
  settingsImageFolderBtn: document.querySelector("#settingsImageFolderBtn"),
  prevImageBtn: document.querySelector("#prevImageBtn"),
  nextImageBtn: document.querySelector("#nextImageBtn"),
  rotateLeftBtn: document.querySelector("#rotateLeftBtn"),
  rotateRightBtn: document.querySelector("#rotateRightBtn"),
  zoomOutBtn: document.querySelector("#zoomOutBtn"),
  zoomInBtn: document.querySelector("#zoomInBtn"),
  fitBtn: document.querySelector("#fitBtn"),
  imageCounter: document.querySelector("#imageCounter"),
  currentImageName: document.querySelector("#currentImageName"),
  imageStage: document.querySelector("#imageStage"),
  sheetImage: document.querySelector("#sheetImage"),
  imageEmpty: document.querySelector("#imageEmpty"),
  entryForm: document.querySelector("#entryForm"),
  saveEntryBtn: document.querySelector("#saveEntryBtn"),
  matchList: document.querySelector("#matchList"),
  resultCount: document.querySelector("#resultCount"),
  entryList: document.querySelector("#entryList"),
  exportLinksBtn: document.querySelector("#exportLinksBtn"),
  voterFileInput: document.querySelector("#voterFileInput"),
  clearVoterFileBtn: document.querySelector("#clearVoterFileBtn"),
  driveImageFolderInput: document.querySelector("#driveImageFolderInput"),
  driveVoterFileInput: document.querySelector("#driveVoterFileInput"),
  googleApiKeyInput: document.querySelector("#googleApiKeyInput"),
  loadDriveImagesBtn: document.querySelector("#loadDriveImagesBtn"),
  loadDriveVotersBtn: document.querySelector("#loadDriveVotersBtn"),
  defaultCityInput: document.querySelector("#defaultCityInput"),
  loggedByInput: document.querySelector("#loggedByInput"),
  collectedByInput: document.querySelector("#collectedByInput"),
  imageFolderLabel: document.querySelector("#imageFolderLabel"),
  voterFileLabel: document.querySelector("#voterFileLabel"),
  voterMemoryLabel: document.querySelector("#voterMemoryLabel"),
  appendColumnGrid: document.querySelector("#appendColumnGrid"),
  imageWidthInput: document.querySelector("#imageWidthInput"),
  matchHeightInput: document.querySelector("#matchHeightInput"),
  savedHeightInput: document.querySelector("#savedHeightInput"),
  entryLayoutInput: document.querySelector("#entryLayoutInput"),
  entryWidthInput: document.querySelector("#entryWidthInput"),
  entryColumnsInput: document.querySelector("#entryColumnsInput"),
  mappingGrid: document.querySelector("#mappingGrid"),
  autoMapBtn: document.querySelector("#autoMapBtn"),
  directorySummary: document.querySelector("#directorySummary"),
  directoryPreview: document.querySelector("#directoryPreview"),
  matchTemplate: document.querySelector("#matchTemplate"),
  entryTemplate: document.querySelector("#entryTemplate"),
};

el.defaultCityInput.value = state.defaultCity;
el.loggedByInput.value = state.loggedBy;
el.collectedByInput.value = state.collectedBy;
el.driveImageFolderInput.value = state.driveImageFolder || "";
el.driveVoterFileInput.value = state.driveVoterFile || "";
el.googleApiKeyInput.value = state.googleApiKey || "";
el.imageWidthInput.value = state.layout.imageWidth;
el.matchHeightInput.value = state.layout.matchHeight;
el.savedHeightInput.value = state.layout.savedHeight;
el.entryLayoutInput.value = state.layout.entryLayout;
el.entryWidthInput.value = state.layout.entryWidth;
el.entryColumnsInput.value = state.layout.entryColumns;
el.entryForm.elements.city.value = state.defaultCity;

el.workTab.addEventListener("click", () => setView("work"));
el.settingsTab.addEventListener("click", () => setView("settings"));
el.chooseImageFolderBtn.addEventListener("click", chooseImageFolder);
el.settingsImageFolderBtn.addEventListener("click", chooseImageFolder);
el.prevImageBtn.addEventListener("click", () => moveImage(-1));
el.nextImageBtn.addEventListener("click", () => moveImage(1));
el.rotateLeftBtn.addEventListener("click", () => rotateImage(-90));
el.rotateRightBtn.addEventListener("click", () => rotateImage(90));
el.zoomOutBtn.addEventListener("click", () => zoomImage(0.85));
el.zoomInBtn.addEventListener("click", () => zoomImage(1.18));
el.fitBtn.addEventListener("click", fitImage);
el.saveEntryBtn.addEventListener("click", saveEntry);
el.exportLinksBtn.addEventListener("click", exportEntries);
el.voterFileInput.addEventListener("change", importVoterFile);
el.clearVoterFileBtn.addEventListener("click", clearVoterDirectory);
el.loadDriveImagesBtn.addEventListener("click", loadDriveImages);
el.loadDriveVotersBtn.addEventListener("click", loadDriveVoters);
el.driveImageFolderInput.addEventListener("input", () => {
  state.driveImageFolder = el.driveImageFolderInput.value.trim();
  saveState();
});
el.driveVoterFileInput.addEventListener("input", () => {
  state.driveVoterFile = el.driveVoterFileInput.value.trim();
  saveState();
});
el.googleApiKeyInput.addEventListener("input", () => {
  state.googleApiKey = el.googleApiKeyInput.value.trim();
  saveState();
});
el.defaultCityInput.addEventListener("input", () => {
  state.defaultCity = el.defaultCityInput.value.trim();
  if (!el.entryForm.elements.city.value.trim()) el.entryForm.elements.city.value = state.defaultCity;
  saveState();
  scheduleRenderMatches();
});
el.loggedByInput.addEventListener("input", () => {
  state.loggedBy = el.loggedByInput.value.trim();
  saveState();
});
el.collectedByInput.addEventListener("input", () => {
  state.collectedBy = el.collectedByInput.value.trim();
  saveState();
});
el.imageWidthInput.addEventListener("input", () => updateLayoutSetting("imageWidth", Number(el.imageWidthInput.value)));
el.matchHeightInput.addEventListener("input", () => updateLayoutSetting("matchHeight", Number(el.matchHeightInput.value)));
el.savedHeightInput.addEventListener("input", () => updateLayoutSetting("savedHeight", Number(el.savedHeightInput.value)));
el.entryLayoutInput.addEventListener("change", () => updateLayoutSetting("entryLayout", el.entryLayoutInput.value));
el.entryWidthInput.addEventListener("input", () => updateLayoutSetting("entryWidth", Number(el.entryWidthInput.value)));
el.entryColumnsInput.addEventListener("input", () => updateLayoutSetting("entryColumns", Number(el.entryColumnsInput.value)));
el.autoMapBtn.addEventListener("click", () => {
  autoMapColumns();
  rebuildVoters();
  saveState();
  renderSettings();
  scheduleRenderMatches();
});

el.entryForm.addEventListener("input", scheduleRenderMatches);
el.imageStage.addEventListener("pointerdown", startPan);
el.imageStage.addEventListener("pointermove", movePan);
el.imageStage.addEventListener("pointerup", stopPan);
el.imageStage.addEventListener("pointercancel", stopPan);
el.imageStage.addEventListener("wheel", handleWheel, { passive: false });

renderMappingControls();
renderAppendColumnControls();
rebuildVoters();
renderAll();

function loadState() {
  const fallback = {
    defaultCity: "",
    loggedBy: "",
    collectedBy: "",
    imageFolderName: "",
    voterFileName: "",
    driveImageFolder: "",
    driveVoterFile: "",
    googleApiKey: "",
    imageSettings: { scale: 1, rotation: 0 },
    layout: defaultLayoutSettings,
    appendColumns: defaultAppendColumns,
    columns: [],
    columnMap: {},
    voterRows: [],
    entries: [],
  };

  try {
    const loaded = { ...fallback, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) };
    if (loaded.columnMap.voterId && !loaded.columnMap.rncVoterId) {
      loaded.columnMap.rncVoterId = loaded.columnMap.voterId;
    }
    loaded.entries = loaded.entries.map((entry) => ({
      ...entry,
      petitionStatus: entry.petitionStatus || "Signed",
      linkStatus: entry.linkStatus || entry.status || "unlinked",
      linkedRncVoterId: entry.linkedRncVoterId || entry.linkedVoterId || "",
      linkedVoterIdDoc: entry.linkedVoterIdDoc || "",
    }));
    loaded.appendColumns = normalizeAppendColumns(loaded.appendColumns);
    loaded.imageSettings = { scale: 1, rotation: 0, ...loaded.imageSettings };
    loaded.layout = { ...defaultLayoutSettings, ...loaded.layout };
    loaded.voterRows = [];
    return loaded;
  } catch {
    return fallback;
  }
}

function normalizeAppendColumns(columns) {
  const source = Array.isArray(columns) && columns.length ? columns : defaultAppendColumns;
  return Array.from({ length: 6 }, (_, index) => ({
    name: source[index]?.name || "",
    value: source[index]?.value || defaultAppendColumns[index]?.value || "notes",
  }));
}

function saveState() {
  const persisted = {
    ...state,
    voterRows: [],
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
}

function renderAll() {
  applyLayoutSettings();
  renderImage();
  renderSettings();
  renderMatches();
  renderEntries();
}

function updateLayoutSetting(key, value) {
  state.layout[key] = value;
  saveState();
  applyLayoutSettings();
}

function applyLayoutSettings() {
  document.documentElement.style.setProperty("--image-pane-width", `${state.layout.imageWidth}%`);
  document.documentElement.style.setProperty("--match-panel-height", `${state.layout.matchHeight}px`);
  document.documentElement.style.setProperty("--saved-panel-height", `${state.layout.savedHeight}px`);
  document.documentElement.style.setProperty("--entry-panel-width", `${state.layout.entryWidth}px`);
  document.documentElement.style.setProperty("--entry-grid-columns", state.layout.entryColumns);
  el.workView.classList.toggle("compact-entry", state.layout.entryLayout === "compact");
}

function setView(view) {
  const isWork = view === "work";
  el.workView.classList.toggle("active", isWork);
  el.settingsView.classList.toggle("active", !isWork);
  el.workTab.classList.toggle("active", isWork);
  el.settingsTab.classList.toggle("active", !isWork);
}

async function chooseImageFolder() {
  if (!window.showDirectoryPicker) {
    alert("This browser does not support folder selection. Use Chrome or Edge for the image folder workflow.");
    return;
  }

  const directoryHandle = await window.showDirectoryPicker();
  const files = [];

  for await (const [, handle] of directoryHandle.entries()) {
    if (handle.kind !== "file") continue;
    const file = await handle.getFile();
    if (IMAGE_TYPES.has(file.type) || /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name)) {
      files.push(file);
    }
  }

  imageFiles = files.sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }));
  currentImageIndex = 0;
  state.imageFolderName = directoryHandle.name;
  imageView = { scale: state.imageSettings.scale, rotation: state.imageSettings.rotation, x: 0, y: 0 };
  saveState();
  renderImage();
  renderSettings();
  setView("work");
}

async function loadDriveImages() {
  const folderId = driveIdFromInput(el.driveImageFolderInput.value, "folder");
  if (!folderId) {
    alert("Paste a Google Drive folder link or folder ID first.");
    return;
  }

  try {
    state.driveImageFolder = el.driveImageFolderInput.value.trim();
    state.imageFolderName = `Drive folder ${folderId}`;
    saveState();
    const files = await listPublicDriveFolderImages(folderId);
    if (!files.length) {
      alert("No publicly accessible images were found in that Drive folder. Make sure the folder or images are shared with link access.");
      return;
    }
    imageFiles = files;
    currentImageIndex = 0;
    imageView = { scale: state.imageSettings.scale, rotation: state.imageSettings.rotation, x: 0, y: 0 };
    renderImage();
    renderSettings();
    setView("work");
  } catch (error) {
    console.error(error);
    alert("Could not load Drive images. For this version, the folder/images need link access or public access.");
  }
}

function moveImage(delta) {
  if (!imageFiles.length) return;
  currentImageIndex = Math.max(0, Math.min(imageFiles.length - 1, currentImageIndex + delta));
  imageView = { scale: state.imageSettings.scale, rotation: state.imageSettings.rotation, x: 0, y: 0 };
  renderImage();
}

function renderImage() {
  if (currentImageUrl.startsWith("blob:")) URL.revokeObjectURL(currentImageUrl);

  if (!imageFiles.length) {
    el.sheetImage.style.display = "none";
    el.imageEmpty.style.display = "grid";
    el.imageCounter.textContent = "No images loaded";
    el.currentImageName.textContent = "";
    el.entryForm.elements.sheet.value = "";
    return;
  }

  const file = imageFiles[currentImageIndex];
  currentImageUrl = file.url || URL.createObjectURL(file);
  el.sheetImage.src = currentImageUrl;
  el.sheetImage.style.display = "block";
  el.imageEmpty.style.display = "none";
  el.imageCounter.textContent = `${currentImageIndex + 1} of ${imageFiles.length}`;
  el.currentImageName.textContent = file.name;
  el.entryForm.elements.sheet.value = file.name;
  applyImageTransform();
}

function applyImageTransform() {
  el.sheetImage.style.transform = `translate(calc(-50% + ${imageView.x}px), calc(-50% + ${imageView.y}px)) rotate(${imageView.rotation}deg) scale(${imageView.scale})`;
}

function rotateImage(degrees) {
  imageView.rotation = (imageView.rotation + degrees) % 360;
  state.imageSettings.rotation = imageView.rotation;
  saveState();
  applyImageTransform();
}

function zoomImage(multiplier) {
  imageView.scale = clamp(imageView.scale * multiplier, 0.2, 6);
  state.imageSettings.scale = imageView.scale;
  saveState();
  applyImageTransform();
}

function fitImage() {
  imageView = { scale: 1, rotation: 0, x: 0, y: 0 };
  state.imageSettings.scale = 1;
  state.imageSettings.rotation = 0;
  saveState();
  applyImageTransform();
}

function startPan(event) {
  if (!imageFiles.length) return;
  el.imageStage.setPointerCapture(event.pointerId);
  el.imageStage.classList.add("dragging");
  dragging = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, imageX: imageView.x, imageY: imageView.y };
}

function movePan(event) {
  if (!dragging || dragging.pointerId !== event.pointerId) return;
  imageView.x = dragging.imageX + event.clientX - dragging.startX;
  imageView.y = dragging.imageY + event.clientY - dragging.startY;
  applyImageTransform();
}

function stopPan(event) {
  if (!dragging || dragging.pointerId !== event.pointerId) return;
  dragging = null;
  el.imageStage.classList.remove("dragging");
}

function handleWheel(event) {
  if (!imageFiles.length) return;
  event.preventDefault();
  zoomImage(event.deltaY > 0 ? 0.92 : 1.08);
}

async function importVoterFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.name.toLowerCase().endsWith(".csv")) {
    alert("Excel selection is noted, but this local build currently imports CSV. I can add true Excel parsing next.");
    event.target.value = "";
    return;
  }

  try {
    el.voterMemoryLabel.textContent = `Importing ${file.name}...`;
    const rows = parseCsv(await file.text());
    loadVoterRows(rows, file.name);
  } catch (error) {
    console.error(error);
    alert("The voter file could not be imported. If this is Excel, export it as CSV first. If it is a huge CSV, we may need to move the directory into a database/index.");
  } finally {
    event.target.value = "";
  }
}

async function loadDriveVoters() {
  const fileId = driveIdFromInput(el.driveVoterFileInput.value, "file");
  if (!fileId) {
    alert("Paste a Google Drive CSV file link or file ID first.");
    return;
  }

  try {
    state.driveVoterFile = el.driveVoterFileInput.value.trim();
    state.voterFileName = `Drive CSV ${fileId}`;
    el.voterMemoryLabel.textContent = "Importing Drive CSV...";
    const response = await fetch(driveDownloadUrl(fileId));
    if (!response.ok) throw new Error(`Drive CSV request failed: ${response.status}`);
    const rows = parseCsv(await response.text());
    loadVoterRows(rows, state.voterFileName);
  } catch (error) {
    console.error(error);
    alert("Could not load the Drive CSV. Make sure it is a CSV file and shared so this browser can download it.");
  }
}

function loadVoterRows(rows, filename) {
  state.voterRows = rows;
  state.columns = Object.keys(rows[0] || {});
  state.voterFileName = filename;
  autoMapColumns();
  rebuildVoters();
  saveState();
  renderSettings();
  scheduleRenderMatches();
}

async function listPublicDriveFolderImages(folderId) {
  if (!state.googleApiKey) {
    throw new Error("A Google API key is required to list a Drive folder without OAuth.");
  }

  const params = new URLSearchParams({
    key: state.googleApiKey,
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id,name,mimeType)",
    orderBy: "name",
    pageSize: "1000",
  });
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`);
  if (!response.ok) throw new Error(`Drive folder request failed: ${response.status}`);
  const data = await response.json();
  return (data.files || [])
    .filter((file) => file.mimeType?.startsWith("image/"))
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }))
    .map((file) => ({
      name: file.name,
      type: file.mimeType,
      url: driveDownloadUrl(file.id),
    }));
}

function driveDownloadUrl(fileId) {
  if (state.googleApiKey) {
    const params = new URLSearchParams({ alt: "media", key: state.googleApiKey });
    return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?${params}`;
  }
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
}

function driveIdFromInput(value, kind) {
  const text = value.trim();
  if (!text) return "";
  const patterns = kind === "folder"
    ? [/\/folders\/([a-zA-Z0-9_-]+)/, /[?&]id=([a-zA-Z0-9_-]+)/]
    : [/\/d\/([a-zA-Z0-9_-]+)/, /[?&]id=([a-zA-Z0-9_-]+)/, /\/file\/d\/([a-zA-Z0-9_-]+)/];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return /^[a-zA-Z0-9_-]{20,}$/.test(text) ? text : "";
}

function clearVoterDirectory() {
  state.voterRows = [];
  state.columns = [];
  state.columnMap = {};
  state.voterFileName = "";
  votersRaw = [];
  voters = [];
  votersByCity = new Map();
  saveState();
  renderSettings();
  renderMatches();
}

function renderMappingControls() {
  el.mappingGrid.innerHTML = "";
  mappingFields.forEach(([key, label]) => {
    const field = document.createElement("label");
    const select = document.createElement("select");
    select.name = key;
    select.addEventListener("change", () => {
      state.columnMap[key] = select.value;
      rebuildVoters();
      saveState();
      renderSettings();
      renderMatches();
    });
    field.append(label, select);
    el.mappingGrid.append(field);
  });
}

function renderAppendColumnControls() {
  el.appendColumnGrid.innerHTML = "";
  const valueOptions = [
    ["petitionStatus", "Signature status"],
    ["loggedBy", "Logged by"],
    ["collectedBy", "Collected by"],
    ["sheet", "Sheet image"],
    ["line", "Line number"],
    ["notes", "Notes"],
    ["typedName", "Typed signer name"],
    ["typedAddress", "Typed signer address"],
    ["linkedName", "Linked voter name"],
    ["linkedAddress", "Linked voter address"],
  ];

  state.appendColumns.forEach((column, index) => {
    const nameLabel = document.createElement("label");
    const nameInput = document.createElement("input");
    nameInput.value = column.name;
    nameInput.placeholder = `Column ${index + 1}`;
    nameInput.addEventListener("input", () => {
      state.appendColumns[index].name = nameInput.value.trim();
      saveState();
    });
    nameLabel.append(`Column ${index + 1} name`, nameInput);

    const valueLabel = document.createElement("label");
    const valueSelect = document.createElement("select");
    valueSelect.innerHTML = valueOptions.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
    valueSelect.value = column.value;
    valueSelect.addEventListener("change", () => {
      state.appendColumns[index].value = valueSelect.value;
      saveState();
    });
    valueLabel.append("Saved value", valueSelect);

    el.appendColumnGrid.append(nameLabel, valueLabel);
  });
}

function renderSettings() {
  el.imageFolderLabel.textContent = state.imageFolderName || "Not selected";
  el.voterFileLabel.textContent = state.voterFileName || "Not selected";
  el.voterMemoryLabel.textContent = state.voterRows.length
    ? `${state.voterRows.length.toLocaleString()} rows loaded for this browser session.`
    : "No voter directory loaded in this browser session.";
  el.mappingGrid.querySelectorAll("select").forEach((select) => {
    select.innerHTML = `<option value="">Not mapped</option>${state.columns.map((column) => `<option value="${escapeHtml(column)}">${escapeHtml(column)}</option>`).join("")}`;
    select.value = state.columnMap[select.name] || "";
  });

  el.directorySummary.textContent = state.voterRows.length
    ? `${state.voterRows.length.toLocaleString()} voter rows loaded. ${voters.length.toLocaleString()} searchable records built.`
    : "No voter directory loaded.";

  renderDirectoryPreview();
}

function renderDirectoryPreview() {
  const columns = state.columns.slice(0, 8);
  const rows = state.voterRows.slice(0, 8);
  if (!rows.length) {
    el.directoryPreview.innerHTML = "";
    return;
  }

  el.directoryPreview.innerHTML = `
    <table class="preview-table">
      <thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead>
      <tbody>
        ${rows
          .map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(row[column])}</td>`).join("")}</tr>`)
          .join("")}
      </tbody>
    </table>
  `;
}

function autoMapColumns() {
  const candidates = {
    firstName: ["first", "firstname", "first_name", "givenname", "given"],
    middleName: ["middle", "middlename", "middleinitial", "mi"],
    lastName: ["last", "lastname", "last_name", "surname"],
    houseNumber: ["housenumber", "house", "streetnumber", "number", "addrnum"],
    street: ["street", "address", "streetaddress", "residentialaddress", "addrstreet"],
    city: ["city", "town", "municipality"],
    zip: ["zip", "zipcode", "postalcode"],
    voterIdDoc: ["voteriddoc", "voterid_doc", "voterdoc", "docid", "documentid", "id"],
    rncVoterId: ["rncvoterid", "rnc_voter_id", "rncid", "voterid", "voter_id", "stateid"],
  };

  mappingFields.forEach(([key]) => {
    const match = state.columns.find((column) => candidates[key].includes(normalizeKey(column)));
    if (match) state.columnMap[key] = match;
  });
}

function rebuildVoters() {
  votersRaw = state.voterRows;
  voters = votersRaw
    .map((row, index) => {
      const voter = {
        rowIndex: index,
        firstName: mappedValue(row, "firstName"),
        middleName: mappedValue(row, "middleName"),
        lastName: mappedValue(row, "lastName"),
        houseNumber: mappedValue(row, "houseNumber"),
        street: mappedValue(row, "street"),
        city: mappedValue(row, "city") || state.defaultCity,
        zip: mappedValue(row, "zip"),
        voterIdDoc: mappedValue(row, "voterIdDoc"),
        rncVoterId: mappedValue(row, "rncVoterId"),
        raw: row,
      };
      voter.searchText = normalizeText(
        [voter.firstName, voter.middleName, voter.lastName, voter.houseNumber, voter.street, voter.city, voter.zip, voter.voterIdDoc, voter.rncVoterId].join(" ")
      );
      return voter;
    })
    .filter((voter) => voter.firstName || voter.lastName || voter.street || voter.houseNumber);
  votersByCity = voters.reduce((groups, voter) => {
    const city = normalizeText(voter.city || state.defaultCity);
    if (!city) return groups;
    if (!groups.has(city)) groups.set(city, []);
    groups.get(city).push(voter);
    return groups;
  }, new Map());
}

function mappedValue(row, key) {
  const column = state.columnMap[key];
  return column ? String(row[column] || "").trim() : "";
}

function renderMatches() {
  const entry = currentEntry();
  const searchPool = voterPoolForEntry(entry);
  const matches = findMatches(entry, searchPool.voters);
  const linkedIds = linkedVoterIds();
  el.resultCount.textContent = `${matches.length} result${matches.length === 1 ? "" : "s"} from ${searchPool.label}`;
  el.matchList.innerHTML = "";

  if (!state.voterRows.length) {
    el.matchList.innerHTML = `<div class="empty-state">Load the voter directory in Settings.</div>`;
    return;
  }

  if (!matches.length) {
    el.matchList.innerHTML = `<div class="empty-state">No matches in ${escapeHtml(searchPool.label)} after the city, house number, street, and last-name filters.</div>`;
    return;
  }

  matches.forEach(({ voter, score }) => {
    const isLinked = linkedIds.has(voterIdentity(voter));
    const card = el.matchTemplate.content.firstElementChild.cloneNode(true);
    card.classList.toggle("already-linked", isLinked);
    card.querySelector("h3").textContent = displayName(voter);
    card.querySelector(".match-address").textContent = displayAddress(voter);
    card.querySelector(".match-meta").textContent = [
      voter.city,
      voter.zip,
      voter.voterIdDoc && `Doc ${voter.voterIdDoc}`,
      voter.rncVoterId && `RNC ${voter.rncVoterId}`,
    ]
      .filter(Boolean)
      .join(" | ");
    card.querySelector(".match-score").textContent = `${score}%`;
    card.querySelector(".link-match").textContent = isLinked ? "Linked" : "Link";
    card.querySelector(".link-match").addEventListener("click", () => saveEntry(voter));
    el.matchList.append(card);
  });
}

function linkedVoterIds() {
  return new Set(
    state.entries
      .filter((entry) => entry.linkStatus === "linked")
      .map((entry) => entry.linkedRncVoterId || entry.linkedVoterIdDoc || voterRowIdentity(entry.voterRow))
      .filter(Boolean)
  );
}

function scheduleRenderMatches() {
  clearTimeout(matchRenderTimer);
  matchRenderTimer = setTimeout(renderMatches, 120);
}

function voterPoolForEntry(entry) {
  const city = normalizeText(entry.city || state.defaultCity);
  if (city) {
    const cityVoters = votersByCity.get(city) || [];
    return {
      voters: cityVoters,
      label: `${entry.city || state.defaultCity} (${cityVoters.length.toLocaleString()} voters)`,
    };
  }
  return {
    voters,
    label: `all cities (${voters.length.toLocaleString()} voters)`,
  };
}

function findMatches(entry, voterPool) {
  const hasSearch = [entry.firstName, entry.middleName, entry.lastName, entry.houseNumber, entry.street].some(Boolean);
  const filteredPool = hardFilteredVoters(entry, voterPool);
  if (!hasSearch) return filteredPool.slice(0, MAX_RESULTS).map((voter) => ({ voter, score: 1 }));

  return filteredPool
    .map((voter) => ({ voter, score: matchScore(entry, voter) }))
    .filter((match) => match.score > 0)
    .sort((left, right) => right.score - left.score || displayName(left.voter).localeCompare(displayName(right.voter)))
    .slice(0, MAX_RESULTS);
}

function hardFilteredVoters(entry, voterPool) {
  const house = normalizeText(entry.houseNumber);
  const street = normalizeAddress(entry.street);
  const last = normalizeText(entry.lastName);

  return voterPool.filter((voter) => {
    if (house && normalizeText(voter.houseNumber) !== house) return false;
    if (street && !normalizeAddress(voter.street).includes(street)) return false;
    if (last && last.length >= 3 && !normalizeText(voter.lastName).startsWith(last)) return false;
    return true;
  });
}

function matchScore(entry, voter) {
  let score = 0;
  const first = normalizeText(entry.firstName);
  const middle = normalizeText(entry.middleName);
  const last = normalizeText(entry.lastName);
  const house = normalizeText(entry.houseNumber);
  const street = normalizeAddress(entry.street);
  const city = normalizeText(entry.city || state.defaultCity);
  const voterFirst = normalizeText(voter.firstName);
  const voterMiddle = normalizeText(voter.middleName);
  const voterLast = normalizeText(voter.lastName);
  const voterHouse = normalizeText(voter.houseNumber);
  const voterStreet = normalizeAddress(voter.street);
  const voterCity = normalizeText(voter.city);

  if (last && voterLast === last) score += 34;
  else if (last && voterLast.startsWith(last)) score += 22;
  else if (last && voter.searchText.includes(last)) score += 10;

  if (first && voterFirst === first) score += 26;
  else if (first && voterFirst.startsWith(first)) score += 18;
  else if (first && voterFirst.startsWith(first[0])) score += 6;

  if (middle && voterMiddle.startsWith(middle)) score += 6;
  if (house && voterHouse === house) score += 16;
  if (street && voterStreet === street) score += 16;
  else if (street && voterStreet.includes(street)) score += 10;
  if (city && voterCity === city) score += 8;

  return Math.min(score, 100);
}

function saveEntry(linkedVoter = null) {
  const entry = currentEntry();
  if (!entry.firstName && !entry.lastName && !entry.houseNumber && !entry.street && !linkedVoter) return;

  const saved = {
    id: crypto.randomUUID(),
    ...entry,
    loggedBy: state.loggedBy,
    collectedBy: state.collectedBy,
    voterRow: linkedVoter?.raw || {},
    linkedVoterIdDoc: linkedVoter?.voterIdDoc || "",
    linkedRncVoterId: linkedVoter?.rncVoterId || "",
    linkedName: linkedVoter ? displayName(linkedVoter) : "",
    linkedAddress: linkedVoter ? displayAddress(linkedVoter) : "",
    linkStatus: linkedVoter ? "linked" : "unlinked",
  };

  state.entries.unshift(saved);
  saveState();
  clearEntryAfterSave();
  renderEntries();
  renderMatches();
}

function currentEntry() {
  const form = el.entryForm.elements;
  return {
    sheet: form.sheet.value.trim(),
    line: form.line.value.trim(),
    firstName: form.firstName.value.trim(),
    middleName: form.middleName.value.trim(),
    lastName: form.lastName.value.trim(),
    houseNumber: form.houseNumber.value.trim(),
    street: form.street.value.trim(),
    city: form.city.value.trim() || state.defaultCity,
    petitionStatus: form.petitionStatus.value || "Signed",
    notes: form.notes.value.trim(),
  };
}

function clearEntryAfterSave() {
  const form = el.entryForm.elements;
  const nextLine = Number(form.line.value) ? String(Number(form.line.value) + 1) : "";
  form.line.value = nextLine;
}

function renderEntries() {
  el.entryList.innerHTML = "";
  if (!state.entries.length) {
    el.entryList.innerHTML = `<div class="empty-state">Saved links will appear here.</div>`;
    return;
  }

  state.entries.slice(0, 60).forEach((entry) => {
    const row = el.entryTemplate.content.firstElementChild.cloneNode(true);
    row.classList.toggle("linked", entry.linkStatus === "linked");
    row.querySelector(".entry-name").textContent = `${[entry.firstName, entry.middleName, entry.lastName].filter(Boolean).join(" ")} -> ${entry.linkedName || "No link"}`;
    row.querySelector(".entry-meta").textContent = [entry.sheet, entry.line && `line ${entry.line}`, displayEntryAddress(entry), entry.petitionStatus || "Signed", entry.linkStatus].filter(Boolean).join(" | ");
    row.querySelector(".load-entry").addEventListener("click", () => loadEntry(entry));
    row.querySelector(".unlink-entry").disabled = entry.linkStatus !== "linked";
    row.querySelector(".unlink-entry").addEventListener("click", () => unlinkEntry(entry.id));
    row.querySelector(".delete-entry").addEventListener("click", () => deleteEntry(entry.id));
    el.entryList.append(row);
  });
}

function unlinkEntry(entryId) {
  const entry = state.entries.find((savedEntry) => savedEntry.id === entryId);
  if (!entry) return;
  entry.voterRow = {};
  entry.linkedVoterIdDoc = "";
  entry.linkedRncVoterId = "";
  entry.linkedName = "";
  entry.linkedAddress = "";
  entry.linkStatus = "unlinked";
  saveState();
  renderEntries();
  renderMatches();
}

function deleteEntry(entryId) {
  state.entries = state.entries.filter((savedEntry) => savedEntry.id !== entryId);
  saveState();
  renderEntries();
  renderMatches();
}

function loadEntry(entry) {
  Object.entries(entry).forEach(([key, value]) => {
    if (el.entryForm.elements[key]) el.entryForm.elements[key].value = value;
  });
  renderMatches();
}

function exportEntries() {
  const rows = state.entries
    .filter((entry) => entry.linkStatus === "linked")
    .map((entry) => ({
      ...(entry.voterRow || {}),
      ...appendedExportValues(entry),
    }));
  download("petition-linked-entries.csv", toCsv(rows));
}

function appendedExportValues(entry) {
  return Object.fromEntries(
    state.appendColumns
      .filter((column) => column.name.trim())
      .map((column) => [column.name.trim(), valueForAppendColumn(entry, column.value)])
  );
}

function valueForAppendColumn(entry, value) {
  const values = {
    petitionStatus: entry.petitionStatus || "Signed",
    loggedBy: entry.loggedBy || state.loggedBy,
    collectedBy: entry.collectedBy || state.collectedBy,
    sheet: entry.sheet,
    line: entry.line,
    notes: entry.notes,
    typedName: [entry.firstName, entry.middleName, entry.lastName].filter(Boolean).join(" "),
    typedAddress: displayEntryAddress(entry),
    linkedName: entry.linkedName,
    linkedAddress: entry.linkedAddress,
  };
  return values[value] || "";
}

function voterIdentity(voter) {
  return voter.rncVoterId || voter.voterIdDoc || voterRowIdentity(voter.raw);
}

function voterRowIdentity(row = {}) {
  return normalizeText(Object.values(row).join("|"));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field);
  rows.push(row);

  const headers = rows.shift()?.map((header) => header.trim()) || [];
  return rows
    .filter((cells) => cells.some((cell) => cell.trim()))
    .map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""])));
}

function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  return [headers.join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))].join("\n");
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function download(filename, content) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function displayName(person) {
  return [person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ") || "Unnamed";
}

function displayAddress(person) {
  return [person.houseNumber, person.street].filter(Boolean).join(" ") || "No address";
}

function displayEntryAddress(entry) {
  return [entry.houseNumber, entry.street, entry.city].filter(Boolean).join(" ");
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeKey(value) {
  return normalizeText(value).replace(/[^a-z0-9]/g, "");
}

function normalizeAddress(value) {
  return normalizeText(value)
    .replace(/\b(street|st)\b/g, "st")
    .replace(/\b(avenue|ave)\b/g, "ave")
    .replace(/\b(road|rd)\b/g, "rd")
    .replace(/\b(drive|dr)\b/g, "dr")
    .replace(/\b(lane|ln)\b/g, "ln")
    .replace(/\b(court|ct)\b/g, "ct")
    .replace(/[^\w\s]/g, "");
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
