const sumTook = document.getElementById("sum-took");
const sumPassed = document.getElementById("sum-passed");
const sumKept = document.getElementById("sum-kept");
const sumMiles = document.getElementById("sum-miles");
const sumHourly = document.getElementById("sum-hourly");
const sumPerMile = document.getElementById("sum-permile");

const entryCount = document.getElementById("entry-count");
const nothingLoggedCard = document.getElementById("entry-blank");
const entryList = document.getElementById("entry-list");

const undoBar = document.getElementById("undo-bar");
const undoButton = document.getElementById("undo-btn");

const DAY_FORMAT = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const TIME_FORMAT = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

const moneyOrDash = (amount) => {
    return Number.isFinite(amount) ? money(amount) : "—";
};

const milesOrDash = (miles) => {
    return Number.isFinite(miles) ? miles + " mi" : "— mi";
};

const perMileOf = (offer) => {
    if (Number.isFinite(offer.perMile)) return offer.perMile;
    return offer.keep / offer.miles;
};

const whenItHappened = (isoDate) => {
    const moment = new Date(isoDate);
    if (Number.isNaN(moment.getTime())) return "";
    return DAY_FORMAT.format(moment) + " at " + TIME_FORMAT.format(moment);
};

const spanWith = (className, text) => {
    const span = document.createElement("span");
    span.className = className;
    span.textContent = text;
    return span;
};

const parseEditedNumber = (text) => {
    return Number(text.replace("$", "").replace("mi", "").trim());
};

const commitFieldOnEnter = (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        event.target.blur();
    }
};

const saveEditedField = (event) => {
    const entry = event.target.closest(".entry");
    const field = event.target.dataset.field;
    const value = parseEditedNumber(event.target.textContent);
    const shownText = event.target.dataset.shown;

    if (value === parseEditedNumber(shownText)) {
        event.target.textContent = shownText;
        return;
    }

    if (Number.isFinite(value) && value > 0) {
        updateOfferField(entry.dataset.id, field, value);
    }

    const offers = activeOffers();
    const offer = offers.find((offer) => offer.id === entry.dataset.id);

    showTotals(offers);
    if (offer !== undefined) entry.replaceWith(buildEntry(offer));
};

const editableSpan = (className, text, field, label) => {
    const span = spanWith(className, text);
    span.contentEditable = "plaintext-only";
    span.inputMode = "decimal";
    span.enterKeyHint = "done";
    span.dataset.field = field;
    span.dataset.shown = text;
    span.setAttribute("role", "textbox");
    span.setAttribute("aria-label", label);
    span.addEventListener("blur", saveEditedField);
    span.addEventListener("keydown", commitFieldOnEnter);
    return span;
};

const buildEntry = (offer) => {
    const payValue = editableSpan("entry__pay", moneyOrDash(offer.pay), "pay", "Pay");
    const milesValue = editableSpan("entry__miles", milesOrDash(offer.miles), "miles", "Miles");

    const topLine = document.createElement("div");
    topLine.className = "entry__top";
    topLine.append(payValue, milesValue);

    const rateLine = document.createElement("div");
    rateLine.className = "entry__rates";
    rateLine.append(
        spanWith("entry__rate", moneyOrDash(offer.hourly) + " an hour"),
        spanWith("entry__rate", moneyOrDash(perMileOf(offer)) + " a mile")
    );

    const stamp = document.createElement("time");
    stamp.dateTime = offer.at;
    stamp.textContent = whenItHappened(offer.at);

    const metaLine = document.createElement("div");
    metaLine.className = "entry__meta";
    metaLine.append(spanWith("entry__tag " + (offer.took ? "entry__tag--took" : "entry__tag--passed"),
        offer.took ? "Took" : "Passed"));
    if (offer.farTrip) metaLine.append(spanWith("entry__tag entry__tag--far", "Far trip"));
    metaLine.append(stamp);

    const details = document.createElement("div");
    details.className = "entry__main";
    details.append(topLine, rateLine, metaLine);

    const deleteButton = document.createElement("button");
    deleteButton.className = "entry__del";
    deleteButton.type = "button";
    deleteButton.dataset.id = offer.id;
    deleteButton.setAttribute("aria-label", "Delete this dash");
    deleteButton.textContent = "×";

    const entry = document.createElement("article");
    entry.className = "entry";
    entry.dataset.grade = offer.grade;
    entry.dataset.id = offer.id;
    entry.append(spanWith("entry__grade", offer.grade === "S" ? "★" : offer.grade), details, deleteButton);

    return entry;
};

