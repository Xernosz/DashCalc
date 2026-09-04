if (navigator.storage?.persist) {
    navigator.storage.persist().catch(() => { });
}

const inputs = {
    mpg: document.getElementById("mpg"),
    gasPrice: document.getElementById("gas-price"),
    homeState: document.getElementById("home-state"),
    typicalWait: document.getElementById("typical-wait"),
    avgSpeed: document.getElementById("avg-speed")
};


const gasMath = () => {
    const mpg = Number(inputs.mpg.value);
    const gasPrice = Number(inputs.gasPrice.value);
    const gasResult = document.getElementById("gas-cost-per-mile");

    if (inputs.mpg.value.trim() === "" || inputs.gasPrice.value.trim() === "" ||
        !Number.isFinite(mpg) || !Number.isFinite(gasPrice) || mpg <= 0 || gasPrice < 0) {
        gasResult.textContent = "—";
        return;
    }

    gasResult.textContent = "$" + (gasPrice / mpg).toFixed(3);
};


inputs.mpg.addEventListener("input", gasMath);
inputs.gasPrice.addEventListener("input", gasMath);


const SELF_EMPLOYMENT_TAX_RATE = 0.153;

const STATE_TAX_RATES = {
    AL: 0.0500, AK: 0.0000, AZ: 0.0250, AR: 0.0440, CA: 0.0930,
    CO: 0.0440, CT: 0.0499, DE: 0.0660, DC: 0.0850, FL: 0.0000,
    GA: 0.0539, HI: 0.0790, ID: 0.0580, IL: 0.0495, IN: 0.0305,
    IA: 0.0380, KS: 0.0570, KY: 0.0400, LA: 0.0425, ME: 0.0715,
    MD: 0.0575, MA: 0.0500, MI: 0.0425, MN: 0.0785, MS: 0.0470,
    MO: 0.0480, MT: 0.0590, NE: 0.0520, NV: 0.0000, NH: 0.0000,
    NJ: 0.0637, NM: 0.0590, NY: 0.0685, NC: 0.0450, ND: 0.0250,
    OH: 0.0350, OK: 0.0475, OR: 0.0990, PA: 0.0307, RI: 0.0599,
    SC: 0.0620, SD: 0.0000, TN: 0.0000, TX: 0.0000, UT: 0.0465,
    VT: 0.0660, VA: 0.0575, WA: 0.0000, WV: 0.0482, WI: 0.0765,
    WY: 0.0000
};

const MILEAGE_RATES = [
    { startDate: new Date(2026, 0, 1), centsPerMile: 72.5 },
    { startDate: new Date(2026, 6, 1), centsPerMile: 76 }
];

const getCentsPerMile = (today) => {
    let currentRate = MILEAGE_RATES[0];

    for (const rate of MILEAGE_RATES) {
        if (today >= rate.startDate) {
            currentRate = rate;
        }
    }

    return currentRate.centsPerMile;
};

const taxMath = () => {
    const rateDisplay = document.getElementById("irs-rate-display");
    const perDollarDisplay = document.getElementById("tax-per-dollar");

    const centsPerMile = getCentsPerMile(new Date());
    rateDisplay.textContent = centsPerMile + "¢/mi";

    const state = inputs.homeState.value;

    if (state === "" || !Object.hasOwn(STATE_TAX_RATES, state)) {
        perDollarDisplay.textContent = "—";
        return;
    }

    const stateRate = STATE_TAX_RATES[state];
    const totalRate = SELF_EMPLOYMENT_TAX_RATE + stateRate;

    perDollarDisplay.textContent = "$" + totalRate.toFixed(2);
};

const SETTINGS_STORAGE_KEY = "dashcalc-settings";

const loadSettings = () => {
    const savedJson = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (savedJson === null) return { v: 1 };

    try {
        return JSON.parse(savedJson);
    } catch {
        return { v: 1 };
    }
};

