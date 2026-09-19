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


const taxMath = () => {
    const rateDisplay = document.getElementById("irs-rate-display");
    const perDollarDisplay = document.getElementById("tax-per-dollar");

    const centsPerMile = irsCentsPerMileOn(new Date());
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

const SEEN_WELCOME_KEY = "dashcalc-seen-welcome";

const setupForm = document.getElementById("setup-form");
const saveNote = document.getElementById("save-note");
const saveProblem = document.getElementById("save-problem");
const viewDataButton = document.getElementById("view-saved-data");
const welcomeOkButton = document.getElementById("welcome-ok");
const welcomeOverlay = document.getElementById("welcome-overlay");

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

    if (!writeStorage(SETTINGS_STORAGE_KEY, JSON.stringify(settingsToSave))) {
        showSaveProblem("Couldn't save on this phone.");
        return;
    }

    viewDataButton.hidden = false;
    viewDataButton.classList.add("savebar__viewdata--show");

    if (setupForm.querySelector(".field__control--bad") === null) {
        showSaveProblem("");
    } else {
        showSaveProblem("Not saved. Fix the red box.");
    }
};

const markBadBox = (event) => {
    const box = event.target;

    if (!box.checkValidity()) {
        box.closest(".field__control").classList.add("field__control--bad");
    }

    autoSave();
};

const onUserChangedSaved = () => {
    for (const box of Object.values(inputs)) {
        box.addEventListener("input", autoSave);
        box.addEventListener("change", markBadBox);
    }
};

const DATA_PANEL_FIELDS = ["v", "mpg", "gasPrice", "homeState", "typicalWait", "avgSpeed"];

const dataPanelOverlay = document.getElementById("datapanel-overlay");
const dataPanel = document.getElementById("datapanel");
const dataPanelBody = document.getElementById("datapanel-body");
const dataPanelClose = document.getElementById("datapanel-close");

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
    dataPanelOverlay.showModal();
    void dataPanel.offsetWidth;
    dataPanelOverlay.classList.add("datapanel-overlay--open");
    dataPanel.classList.add("datapanel--open");
};

const closeDataPanel = () => {
    if (closePanelTimeoutId !== null) {
        window.clearTimeout(closePanelTimeoutId);
    }

    dataPanelOverlay.classList.remove("datapanel-overlay--open");
    dataPanel.classList.remove("datapanel--open");
    closePanelTimeoutId = window.setTimeout(() => {
        dataPanelOverlay.close();
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

dataPanelOverlay.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeDataPanel();
});

const dismissWelcome = () => {
    welcomeOverlay.close();
};

const rememberWelcomeWasSeen = () => {
    writeStorage(SEEN_WELCOME_KEY, "1");
};

inputs.homeState.addEventListener("change", taxMath);
welcomeOkButton.addEventListener("click", dismissWelcome);
welcomeOverlay.addEventListener("close", rememberWelcomeWasSeen);

const applySavedSettings = () => {
    const saved = loadSettings();

    if (saved.mpg !== undefined) inputs.mpg.value = saved.mpg;
    if (saved.gasPrice !== undefined) inputs.gasPrice.value = saved.gasPrice;
    if (saved.homeState !== undefined) inputs.homeState.value = saved.homeState;
    if (saved.typicalWait !== undefined) inputs.typicalWait.value = saved.typicalWait;
    if (saved.avgSpeed !== undefined) inputs.avgSpeed.value = saved.avgSpeed;
    if (readStorage(SEEN_WELCOME_KEY) === null) welcomeOverlay.showModal();
    if (readStorage(SETTINGS_STORAGE_KEY) !== null) {
        viewDataButton.hidden = false;
        viewDataButton.classList.add("savebar__viewdata--show");
    }
};

onUserChangedSaved();
applySavedSettings();
gasMath();
taxMath();
