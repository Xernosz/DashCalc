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

const money = (amount) => "$" + amount.toFixed(2);

const perMileOf = (offer) => {
    if (Number.isFinite(offer.perMile)) return offer.perMile;
    return offer.keep / offer.miles;
};

const whenItHappened = (isoDate) => {
    const moment = new Date(isoDate);
    const day = moment.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const time = moment.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return day + " at " + time;
};

const spanWith = (className, text) => {
    const span = document.createElement("span");
    span.className = className;
    span.textContent = text;
    return span;
};

const parseEditedNumber = (text) => {
    return Number(text.replace(/[^0-9.]/g, ""));
};

const commitFieldOnEnter = (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        event.target.blur();
    }
};

const saveEditedField = (event) => {
    const id = event.target.closest(".entry").dataset.id;
    const field = event.target.dataset.field;
    const value = parseEditedNumber(event.target.textContent);

    if (Number.isFinite(value) && value > 0) {
        updateOfferField(id, field, value);
    }

    showLedger();
};

const buildEntry = (offer) => {
    const payValue = spanWith("entry__pay", money(offer.pay));
    payValue.contentEditable = "plaintext-only";
    payValue.dataset.field = "pay";
    payValue.addEventListener("blur", saveEditedField);
    payValue.addEventListener("keydown", commitFieldOnEnter);

    const milesValue = spanWith("entry__miles", offer.miles.toFixed(1) + " mi");
    milesValue.contentEditable = "plaintext-only";
    milesValue.dataset.field = "miles";
    milesValue.addEventListener("blur", saveEditedField);
    milesValue.addEventListener("keydown", commitFieldOnEnter);

    const topLine = document.createElement("div");
    topLine.className = "entry__top";
    topLine.append(payValue, milesValue);

    const rateLine = document.createElement("div");
    rateLine.className = "entry__rates";
    rateLine.append(
        spanWith("entry__rate", money(offer.hourly) + " an hour"),
        spanWith("entry__rate", money(perMileOf(offer)) + " a mile")
    );

    const stamp = document.createElement("time");
    stamp.dateTime = offer.at;
    stamp.textContent = whenItHappened(offer.at);

    const metaLine = document.createElement("div");
    metaLine.className = "entry__meta";
    metaLine.append(
        spanWith("entry__tag " + (offer.took ? "entry__tag--took" : "entry__tag--passed"),
            offer.took ? "Took" : "Passed"),
        stamp
    );

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

const showLedger = () => {
    const newestFirst = activeOffers().slice().reverse();
    const totals = summarizeOffers(newestFirst);

    sumTook.textContent = totals.took;
    sumPassed.textContent = totals.passed;
    sumKept.textContent = totals.took > 0 ? money(totals.kept) : "—";
    sumMiles.textContent = totals.took > 0 ? totals.miles.toFixed(1) : "—";
    sumHourly.textContent = totals.hourly === null ? "—" : money(totals.hourly);
    sumPerMile.textContent = totals.perMile === null ? "—" : money(totals.perMile);
    sumHourly.dataset.grade = hourlyGrade(totals.hourly, totals.perMile);
    sumPerMile.dataset.grade = perMileGrade(totals.hourly, totals.perMile);

    entryCount.textContent = newestFirst.length === 1 ? "1 dash" : newestFirst.length + " dashes";
    nothingLoggedCard.hidden = newestFirst.length > 0;

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

showLedger();
