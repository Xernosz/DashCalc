const sumTook = document.getElementById("sum-took");
const sumPassed = document.getElementById("sum-passed");
const sumKept = document.getElementById("sum-kept");
const sumMiles = document.getElementById("sum-miles");
const sumHourly = document.getElementById("sum-hourly");
const sumPerMile = document.getElementById("sum-permile");

const entryCount = document.getElementById("entry-count");
const nothingLoggedCard = document.getElementById("entry-blank");
const entryList = document.getElementById("entry-list");

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

const buildEntry = (offer) => {
    const topLine = document.createElement("div");
    topLine.className = "entry__top";
    topLine.append(
        spanWith("entry__pay", money(offer.pay)),
        spanWith("entry__miles", offer.miles.toFixed(1) + " mi")
    );

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
    entry.append(spanWith("entry__grade", offer.grade === "S" ? "★" : offer.grade), details, deleteButton);

    return entry;
};

const showLedger = () => {
    const newestFirst = loadOffers().slice().reverse();
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

entryList.addEventListener("click", (event) => {
    const deleteButton = event.target.closest(".entry__del");
    if (deleteButton === null) return;

    deleteOffer(deleteButton.dataset.id);
    showLedger();
});

showLedger();
