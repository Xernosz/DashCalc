const sumTook = document.getElementById("sum-took");
const sumSkipped = document.getElementById("sum-skipped");
const sumKept = document.getElementById("sum-kept");
const sumMiles = document.getElementById("sum-miles");
const sumHourly = document.getElementById("sum-hourly");
const sumPerMile = document.getElementById("sum-permile");

const entryCount = document.getElementById("entry-count");
const nothingLoggedCard = document.getElementById("entry-blank");
const entryList = document.getElementById("entry-list");
const gradeStrip = document.getElementById("grade-strip");

const undoBar = document.getElementById("undo-bar");
const undoButton = document.getElementById("undo-btn");

const DAY_FORMAT = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" });
const TIME_FORMAT = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

const moneyOrDash = (amount) => {
    return Number.isFinite(amount) ? money(amount) : "—";
};

const milesOrDash = (miles) => {
    return Number.isFinite(miles) ? miles + " mi" : "— mi";
};

const perMileOf = (offer) => {
    if (Number.isFinite(offer.perMile)) return offer.perMile;
    return offer.keep / milesDriven(offer.miles, offer.farTrip);
};

const timeOfDay = (isoDate) => {
    const moment = new Date(isoDate);
    return Number.isNaN(moment.getTime()) ? "" : TIME_FORMAT.format(moment);
};

const workDayLabel = (isoDate) => {
    const moment = new Date(isoDate);
    if (Number.isNaN(moment.getTime())) return "Earlier";

    const now = new Date();
    const dayBefore = new Date(now);
    dayBefore.setDate(dayBefore.getDate() - 1);

    if (workDayOf(moment) === workDayOf(now)) return "Today";
    if (workDayOf(moment) === workDayOf(dayBefore)) return "Yesterday";

    const shifted = new Date(moment);
    shifted.setHours(shifted.getHours() - NEW_DAY_STARTS_AT_HOUR);
    return DAY_FORMAT.format(shifted);
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

const offersNewestFirst = () => {
    return offersNotDeleted().sort((a, b) => (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0));
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

    const makesSense = field === "pay" ? value >= 0 : value > 0;
    if (Number.isFinite(value) && makesSense) {
        updateOfferField(entry.dataset.id, field, value);
    }

    const offers = offersNewestFirst();
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
    stamp.textContent = timeOfDay(offer.at);

    const metaLine = document.createElement("div");
    metaLine.className = "entry__meta";
    metaLine.append(spanWith("entry__tag " + (offer.took ? "entry__tag--took" : "entry__tag--skipped"),
        offer.took ? "Took" : "Skipped"));
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
    const trashIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const trashShape = document.createElementNS("http://www.w3.org/2000/svg", "use");
    trashIcon.setAttribute("class", "icon");
    trashIcon.setAttribute("aria-hidden", "true");
    trashShape.setAttribute("href", "icons/ui.svg#trash");
    trashIcon.append(trashShape);
    deleteButton.append(trashIcon);

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
    sumSkipped.textContent = totals.skipped;
    sumKept.textContent = totals.took > 0 ? money(totals.kept) : "—";
    sumMiles.textContent = totals.took > 0 ? totals.miles.toFixed(1) : "—";
    sumHourly.textContent = totals.hourly === null ? "—" : money(totals.hourly);
    sumPerMile.textContent = totals.perMile === null ? "—" : money(totals.perMile);
    sumHourly.dataset.grade = hourlyGrade(totals.hourly, totals.perMile);
    sumPerMile.dataset.grade = perMileGrade(totals.hourly, totals.perMile);

    gradeStrip.replaceChildren(...offers.slice(0, 12).reverse().map((offer) => {
        const chip = spanWith("strip__chip" + (offer.took ? "" : " strip__chip--skipped"), offer.grade === "S" ? "★" : offer.grade);
        chip.dataset.grade = offer.grade;
        return chip;
    }));

    entryCount.textContent = offers.length === 1 ? "1 dash" : offers.length + " dashes";
    nothingLoggedCard.hidden = offers.length > 0;
};

const showJournal = () => {
    const newestFirst = offersNewestFirst();

    showTotals(newestFirst);
    entryList.replaceChildren();

    let dayShown = null;
    newestFirst.forEach((offer) => {
        const day = workDayLabel(offer.at);
        if (day !== dayShown) {
            dayShown = day;
            const heading = document.createElement("h3");
            heading.className = "entry-day";
            heading.textContent = day;
            entryList.append(heading);
        }
        entryList.append(buildEntry(offer));
    });
};

const UNDO_WINDOW_MS = 8000;
let undoTimeoutId = null;
let idPendingUndo = null;

undoBar.style.setProperty("--undo-time", UNDO_WINDOW_MS + "ms");

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
    undoBar.classList.remove("undo--timing");
    void undoBar.offsetWidth;
    undoBar.classList.add("undo--timing");
    undoTimeoutId = window.setTimeout(hideUndoBar, UNDO_WINDOW_MS);
};

