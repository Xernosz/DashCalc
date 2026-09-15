if (navigator.storage?.persist) {
    navigator.storage.persist().catch(() => { });
}

const SETTINGS_STORAGE_KEY = "dashcalc-settings";
const SELF_EMPLOYMENT_TAX_RATE = 0.153;
const FALLBACK_SPEED_MPH = 30;
const SHORTEST_POSSIBLE_TRIP_MINUTES = 1;
const HOURLY_THAT_FILLS_THE_DIAL = 25;
const GOOD_HOURLY = 20;
const GREAT_HOURLY = 25;

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

const IRS_MILEAGE_RATES = [
    { startsOn: new Date(2026, 0, 1), centsPerMile: 72.5 },
    { startsOn: new Date(2026, 6, 1), centsPerMile: 76 }
];

const CALL_FOR_GRADE = {
    S: "GRAB IT",
    A: "TAKE IT",
    B: "TAKE IT",
    C: "PROBABLY",
    D: "YOUR CALL",
    F: "SKIP IT"
};

const GOLD_STAR = "★";

const noSetupCard = document.getElementById("no-setup");
const calculatorBody = document.getElementById("calc-body");

const payBox = document.getElementById("offer-pay");
const milesBox = document.getElementById("offer-miles");
const farTripBox = document.getElementById("far-trip");
const nothingTypedYetCard = document.getElementById("verdict-empty");
const answerCard = document.getElementById("verdict-body");
const verdictCard = document.getElementById("verdict");

const gradeLetter = document.getElementById("verdict-letter");
const hourlyReadout = document.getElementById("verdict-hourly");
const perMileReadout = document.getElementById("verdict-permile");
const callReadout = document.getElementById("verdict-call");

const factKeep = document.getElementById("fact-keep");
const factTime = document.getElementById("fact-time");
const factCosts = document.getElementById("fact-costs");

const mathPay = document.getElementById("math-pay");
const mathGas = document.getElementById("math-gas");
const mathWear = document.getElementById("math-wear");
const mathTax = document.getElementById("math-tax");
const mathKeep = document.getElementById("math-keep");

const skipButton = document.getElementById("btn-skip");
const takeButton = document.getElementById("btn-take");

const todaySeen = document.getElementById("today-seen");
const todayTaken = document.getElementById("today-taken");
const todayHourly = document.getElementById("today-hourly");
const todayPerMile = document.getElementById("today-permile");

const cheatSheetButton = document.getElementById("sheet-open");
const cheatSheetCloseButton = document.getElementById("sheet-close");
const cheatSheetOverlay = document.getElementById("sheet-overlay");
const cheatSheetPanel = document.getElementById("sheet");
const goodButton = document.getElementById("seg-good");
const greatButton = document.getElementById("seg-great");
const cheatSheetRows = document.querySelectorAll("#sheet-list .r");
const cheatSheetHeadline = document.getElementById("sheet-quick");
const cheatSheetChips = document.querySelectorAll("#sheet-chips span");

const money = (amount) => "$" + amount.toFixed(2);

const isFilledNumber = (value) => {
    return value !== undefined && String(value).trim() !== "" && Number.isFinite(Number(value));
};

const loadSettings = () => {
    const savedJson = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (savedJson === null) return { v: 1 };

    try {
        return JSON.parse(savedJson);
    } catch {
        return { v: 1 };
    }
};

const irsCentsPerMileToday = () => {
    const today = new Date();
    let rateInEffect = IRS_MILEAGE_RATES[0];

    for (const rate of IRS_MILEAGE_RATES) {
        if (today >= rate.startsOn) {
            rateInEffect = rate;
        }
    }

    return rateInEffect.centsPerMile;
};

const carFrom = (settings) => {
    return {
        milesPerGallon: Number(settings.mpg),
        gasPricePerGallon: Number(settings.gasPrice),
        speedMph: Number(settings.avgSpeed) || FALLBACK_SPEED_MPH,
        waitMinutes: Number(settings.typicalWait) || 0,
        taxRate: SELF_EMPLOYMENT_TAX_RATE + (STATE_TAX_RATES[settings.homeState] ?? 0)
    };
};

const minutesForTrip = (miles, car) => {
    const drivingMinutes = (miles / car.speedMph) * 60;
    return Math.max(drivingMinutes + car.waitMinutes, SHORTEST_POSSIBLE_TRIP_MINUTES);
};

const gasCostFor = (miles, car) => {
    return miles * (car.gasPricePerGallon / car.milesPerGallon);
};

const mileageDeductionFor = (miles) => {
    return miles * (irsCentsPerMileToday() / 100);
};

