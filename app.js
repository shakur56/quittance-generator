const STORAGE_KEY = "quittance_app_tenants_v1";
const SETTINGS_STORAGE_KEY = "quittance_app_settings_v1";

const state = {
  tenants: [],
  editingTenantId: null,
  currentJsonHandle: null,
  settings: {
    ownerName: "Votre Nom",
    ownerAddress: "Votre Adresse",
    signatureDataUrl: "",
  },
};

const monthNames = [
  "Janvier",
  "Fevrier",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Aout",
  "Septembre",
  "Octobre",
  "Novembre",
  "Decembre",
];

const el = {
  tenantForm: document.getElementById("tenant-form"),
  tenantId: document.getElementById("tenant-id"),
  tenantName: document.getElementById("tenant-name"),
  tenantAddress: document.getElementById("tenant-address"),
  tenantRent: document.getElementById("tenant-rent"),
  tenantCharges: document.getElementById("tenant-charges"),
  tenantSubmit: document.getElementById("btn-tenant-submit"),
  tenantCancel: document.getElementById("btn-tenant-cancel"),
  tenantTableBody: document.getElementById("tenant-table-body"),

  ownerName: document.getElementById("owner-name"),
  ownerAddress: document.getElementById("owner-address"),
  ownerSignatureFile: document.getElementById("owner-signature-file"),
  ownerSignaturePreview: document.getElementById("owner-signature-preview"),
  btnRemoveSignature: document.getElementById("btn-remove-signature"),

  btnOpenJson: document.getElementById("btn-open-json"),
  btnSaveJson: document.getElementById("btn-save-json"),
  btnSaveJsonHandle: document.getElementById("btn-save-json-handle"),
  jsonFileInput: document.getElementById("json-file-input"),
  btnGenerateAllCurrentMonth: document.getElementById(
    "btn-generate-all-current-month",
  ),
  generateTenantSelect: document.getElementById("generate-tenant-select"),
  btnGenerateOneCurrentMonth: document.getElementById(
    "btn-generate-one-current-month",
  ),
};

init();

function init() {
  wireEvents();
  loadSettingsFromLocalStorage();
  hydrateSettingsFields();
  loadTenantsFromLocalStorage();
  renderAll();
}

function wireEvents() {
  el.tenantForm.addEventListener("submit", onSubmitTenant);
  el.tenantCancel.addEventListener("click", resetTenantForm);

  el.btnGenerateAllCurrentMonth.addEventListener(
    "click",
    onGenerateAllCurrentMonth,
  );

  el.btnGenerateOneCurrentMonth.addEventListener(
    "click",
    onGenerateOneCurrentMonth,
  );

  el.ownerName.addEventListener("input", onSettingsInputChange);
  el.ownerAddress.addEventListener("input", onSettingsInputChange);
  el.ownerSignatureFile.addEventListener("change", onSignatureFileChange);
  el.btnRemoveSignature.addEventListener("click", onRemoveSignatureClick);

  el.btnOpenJson.addEventListener("click", onOpenJsonClick);
  el.btnSaveJson.addEventListener("click", downloadJsonFile);
  el.btnSaveJsonHandle.addEventListener("click", saveToOpenedJsonFile);
  el.jsonFileInput.addEventListener("change", onJsonFileInputChange);
}

function loadSettingsFromLocalStorage() {
  const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!raw) {
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    state.settings = {
      ownerName: String(parsed.ownerName || state.settings.ownerName).trim(),
      ownerAddress: String(
        parsed.ownerAddress || state.settings.ownerAddress,
      ).trim(),
      signatureDataUrl: isValidImageDataUrl(parsed.signatureDataUrl)
        ? parsed.signatureDataUrl
        : "",
    };
  } catch {
    // Keep defaults if local storage is invalid.
  }
}

function saveSettingsToLocalStorage() {
  localStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify(state.settings, null, 2),
  );
}

function hydrateSettingsFields() {
  el.ownerName.value = state.settings.ownerName;
  el.ownerAddress.value = state.settings.ownerAddress;
  renderSignaturePreview();
}

function onSettingsInputChange() {
  state.settings.ownerName = el.ownerName.value.trim() || "Votre Nom";
  state.settings.ownerAddress = el.ownerAddress.value.trim() || "Votre Adresse";
  saveSettingsToLocalStorage();
}

function onSignatureFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    alert("Veuillez choisir une image valide pour la signature.");
    el.ownerSignatureFile.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = String(reader.result || "");
    if (!isValidImageDataUrl(dataUrl)) {
      alert("Format de signature non supporte.");
      el.ownerSignatureFile.value = "";
      return;
    }

    state.settings.signatureDataUrl = dataUrl;
    saveSettingsToLocalStorage();
    renderSignaturePreview();
    el.ownerSignatureFile.value = "";
  };
  reader.readAsDataURL(file);
}

function onRemoveSignatureClick() {
  state.settings.signatureDataUrl = "";
  saveSettingsToLocalStorage();
  renderSignaturePreview();
  el.ownerSignatureFile.value = "";
}

function renderSignaturePreview() {
  if (!state.settings.signatureDataUrl) {
    el.ownerSignaturePreview.classList.add("hidden");
    el.ownerSignaturePreview.removeAttribute("src");
    return;
  }

  el.ownerSignaturePreview.src = state.settings.signatureDataUrl;
  el.ownerSignaturePreview.classList.remove("hidden");
}

function loadTenantsFromLocalStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    state.tenants = [];
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    state.tenants = normalizeTenants(parsed);
  } catch {
    state.tenants = [];
  }
}

function saveTenantsToLocalStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tenants, null, 2));
}

function normalizeTenants(data) {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .filter((t) => t && typeof t === "object")
    .map((t) => ({
      id: t.id || crypto.randomUUID(),
      name: String(t.name || "").trim(),
      address: String(t.address || "").trim(),
      rent: toNumber(t.rent),
      charges: toNumber(t.charges),
    }))
    .filter(
      (t) =>
        t.name &&
        t.address &&
        Number.isFinite(t.rent) &&
        Number.isFinite(t.charges),
    );
}

function renderAll() {
  renderTenantsTable();
  renderTenantSelect();
}