const showTotals = (offers) => {
    const totals = summarizeOffers(offers);

    sumTook.textContent = totals.took;
    sumPassed.textContent = totals.passed;
    sumKept.textContent = totals.took > 0 ? money(totals.kept) : "—";
    sumMiles.textContent = totals.took > 0 ? totals.miles.toFixed(1) : "—";
    sumHourly.textContent = totals.hourly === null ? "—" : money(totals.hourly);
    sumPerMile.textContent = totals.perMile === null ? "—" : money(totals.perMile);
    sumHourly.dataset.grade = hourlyGrade(totals.hourly, totals.perMile);
    sumPerMile.dataset.grade = perMileGrade(totals.hourly, totals.perMile);

    entryCount.textContent = offers.length === 1 ? "1 dash" : offers.length + " dashes";
    nothingLoggedCard.hidden = offers.length > 0;
};

const showLedger = () => {
    const newestFirst = activeOffers().slice().reverse();

    showTotals(newestFirst);
    entryList.replaceChildren();
    newestFirst.forEach((offer) => {
        entryList.append(buildEntry(offer));
    });
};

const UNDO_WINDOW_MS = 8000;
let undoTimeoutId = null;
let idPendingUndo = null;

const hideUndoBar = () => {
    if (undoTimeoutId !== null) {
        window.clearTimeout(undoTimeoutId);
        undoTimeoutId = null;
    }

    idPendingUndo = null;
    undoBar.hidden = true;
};

const showUndoBar = (id) => {
    if (undoTimeoutId !== null) window.clearTimeout(undoTimeoutId);

    idPendingUndo = id;
    undoBar.hidden = false;
    undoTimeoutId = window.setTimeout(hideUndoBar, UNDO_WINDOW_MS);
};

entryList.addEventListener("click", (event) => {
    const deleteButton = event.target.closest(".entry__del");
    if (deleteButton === null) return;

    deleteOffer(deleteButton.dataset.id);
    showLedger();
    showUndoBar(deleteButton.dataset.id);
});

undoButton.addEventListener("click", () => {
    if (idPendingUndo === null) return;

    restoreOffer(idPendingUndo);
    showLedger();
    hideUndoBar();
});

const backupOpen = document.getElementById("backup-open");
const backupOverlay = document.getElementById("backup-overlay");
const backup = document.getElementById("backup");
const backupClose = document.getElementById("backup-close");
const restoreStatus = document.getElementById("restore-status");
const backupJsonButton = document.getElementById("backup-json");
const backupCsvButton = document.getElementById("backup-csv");
const restoreInput = document.getElementById("restore-input");

let backupTimeoutId = null;

const openBackupPanel = () => {
    if (backupTimeoutId !== null) {
        window.clearTimeout(backupTimeoutId);
        backupTimeoutId = null;
    }

    restoreStatus.textContent = "";
    restoreStatus.classList.remove("backup__status--good", "backup__status--bad");
    backupOverlay.showModal();
    void backup.offsetWidth;
    backupOverlay.classList.add("backup-overlay--open");
    backup.classList.add("backup--open");
};

const closeBackupPanel = () => {
    if (backupTimeoutId !== null) {
        window.clearTimeout(backupTimeoutId);
    }

    backupOverlay.classList.remove("backup-overlay--open");
    backup.classList.remove("backup--open");
    backupTimeoutId = window.setTimeout(() => {
        backupOverlay.close();
        backupTimeoutId = null;
    }, 220);
};

backupOpen.addEventListener("click", openBackupPanel);
backupClose.addEventListener("click", closeBackupPanel);
backupOverlay.addEventListener("click", (event) => {
    if (event.target === backupOverlay) {
        closeBackupPanel();
    }
});

backupOverlay.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeBackupPanel();
});