const wearAndTearCostFor = (miles, car) => {
    return Math.max(0, mileageDeductionFor(miles) - gasCostFor(miles, car));
};

const taxToSetAside = (pay, miles, car) => {
    const payTheIrsCanTax = Math.max(0, pay - mileageDeductionFor(miles));
    return payTheIrsCanTax * car.taxRate;
};

const evaluateOffer = (pay, miles, car) => {
    const gas = gasCostFor(miles, car);
    const wear = wearAndTearCostFor(miles, car);
    const tax = taxToSetAside(pay, miles, car);
    const keep = pay - gas - wear - tax;
    const minutes = minutesForTrip(miles, car);
    const hourly = keep / (minutes / 60);
    const perMile = keep / miles;

    return {
        pay: pay,
        miles: miles,
        minutes: Math.round(minutes),
        gas: gas,
        wear: wear,
        tax: tax,
        keep: keep,
        hourly: hourly,
        perMile: perMile,
        grade: hourlyGrade(hourly, perMile),
        perMileMark: perMileGrade(hourly, perMile)
    };
};

const payNeededToHit = (miles, goalHourly, car) => {
    const hours = minutesForTrip(miles, car) / 60;
    const gas = gasCostFor(miles, car);
    const wear = wearAndTearCostFor(miles, car);
    const deduction = mileageDeductionFor(miles);
    const keepWanted = goalHourly * hours;
    const pay = (keepWanted + gas + wear - deduction * car.taxRate) / (1 - car.taxRate);

    return Math.max(0, pay);
};

const readTypedOffer = () => {
    const pay = Number(payBox.value);
    const miles = Number(milesBox.value);

    const payIsUsable = payBox.value.trim() !== "" && Number.isFinite(pay) && pay >= 0;
    const milesAreUsable = milesBox.value.trim() !== "" && Number.isFinite(miles) && miles > 0;

    if (!payIsUsable || !milesAreUsable) return null;
    return { pay: pay, miles: farTripBox.checked ? miles * 2 : miles };
};

let offerOnScreen = null;

const showNothingTypedYet = () => {
    offerOnScreen = null;
    nothingTypedYetCard.hidden = false;
    answerCard.hidden = true;
    verdictCard.dataset.grade = "";
    verdictCard.style.setProperty("--fill", "0%");
    hourlyReadout.dataset.grade = "";
    perMileReadout.dataset.grade = "";
};

const showOffer = (offer) => {
    offerOnScreen = offer;
    nothingTypedYetCard.hidden = true;
    answerCard.hidden = false;

    gradeLetter.textContent = offer.grade === "S" ? GOLD_STAR : offer.grade;
    callReadout.textContent = CALL_FOR_GRADE[offer.grade];
    verdictCard.dataset.grade = offer.grade;

    const dialFill = Math.max(0, Math.min(100, (offer.hourly / HOURLY_THAT_FILLS_THE_DIAL) * 100));
    verdictCard.style.setProperty("--fill", dialFill + "%");

    hourlyReadout.textContent = money(offer.hourly);
    perMileReadout.textContent = money(offer.perMile);
    hourlyReadout.dataset.grade = offer.grade;
    perMileReadout.dataset.grade = offer.perMileMark;

    factKeep.textContent = money(offer.keep);
    factTime.textContent = offer.minutes + " min";
    factCosts.textContent = money(offer.gas + offer.wear + offer.tax);

    mathPay.textContent = money(offer.pay);
    mathGas.textContent = money(offer.gas);
    mathWear.textContent = money(offer.wear);
    mathTax.textContent = money(offer.tax);
    mathKeep.textContent = money(offer.keep);
};

const updateVerdict = () => {
    const typed = readTypedOffer();

    if (typed === null) {
        showNothingTypedYet();
    } else {
        showOffer(evaluateOffer(typed.pay, typed.miles, carFrom(loadSettings())));
    }

    if (!cheatSheetOverlay.hidden) {
        fillCheatSheet();
    }
};

const refreshTodayBar = () => {
    const totals = summarizeOffers(offersFromToday());

    todaySeen.textContent = totals.seen;
    todayTaken.textContent = totals.took;
    todayHourly.textContent = totals.hourly === null ? "—" : money(totals.hourly);
    todayPerMile.textContent = totals.perMile === null ? "—" : money(totals.perMile);
    todayHourly.dataset.grade = hourlyGrade(totals.hourly, totals.perMile);
    todayPerMile.dataset.grade = perMileGrade(totals.hourly, totals.perMile);
};

const clearForm = () => {
    payBox.value = "";
    milesBox.value = "";
    farTripBox.checked = false;
    updateVerdict();
    payBox.focus();
};

