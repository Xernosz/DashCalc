const COUNTER_ADDRESS = "https://dashcalc.goatcounter.com/count";
const REAL_SITE = "xernosz.github.io";
const COUNT_NOTE_KEY = "dashcalc-counted";
const COUNT_DAY_STARTS_AT_HOUR = 4;
const GRADE_SETTLE_MS = 2500;
const ACTIVE_DAYS_NEEDED = 2;
const ACTIVE_BIG_DAY_OFFERS = 5;
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const readCountNote = () => {
    try {
        const note = JSON.parse(localStorage.getItem(COUNT_NOTE_KEY));
        if (note && note.v === 1 && note.days) return note;
    } catch {
    }
    return { v: 1, days: {} };
};

const saveCountNote = (note) => {
    try {
        localStorage.setItem(COUNT_NOTE_KEY, JSON.stringify(note));
    } catch {
    }
};

const browserSaysDontCount = () => navigator.globalPrivacyControl === true || navigator.doNotTrack === "1";

const countingIsOn = () => !browserSaysDontCount() && readCountNote().off !== true;

const sendCount = (name, isEvent) => {
    if (location.hostname !== REAL_SITE) return;

    const address = new URL(COUNTER_ADDRESS);
    address.searchParams.set("p", name);
    if (isEvent) address.searchParams.set("e", "true");
    if (!isEvent && document.referrer && !document.referrer.startsWith(location.origin)) {
        address.searchParams.set("r", document.referrer);
    }
    address.searchParams.set("rnd", Math.random().toString(36).slice(2, 7));

    new Image().src = address.href;
};

const countDayOf = (time) => {
    const shifted = new Date(time);
    shifted.setHours(shifted.getHours() - COUNT_DAY_STARTS_AT_HOUR);
    const month = String(shifted.getMonth() + 1).padStart(2, "0");
    const day = String(shifted.getDate()).padStart(2, "0");
    return shifted.getFullYear() + "-" + month + "-" + day;
};

const sendActiveWeekIfDue = (note) => {
    const tooOld = countDayOf(Date.now() - ONE_WEEK_MS);
    for (const day of Object.keys(note.days)) {
        if (day <= tooOld) delete note.days[day];
    }

    const offersPerDay = Object.values(note.days);
    const isActive = offersPerDay.length >= ACTIVE_DAYS_NEEDED || Math.max(0, ...offersPerDay) >= ACTIVE_BIG_DAY_OFFERS;
    const sentThisWeek = Date.now() - (note.activeAt || 0) < ONE_WEEK_MS;

    if (isActive && !sentThisWeek) {
        sendCount("active-week", true);
        note.activeAt = Date.now();
    }
};

const countThisVisit = () => {
    const note = readCountNote();
    sendCount(location.pathname.replace(/index\.html$/, ""), false);

    if (!note.firstVisit) {
        sendCount("first-visit", true);
        note.firstVisit = true;
    }

    sendActiveWeekIfDue(note);
    saveCountNote(note);
};

let offerWaiting = null;
let offerLastCounted = null;
let settleTimerId = null;

const countWaitingOffer = () => {
    window.clearTimeout(settleTimerId);
    const offer = offerWaiting;
    offerWaiting = null;

    if (offer === null || offer === offerLastCounted || !countingIsOn()) return;
    offerLastCounted = offer;

    const note = readCountNote();
    const today = countDayOf(Date.now());
    note.days[today] = (note.days[today] || 0) + 1;

    if (!note.firstUse) {
        sendCount("first-use", true);
        note.firstUse = true;
    }

    sendActiveWeekIfDue(note);
    saveCountNote(note);
};

document.addEventListener("offerchange", (event) => {
    if (event.detail === null) {
        countWaitingOffer();
        offerLastCounted = null;
        return;
    }

    offerWaiting = event.detail.pay + "|" + event.detail.miles;
    window.clearTimeout(settleTimerId);
    settleTimerId = window.setTimeout(countWaitingOffer, GRADE_SETTLE_MS);
});

document.addEventListener("visibilitychange", () => {
    if (document.hidden) countWaitingOffer();
});

const countSwitch = document.getElementById("count-visits");

if (countSwitch) {
    const blocked = browserSaysDontCount();
    countSwitch.checked = countingIsOn();
    countSwitch.disabled = blocked;
    document.getElementById("count-blocked").hidden = !blocked;

    countSwitch.addEventListener("change", () => {
        const note = readCountNote();
        note.off = !countSwitch.checked;
        saveCountNote(note);
    });
}

if (countingIsOn()) countThisVisit();
