const inputs = {
    mpg: document.getElementById("mpg"),
    gasPrice: document.getElementById("gas-price"),
    homeState: document.getElementById("home-state"),
    typicalWait: document.getElementById("typical-wait"),
    avgSpeed: document.getElementById("avg-speed")
};

const setupForm = document.getElementById("setup-form");
const saveNote = document.getElementById("save-note");
const saveProblem = document.getElementById("save-problem");
const viewDataButton = document.getElementById("view-saved-data");

const gasCostReadout = document.getElementById("gas-cost-per-mile");
const irsRateReadout = document.getElementById("irs-rate-display");
const taxRateReadout = document.getElementById("tax-per-dollar");

const DATA_PANEL_FIELDS = ["v", "mpg", "gasPrice", "homeState", "typicalWait", "avgSpeed"];

const dataPanelOverlay = document.getElementById("datapanel-overlay");
const dataPanel = document.getElementById("datapanel");
const dataPanelBody = document.getElementById("datapanel-body");
const dataPanelClose = document.getElementById("datapanel-close");

const showGasCost = () => {
    const mpg = Number(inputs.mpg.value);
    const gasPrice = Number(inputs.gasPrice.value);

    if (inputs.mpg.value.trim() === "" || inputs.gasPrice.value.trim() === "" ||
        !Number.isFinite(mpg) || !Number.isFinite(gasPrice) || mpg <= 0 || gasPrice < 0) {
        gasCostReadout.textContent = "—";
        return;
    }

    gasCostReadout.textContent = "$" + (gasPrice / mpg).toFixed(3);
};

const showTaxRates = () => {
    irsRateReadout.textContent = irsCentsPerMileOn(new Date()) + "¢/mi";

    const state = inputs.homeState.value;
    if (!Object.hasOwn(STATE_TAX_RATES, state)) {
        taxRateReadout.textContent = "—";
        return;
    }

    taxRateReadout.textContent = "$" + (SELF_EMPLOYMENT_TAX_RATE + STATE_TAX_RATES[state]).toFixed(2);
};

const showSaveProblem = (problem) => {
    saveNote.hidden = problem !== "";
    saveProblem.hidden = problem === "";
    saveProblem.textContent = problem;
};

const autoSave = () => {
    const settingsToSave = loadSettings();
    settingsToSave.v = 1;

    for (const box of Object.values(inputs)) {
        if (box.checkValidity()) {
            settingsToSave[box.name] = box.value;
            box.closest(".field__control").classList.remove("field__control--bad");
        }
    }

    if (!saveSettings(settingsToSave)) {
        showSaveProblem("Couldn’t save on this phone. If you’re in private browsing, try a normal tab.");
        return;
    }

    viewDataButton.hidden = false;

    if (setupForm.querySelector(".field__control--bad") === null) {
        showSaveProblem("");
    } else {
        showSaveProblem("That red box didn’t save. Fix it and it will.");
    }
};

const markBadBox = (event) => {
    const box = event.target;

    if (!box.checkValidity()) {
        box.closest(".field__control").classList.add("field__control--bad");
    }

    autoSave();
};

const fillDataPanel = () => {
    const savedData = loadSettings();

    dataPanelBody.replaceChildren();

    for (const key of DATA_PANEL_FIELDS) {
        const row = document.createElement("div");
        row.className = "datapanel__row";

        const keySpan = document.createElement("span");
        keySpan.className = "datapanel__key";
        keySpan.textContent = "\"" + key + "\"";

        const colonSpan = document.createElement("span");
        colonSpan.className = "datapanel__colon";
        colonSpan.textContent = ":";

        const valueSpan = document.createElement("span");
        valueSpan.className = "datapanel__value";
        valueSpan.textContent = savedData[key] !== undefined ? savedData[key] : "";

        row.append(keySpan, colonSpan, valueSpan);
        dataPanelBody.append(row);
    }
};

const openDataPanel = () => {
    fillDataPanel();
    openSheet(dataPanelOverlay, dataPanel);
};

const closeDataPanel = () => {
    closeSheet(dataPanelOverlay, dataPanel, 220);
};

const fillSavedSettings = () => {
    const saved = loadSettings();

    for (const [name, box] of Object.entries(inputs)) {
        if (saved[name] !== undefined) box.value = saved[name];
    }

    viewDataButton.hidden = readStorage(SETTINGS_STORAGE_KEY) === null;
};

for (const box of Object.values(inputs)) {
    box.addEventListener("input", autoSave);
    box.addEventListener("change", markBadBox);
}

inputs.mpg.addEventListener("input", showGasCost);
inputs.gasPrice.addEventListener("input", showGasCost);
inputs.homeState.addEventListener("change", showTaxRates);

viewDataButton.addEventListener("click", openDataPanel);
dataPanelClose.addEventListener("click", closeDataPanel);

dataPanelOverlay.addEventListener("click", (event) => {
    if (event.target === dataPanelOverlay) closeDataPanel();
});

dataPanelOverlay.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeDataPanel();
});

fillSavedSettings();
showGasCost();
showTaxRates();