const logOffer = (took) => {
    if (offerOnScreen !== null) {
        addOffer({
            v: 1,
            id: newOfferId(),
            at: new Date().toISOString(),
            took: took,
            pay: offerOnScreen.pay,
            miles: offerOnScreen.miles,
            minutes: offerOnScreen.minutes,
            gas: offerOnScreen.gas,
            wear: offerOnScreen.wear,
            tax: offerOnScreen.tax,
            keep: offerOnScreen.keep,
            hourly: offerOnScreen.hourly,
            perMile: offerOnScreen.perMile,
            grade: offerOnScreen.grade
        });

        refreshTodayBar();
    }

    clearForm();
};

let cheatSheetGoalHourly = GOOD_HOURLY;

const fillCheatSheet = () => {
    const settings = loadSettings();
    const car = carFrom(settings);
    const milesYouTyped = Math.round(Number(milesBox.value));

    cheatSheetRows.forEach((row) => {
        const miles = Number(row.dataset.mi);
        const askingPrice = payNeededToHit(miles, cheatSheetGoalHourly, car).toFixed(2);
        const [dollars, cents] = askingPrice.split(".");

        row.querySelector(".r__d").textContent = dollars;
        row.querySelector(".r__c").textContent = "." + cents;

        const isYourOffer = miles === milesYouTyped;
        row.classList.toggle("r--here", isYourOffer);
        row.querySelector(".r__flag").hidden = !isYourOffer;
    });

    const fiveMilePay = payNeededToHit(5, cheatSheetGoalHourly, car);
    cheatSheetHeadline.textContent = money(fiveMilePay / 5) + " a mile";

    const chipText = [
        (settings.mpg || "?") + " mpg",
        "$" + (Number(settings.gasPrice) || 0).toFixed(2) + " /gal",
        settings.homeState || "?",
        (settings.typicalWait || "0") + " min wait",
        (settings.avgSpeed || "?") + " mph"
    ];

    cheatSheetChips.forEach((chip, index) => {
        chip.textContent = chipText[index];
    });
};

let cheatSheetCloseTimer = null;

const openCheatSheet = () => {
    if (cheatSheetCloseTimer !== null) {
        window.clearTimeout(cheatSheetCloseTimer);
        cheatSheetCloseTimer = null;
    }

    fillCheatSheet();
    cheatSheetOverlay.hidden = false;
    void cheatSheetPanel.offsetWidth;
    cheatSheetOverlay.classList.add("sheet-overlay--open");
    cheatSheetPanel.classList.add("sheet--open");
};

const closeCheatSheet = () => {
    cheatSheetOverlay.classList.remove("sheet-overlay--open");
    cheatSheetPanel.classList.remove("sheet--open");

    cheatSheetCloseTimer = window.setTimeout(() => {
        cheatSheetOverlay.hidden = true;
        cheatSheetCloseTimer = null;
    }, 320);
};

const setCheatSheetGoal = (goalHourly, buttonToTurnOn, buttonToTurnOff) => {
    cheatSheetGoalHourly = goalHourly;

    buttonToTurnOn.classList.add("seg__b--on");
    buttonToTurnOn.setAttribute("aria-pressed", "true");
    buttonToTurnOff.classList.remove("seg__b--on");
    buttonToTurnOff.setAttribute("aria-pressed", "false");

    fillCheatSheet();
};

const settingsAtLoad = loadSettings();

const carIsSetUp =
    Number(settingsAtLoad.mpg) > 0 &&
    isFilledNumber(settingsAtLoad.gasPrice) &&
    Object.hasOwn(STATE_TAX_RATES, settingsAtLoad.homeState ?? "");

if (!carIsSetUp) {
    noSetupCard.hidden = false;
    calculatorBody.hidden = true;
} else {
    payBox.addEventListener("input", updateVerdict);
    milesBox.addEventListener("input", updateVerdict);
    farTripBox.addEventListener("change", updateVerdict);

    skipButton.addEventListener("click", () => logOffer(false));
    takeButton.addEventListener("click", () => logOffer(true));

    cheatSheetButton.addEventListener("click", openCheatSheet);
    cheatSheetCloseButton.addEventListener("click", closeCheatSheet);

    cheatSheetOverlay.addEventListener("click", (event) => {
        if (event.target === cheatSheetOverlay) closeCheatSheet();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !cheatSheetOverlay.hidden) closeCheatSheet();
    });

    goodButton.addEventListener("click", () => setCheatSheetGoal(GOOD_HOURLY, goodButton, greatButton));
    greatButton.addEventListener("click", () => setCheatSheetGoal(GREAT_HOURLY, greatButton, goodButton));

    updateVerdict();
}

refreshTodayBar();