const downloadFile = (fileName, text, type) => {
    const blob = new Blob([text], { type: type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    window.setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 1000);
};

const makeBackupJson = () => {
    const backupObject = { v: 1, savedAt: new Date().toISOString(), settings: loadSettings(), offers: activeOffers() };
    const newBackup = JSON.stringify(backupObject, null, 2);
    return newBackup;
};

const dateForFileName = () => {
    return new Date().toISOString().slice(0, 10);
};

backupJsonButton.addEventListener("click", () => {
    const backupFileName = `dashcalc-logs-${dateForFileName()}.json`;
    const backupText = makeBackupJson();
    downloadFile(backupFileName, backupText, "application/json");
});

const CSV_HEADER = [
    "date", "time", "took or passed", "pay", "miles", "far trip",
    "miles driven", "minutes", "$ an hour", "$ a mile", "grade"
];

const twoDigits = (number) => {
    return String(number).padStart(2, "0");
};

const numberOrEmpty = (value, places) => {
    return Number.isFinite(value) ? value.toFixed(places) : "";
};

const csvRowFor = (offer) => {
    const moment = new Date(offer.at);
    const validMoment = !Number.isNaN(moment.getTime());
    const date = validMoment
        ? `${moment.getFullYear()}-${twoDigits(moment.getMonth() + 1)}-${twoDigits(moment.getDate())}`
        : "";
    const time = validMoment
        ? `${twoDigits(moment.getHours())}:${twoDigits(moment.getMinutes())}`
        : "";
    const driven = Number.isFinite(offer.miles) ? milesDriven(offer.miles, offer.farTrip) : null;

    return [
        date,
        time,
        offer.took ? "took" : "passed",
        numberOrEmpty(offer.pay, 2),
        numberOrEmpty(offer.miles, 2),
        offer.farTrip ? "yes" : "no",
        numberOrEmpty(driven, 2),
        numberOrEmpty(offer.minutes, 1),
        numberOrEmpty(offer.hourly, 2),
        numberOrEmpty(perMileOf(offer), 2),
        offer.grade ?? ""
    ];
};

const makeBackupCsv = () => {
    const rows = [CSV_HEADER, ...activeOffers().map(csvRowFor)];
    return rows.map((row) => row.join(",")).join("\n");
};

backupCsvButton.addEventListener("click", () => {
    const csvFileName = `dashcalc-journal-${dateForFileName()}.csv`;
    downloadFile(csvFileName, makeBackupCsv(), "text/csv");
});

const showRestoreMessage = (text, isGood) => {
    restoreStatus.textContent = text;
    restoreStatus.classList.remove("backup__status--good", "backup__status--bad");
    if (isGood) {
        restoreStatus.classList.add("backup__status--good");
    } else restoreStatus.classList.add("backup__status--bad");
};

const NOT_A_BACKUP_MESSAGE = "That file isn't a DashCalc backup.";

const isObject = (value) => {
    return typeof value === "object" && value !== null;
};

const isUsableOffer = (offer) => {
    return isObject(offer) &&
        typeof offer.id === "string" &&
        typeof offer.at === "string" && !Number.isNaN(new Date(offer.at).getTime()) &&
        Number.isFinite(offer.pay) && offer.pay > 0 &&
        Number.isFinite(offer.miles) && offer.miles > 0;
};

const restoreSettingsIfNeeded = (fileSettings) => {
    if (carIsSetUp(loadSettings())) return false;
    if (!isObject(fileSettings) || !carIsSetUp(fileSettings)) return false;

    return writeStorage(SETTINGS_STORAGE_KEY, JSON.stringify({ ...fileSettings, v: 1 }));
};

const restoreFromBackupText = (text) => {
    let backupData;
    try {
        backupData = JSON.parse(text);
    } catch {
        showRestoreMessage(NOT_A_BACKUP_MESSAGE, false);
        return;
    }

    if (!isObject(backupData) || backupData.v !== 1 || !Array.isArray(backupData.offers)) {
        showRestoreMessage(NOT_A_BACKUP_MESSAGE, false);
        return;
    }

    const usableOffers = backupData.offers.filter(isUsableOffer);
    const skippedCount = backupData.offers.length - usableOffers.length;

    const savedOffers = loadOffers();
    const knownIds = new Set(savedOffers.map((offer) => offer.id));
    const newOffers = [];
    for (const offer of usableOffers) {
        if (!knownIds.has(offer.id)) {
            newOffers.push(offer);
            knownIds.add(offer.id);
        }
    }

    if (newOffers.length > 0) {
        const combined = [...savedOffers, ...newOffers];
        combined.sort((a, b) => new Date(a.at) - new Date(b.at));

        if (!saveOffers(combined)) {
            showRestoreMessage("Couldn't save on this phone. Its storage is full.", false);
            return;
        }
    }

    const setupCameBack = restoreSettingsIfNeeded(backupData.settings);
    showLedger();

    let message = "Nothing new to add.";
    if (newOffers.length > 0) {
        message = "Added " + (newOffers.length === 1 ? "1 dash" : newOffers.length + " dashes") + ".";
    }
    if (setupCameBack) message += " Your setup came back too.";
    if (skippedCount > 0) message += " Skipped " + skippedCount + " that looked broken.";
    showRestoreMessage(message, true);
};

restoreInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (file === undefined) return;

    restoreFromBackupText(await file.text());
    event.target.value = "";
});

showLedger();