entryList.addEventListener("click", (event) => {
    const deleteButton = event.target.closest(".entry__del");
    if (deleteButton === null) return;

    deleteOffer(deleteButton.dataset.id);
    showJournal();
    showUndoBar(deleteButton.dataset.id);
    undoButton.focus();
});

undoButton.addEventListener("click", () => {
    if (idPendingUndo === null) return;

    restoreOffer(idPendingUndo);
    showJournal();
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

const openBackupPanel = () => {
    restoreStatus.textContent = "";
    restoreStatus.classList.remove("backup__status--good", "backup__status--bad");
    openSheet(backupOverlay, backup);
};

const closeBackupPanel = () => {
    closeSheet(backupOverlay, backup, 220);
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
    const backupData = { v: 1, savedAt: new Date().toISOString(), settings: loadSettings(), offers: offersNotDeleted() };
    return JSON.stringify(backupData, null, 2);
};

backupJsonButton.addEventListener("click", () => {
    downloadFile("dashcalc-backup-" + localDate(new Date()) + ".json", makeBackupJson(), "application/json");
});

const CSV_HEADER = [
    "date", "time", "took or skipped", "pay", "miles", "far trip",
    "miles driven", "minutes", "$ an hour", "$ a mile", "grade"
];

const twoDigits = (number) => {
    return String(number).padStart(2, "0");
};

const localDate = (moment) => {
    return moment.getFullYear() + "-" + twoDigits(moment.getMonth() + 1) + "-" + twoDigits(moment.getDate());
};

const numberOrEmpty = (value, places) => {
    return Number.isFinite(value) ? value.toFixed(places) : "";
};

const csvRowFor = (offer) => {
    const moment = new Date(offer.at);
    const validMoment = !Number.isNaN(moment.getTime());
    const date = validMoment ? localDate(moment) : "";
    const time = validMoment ? twoDigits(moment.getHours()) + ":" + twoDigits(moment.getMinutes()) : "";
    const driven = Number.isFinite(offer.miles) ? milesDriven(offer.miles, offer.farTrip) : null;

    return [
        date,
        time,
        offer.took ? "took" : "skipped",
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
    const rows = [CSV_HEADER, ...offersNotDeleted().map(csvRowFor)];
    return rows.map((row) => row.join(",")).join("\n");
};

backupCsvButton.addEventListener("click", () => {
    downloadFile("dashcalc-journal-" + localDate(new Date()) + ".csv", makeBackupCsv(), "text/csv");
});

const showRestoreMessage = (text, isGood) => {
    restoreStatus.textContent = text;
    restoreStatus.classList.remove("backup__status--good", "backup__status--bad");
    restoreStatus.classList.add(isGood ? "backup__status--good" : "backup__status--bad");
};

const NOT_A_BACKUP_MESSAGE = "That file isn’t a DashCalc backup.";

const isObject = (value) => {
    return typeof value === "object" && value !== null;
};

const isUsableOffer = (offer) => {
    return isObject(offer) &&
        typeof offer.id === "string" &&
        typeof offer.at === "string" && !Number.isNaN(new Date(offer.at).getTime()) &&
        Number.isFinite(offer.pay) && offer.pay >= 0 &&
        Number.isFinite(offer.miles) && offer.miles > 0;
};

const restoreSettingsIfNeeded = (fileSettings) => {
    if (carIsSetUp(loadSettings())) return false;
    if (!isObject(fileSettings) || !carIsSetUp(fileSettings)) return false;

    return saveSettings({ ...fileSettings, v: 1 });
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
            showRestoreMessage("Couldn’t save on this phone. Its storage is full.", false);
            return;
        }
    }

    const setupCameBack = restoreSettingsIfNeeded(backupData.settings);
    showJournal();

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

showJournal();