const onSave = () => {
    const settingsToSave = {
        v: 1,
        mpg: inputs.mpg.value,
        gasPrice: inputs.gasPrice.value,
        homeState: inputs.homeState.value,
        typicalWait: inputs.typicalWait.value,
        avgSpeed: inputs.avgSpeed.value
    };

    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsToSave));
    showSavedConfirmation();
};

const saveButton = document.getElementById("save-setup");
const saveStatus = document.getElementById("save-status");
const viewDataButton = document.getElementById("view-saved-data");

const showSavedConfirmation = () => {
    saveStatus.classList.remove("savebar__status--show");
    void saveStatus.offsetWidth;
    saveStatus.classList.add("savebar__status--show");

    viewDataButton.hidden = false;
    viewDataButton.classList.remove("savebar__viewdata--show");
    void viewDataButton.offsetWidth;
    viewDataButton.classList.add("savebar__viewdata--show");
};

const DATA_PANEL_FIELDS = ["v", "mpg", "gasPrice", "homeState", "typicalWait", "avgSpeed"];

const dataPanelOverlay = document.getElementById("datapanel-overlay");
const dataPanel = document.getElementById("datapanel");
const dataPanelBody = document.getElementById("datapanel-body");
const dataPanelClose = document.getElementById("datapanel-close");

const saveEditedField = (event) => {
    const savedData = loadSettings();

    const key = event.target.dataset.key;
    savedData[key] = event.target.textContent.trim();

    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(savedData));
};

const commitFieldOnEnter = (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        event.target.blur();
    }
};

const renderDataPanel = () => {
    const savedData = loadSettings();

    dataPanelBody.replaceChildren();

    DATA_PANEL_FIELDS.forEach((key) => {
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
        valueSpan.dataset.key = key;

        if (key === "v") {
            row.classList.add("datapanel__row--readonly");
        } else {
            valueSpan.contentEditable = "plaintext-only";
            valueSpan.addEventListener("blur", saveEditedField);
            valueSpan.addEventListener("keydown", commitFieldOnEnter);
        }

        row.append(keySpan, colonSpan, valueSpan);
        dataPanelBody.append(row);
    });
};

let closePanelTimeoutId = null;

const openDataPanel = () => {
    if (closePanelTimeoutId !== null) {
        window.clearTimeout(closePanelTimeoutId);
        closePanelTimeoutId = null;
    }

    renderDataPanel();
    dataPanelOverlay.hidden = false;
    void dataPanel.offsetWidth;
    dataPanelOverlay.classList.add("datapanel-overlay--open");
    dataPanel.classList.add("datapanel--open");
};

const closeDataPanel = () => {
    dataPanelOverlay.classList.remove("datapanel-overlay--open");
    dataPanel.classList.remove("datapanel--open");
    closePanelTimeoutId = window.setTimeout(() => {
        dataPanelOverlay.hidden = true;
        closePanelTimeoutId = null;
    }, 220);
};

viewDataButton.addEventListener("click", openDataPanel);
dataPanelClose.addEventListener("click", closeDataPanel);

dataPanelOverlay.addEventListener("click", (event) => {
    if (event.target === dataPanelOverlay) {
        closeDataPanel();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !dataPanelOverlay.hidden) {
        closeDataPanel();
    }
});

inputs.homeState.addEventListener("change", taxMath);
saveButton.addEventListener("click", onSave);

const applySavedSettings = () => {
    const saved = loadSettings();

    if (saved.mpg !== undefined) inputs.mpg.value = saved.mpg;
    if (saved.gasPrice !== undefined) inputs.gasPrice.value = saved.gasPrice;
    if (saved.homeState !== undefined) inputs.homeState.value = saved.homeState;
    if (saved.typicalWait !== undefined) inputs.typicalWait.value = saved.typicalWait;
    if (saved.avgSpeed !== undefined) inputs.avgSpeed.value = saved.avgSpeed;

    if (localStorage.getItem(SETTINGS_STORAGE_KEY) !== null) {
        viewDataButton.hidden = false;
    }
};

applySavedSettings();
gasMath();
taxMath();
