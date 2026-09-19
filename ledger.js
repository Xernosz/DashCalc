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

showLedger();