function renderTenantsTable() {
  el.tenantTableBody.innerHTML = "";

  if (state.tenants.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = '<td colspan="5">Aucun locataire.</td>';
    el.tenantTableBody.appendChild(tr);
    return;
  }

  state.tenants.forEach((tenant) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="Nom">${escapeHtml(tenant.name)}</td>
      <td data-label="Adresse">${escapeHtml(tenant.address)}</td>
      <td data-label="Loyer">${formatMoney(tenant.rent)} EUR</td>
      <td data-label="Charges">${formatMoney(tenant.charges)} EUR</td>
      <td class="actions" data-label="Actions">
        <button type="button" data-action="edit" data-id="${tenant.id}">Modifier</button>
        <button type="button" class="danger" data-action="delete" data-id="${tenant.id}">Supprimer</button>
      </td>
    `;
    el.tenantTableBody.appendChild(tr);
  });

  el.tenantTableBody
    .querySelectorAll("button[data-action='edit']")
    .forEach((btn) => {
      btn.addEventListener("click", () => startEditTenant(btn.dataset.id));
    });

  el.tenantTableBody
    .querySelectorAll("button[data-action='delete']")
    .forEach((btn) => {
      btn.addEventListener("click", () => deleteTenant(btn.dataset.id));
    });
}

function renderTenantSelect() {
  const previousId = el.generateTenantSelect.value;
  el.generateTenantSelect.innerHTML = "";

  if (state.tenants.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Aucun locataire";
    el.generateTenantSelect.appendChild(option);
    el.generateTenantSelect.disabled = true;
    el.btnGenerateOneCurrentMonth.disabled = true;
    return;
  }

  state.tenants.forEach((tenant) => {
    const option = document.createElement("option");
    option.value = tenant.id;
    option.textContent = tenant.name;
    el.generateTenantSelect.appendChild(option);
  });

  el.generateTenantSelect.disabled = false;
  el.btnGenerateOneCurrentMonth.disabled = false;

  if (state.tenants.some((tenant) => tenant.id === previousId)) {
    el.generateTenantSelect.value = previousId;
  }
}

function onSubmitTenant(event) {
  event.preventDefault();

  const payload = {
    id: el.tenantId.value || crypto.randomUUID(),
    name: el.tenantName.value.trim(),
    address: el.tenantAddress.value.trim(),
    rent: toNumber(el.tenantRent.value),
    charges: toNumber(el.tenantCharges.value),
  };

  if (
    !payload.name ||
    !payload.address ||
    !Number.isFinite(payload.rent) ||
    !Number.isFinite(payload.charges)
  ) {
    alert(
      "Veuillez remplir tous les champs locataire avec des valeurs valides.",
    );
    return;
  }

  if (state.editingTenantId) {
    const index = state.tenants.findIndex(
      (t) => t.id === state.editingTenantId,
    );
    if (index >= 0) {
      state.tenants[index] = payload;
    }
  } else {
    state.tenants.push(payload);
  }

  saveTenantsToLocalStorage();
  resetTenantForm();
  renderAll();
}

function startEditTenant(tenantId) {
  const tenant = state.tenants.find((t) => t.id === tenantId);
  if (!tenant) {
    return;
  }

  state.editingTenantId = tenant.id;
  el.tenantId.value = tenant.id;
  el.tenantName.value = tenant.name;
  el.tenantAddress.value = tenant.address;
  el.tenantRent.value = String(tenant.rent);
  el.tenantCharges.value = String(tenant.charges);
  el.tenantSubmit.textContent = "Mettre a jour";
}

function deleteTenant(tenantId) {
  const tenant = state.tenants.find((t) => t.id === tenantId);
  if (!tenant) {
    return;
  }

  const ok = window.confirm(`Supprimer ${tenant.name} ?`);
  if (!ok) {
    return;
  }

  state.tenants = state.tenants.filter((t) => t.id !== tenantId);
  saveTenantsToLocalStorage();

  if (state.editingTenantId === tenantId) {
    resetTenantForm();
  }

  renderAll();
}

function resetTenantForm() {
  state.editingTenantId = null;
  el.tenantForm.reset();
  el.tenantId.value = "";
  el.tenantCharges.value = "0";
  el.tenantSubmit.textContent = "Ajouter";
}

async function onOpenJsonClick() {
  if (!window.showOpenFilePicker) {
    el.jsonFileInput.click();
    return;
  }

  try {
    const [handle] = await window.showOpenFilePicker({
      multiple: false,
      types: [
        {
          description: "JSON Files",
          accept: { "application/json": [".json"] },
        },
      ],
    });

    const file = await handle.getFile();
    const text = await file.text();
    const parsed = JSON.parse(text);
    state.tenants = normalizeTenants(parsed);
    state.currentJsonHandle = handle;
    saveTenantsToLocalStorage();
    resetTenantForm();
    renderAll();
    alert("Fichier JSON charge.");
  } catch (error) {
    if (error && error.name === "AbortError") {
      return;
    }
    alert("Impossible de charger le JSON.");
  }
}

async function saveToOpenedJsonFile() {
  if (!state.currentJsonHandle) {
    alert("Aucun fichier ouvert. Utilisez d'abord 'Ouvrir un JSON'.");
    return;
  }

  try {
    const writable = await state.currentJsonHandle.createWritable();
    await writable.write(JSON.stringify(state.tenants, null, 2));
    await writable.close();
    alert("Fichier JSON enregistre.");
  } catch {
    alert("Impossible d'enregistrer dans le fichier ouvert.");
  }
}

function onJsonFileInputChange(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || "[]"));
      state.tenants = normalizeTenants(parsed);
      saveTenantsToLocalStorage();
      resetTenantForm();
      renderAll();
      alert("Fichier JSON charge.");
    } catch {
      alert("JSON invalide.");
    } finally {
      el.jsonFileInput.value = "";
    }
  };

  reader.readAsText(file);
}

function downloadJsonFile() {
  const blob = new Blob([JSON.stringify(state.tenants, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tenants.json";
  a.click();
  URL.revokeObjectURL(url);
}

function onGenerateAllCurrentMonth() {
  if (state.tenants.length === 0) {
    alert("Ajoutez au moins un locataire.");
    return;
  }

  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("La librairie PDF n'est pas chargee.");
    return;
  }

  onSettingsInputChange();

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const paymentDate = formatDateForInput(now);
  const ownerName = state.settings.ownerName;
  const ownerAddress = state.settings.ownerAddress;

  state.tenants.forEach((tenant, index) => {
    const amount = round2(tenant.rent + tenant.charges);
    const fileName = `quittance_${sanitizeFileName(tenant.name)}_${year}-${String(month).padStart(2, "0")}.pdf`;

    // Staggered save calls reduce chances of browser download throttling.
    window.setTimeout(() => {
      generateReceiptPdf({
        tenant,
        month,
        year,
        paymentDate,
        amount,
        ownerName,
        ownerAddress,
        fileName,
      });
    }, index * 180);
  });

  alert(`Generation lancee pour ${state.tenants.length} locataire(s).`);
}

function onGenerateOneCurrentMonth() {
  const tenant = state.tenants.find(
    (item) => item.id === el.generateTenantSelect.value,
  );

  if (!tenant) {
    alert("Selectionnez un locataire.");
    return;
  }

  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("La librairie PDF n'est pas chargee.");
    return;
  }

  onSettingsInputChange();

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  generateReceiptPdf({
    tenant,
    month,
    year,
    paymentDate: formatDateForInput(now),
    amount: round2(tenant.rent + tenant.charges),
    ownerName: state.settings.ownerName,
    ownerAddress: state.settings.ownerAddress,
    fileName: `quittance_${sanitizeFileName(tenant.name)}_${year}-${String(month).padStart(2, "0")}.pdf`,
  });
}

function generateReceiptPdf({
  tenant,
  month,
  year,
  paymentDate,
  amount,
  ownerName,
  ownerAddress,
  fileName,
}) {
  const { startDate, endDate } = getMonthDateRange(year, month);
  const totalRent = round2(tenant.rent + tenant.charges);
  const gap = round2(amount - totalRent);
  const receiptNumber = buildReceiptNumber({ tenant, year, month });
  const issueDate = formatDateFr(new Date());
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  doc.setTextColor(31, 41, 55);
  doc.setDrawColor(70, 77, 87);
  doc.setLineWidth(0.6);
  doc.rect(10, 10, 190, 277);

  doc.setLineWidth(0.2);
  doc.line(14, 28, 196, 28);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("QUITTANCE DE LOYER", 14, 21);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(`Periode: ${monthNames[month - 1]} ${year}`, 14, 26);

  doc.setFontSize(10);
  doc.text(`Quittance n°: ${receiptNumber}`, 196, 17, { align: "right" });
  doc.text(`Date d'emission: ${issueDate}`, 196, 23, { align: "right" });

  doc.setDrawColor(160, 170, 182);
  doc.setLineWidth(0.25);
  doc.roundedRect(14, 34, 88, 54, 1.8, 1.8);
  doc.roundedRect(108, 34, 88, 54, 1.8, 1.8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.text("Bailleur", 18, 42);
  doc.text("Locataire", 112, 42);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Bailleur: ${ownerName}`, 18, 56, { maxWidth: 80 });
  doc.text(`Adresse: ${ownerAddress}`, 18, 64, { maxWidth: 80 });
  doc.text(`Locataire: ${tenant.name}`, 112, 56, { maxWidth: 80 });
  doc.text(`Adresse: ${tenant.address}`, 112, 64, { maxWidth: 80 });

  doc.setDrawColor(180, 188, 198);
  doc.roundedRect(14, 94, 182, 34, 1.8, 1.8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.text("Objet", 18, 102);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Paiement du loyer et des charges pour la periode du ${startDate} au ${endDate}.`,
    18,
    111,
    { maxWidth: 174 },
  );
 // doc.text(`Date de paiement recue: ${formatDateFr(paymentDate)}`, 18, 121);

  doc.setDrawColor(160, 170, 182);
  doc.roundedRect(14, 134, 182, 64, 1.8, 1.8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.text("Detail des sommes", 18, 142);

  doc.setLineWidth(0.2);
  doc.line(18, 147, 192, 147);
  doc.setFontSize(10);
  doc.text("Libelle", 18, 153);
  doc.text("Montant (EUR)", 192, 153, { align: "right" });
  doc.line(18, 156, 192, 156);

  doc.setFont("helvetica", "normal");
  doc.text("Loyer hors charges", 18, 163);
  doc.text(formatMoney(tenant.rent), 192, 163, { align: "right" });
  doc.text("Charges", 18, 170);
  doc.text(formatMoney(tenant.charges), 192, 170, { align: "right" });
  doc.line(18, 174, 192, 174);

  doc.setFont("helvetica", "bold");
  doc.text("Total attendu", 18, 180);
  doc.text(formatMoney(totalRent), 192, 180, { align: "right" });
  doc.text("Total regle", 18, 187);
  doc.text(formatMoney(amount), 192, 187, { align: "right" });

  const gapLabel = gap === 0 ? "Solde" : gap > 0 ? "Trop-percu" : "Reste du";
  doc.setFont("helvetica", "normal");
  doc.text(gapLabel, 18, 194);
  doc.text(formatMoney(Math.abs(gap)), 192, 194, { align: "right" });

  doc.setDrawColor(160, 170, 182);
  doc.roundedRect(14, 204, 112, 48, 1.8, 1.8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    "Le bailleur reconnait avoir recu la somme indiquee ci-dessus au titre du loyer et des charges.",
    18,
    214,
    { maxWidth: 104 },
  );
  doc.text(
    "Cette quittance annule tout recu precedent pour la periode consideree.",
    18,
    230,
    {
      maxWidth: 104,
    },
  );

  doc.setDrawColor(160, 170, 182);
  doc.roundedRect(132, 204, 64, 48, 1.8, 1.8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text("Pour acquit", 164, 210, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(ownerName, 164, 248, { align: "center" });
  addSignatureToPdf(doc, 136, 210, 56, 26);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(86, 93, 104);
  doc.text(
    "Document genere automatiquement - conforme a l'article 21 de la loi ndeg 89-462 du 6 juillet 1989.",
    105,
    278,
    { align: "center" },
  );

  doc.save(fileName);
}

function buildReceiptNumber({ tenant, year, month }) {
  const tenantKey =
    sanitizeFileName(tenant.name).replaceAll("-", "").slice(0, 6) || "tenant";
  return `${year}${String(month).padStart(2, "0")}-${tenantKey.toUpperCase()}`;
}

function addSignatureToPdf(doc, x, y, maxWidth, maxHeight) {
  const signatureDataUrl = state.settings.signatureDataUrl;
  if (!signatureDataUrl) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(120, 126, 134);
    doc.text("(Aucune image de signature)", x + 2, y + 9);
    doc.setTextColor(31, 41, 55);
    return;
  }

  const imageFormat = getImageFormatFromDataUrl(signatureDataUrl);
  if (!imageFormat) {
    return;
  }

  try {
    const imageProps = doc.getImageProperties(signatureDataUrl);
    const scale = Math.min(
      maxWidth / imageProps.width,
      maxHeight / imageProps.height,
      1,
    );
    const renderWidth = imageProps.width * scale;
    const renderHeight = imageProps.height * scale;
    const renderX = x + (maxWidth - renderWidth) / 2;
    const renderY = y + (maxHeight - renderHeight) / 2;

    doc.addImage(
      signatureDataUrl,
      imageFormat,
      renderX,
      renderY,
      renderWidth,
      renderHeight,
    );
  } catch {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(120, 126, 134);
    doc.text("(Signature non exploitable)", x + 2, y + 9);
    doc.setTextColor(31, 41, 55);
  }
}

function getImageFormatFromDataUrl(dataUrl) {
  if (dataUrl.startsWith("data:image/png")) {
    return "PNG";
  }
  if (dataUrl.startsWith("data:image/jpeg")) {
    return "JPEG";
  }
  if (dataUrl.startsWith("data:image/webp")) {
    return "WEBP";
  }
  return "";
}

function isValidImageDataUrl(value) {
  if (typeof value !== "string") {
    return false;
  }
  return (
    value.startsWith("data:image/png") ||
    value.startsWith("data:image/jpeg") ||
    value.startsWith("data:image/webp")
  );
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? round2(n) : NaN;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function formatMoney(value) {
  return Number(value).toFixed(2);
}

function formatDateForInput(dateValue) {
  const d = new Date(dateValue);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateFr(dateValue) {
  const d = new Date(dateValue);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function getMonthDateRange(year, month) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  return {
    startDate: formatDateFr(start),
    endDate: formatDateFr(end),
    monthName: monthNames[month - 1],
  };
}

function sanitizeFileName(value) {
  return String(value || "locataire")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

