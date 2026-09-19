const HOURLY_THAT_FILLS_THE_DIAL = 25;
const GOOD_HOURLY = 20;
const GREAT_HOURLY = 25;

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

const ROUGH_MONEY_FORMAT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", trailingZeroDisplay: "stripIfInteger" });

const payNeededToHit = (miles, goalHourly, car) => {
    const hours = minutesForTrip(miles, car) / 60;
    const gas = gasCostFor(miles, car);
    const wear = wearAndTearCostFor(miles, car);
    const deduction = mileageDeductionFor(miles, car);
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
    return { pay: pay, miles: miles, farTrip: farTripBox.checked };
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
    factTime.textContent = Math.round(offer.minutes) + " min";
    factCosts.textContent = money(offer.gas + offer.wear + offer.tax);

    mathPay.textContent = money(offer.pay);
    mathGas.textContent = money(offer.gas);
    mathWear.textContent = money(offer.wear);
    mathTax.textContent = money(offer.tax);
    mathKeep.textContent = money(offer.keep);
};

const updateVerdict = () => {
    const settings = loadSettings();
    const carIsReady = carIsSetUp(settings);
    const typed = readTypedOffer();

    noSetupCard.hidden = carIsReady;
    calculatorBody.hidden = !carIsReady;
    cheatSheetButton.hidden = !carIsReady;

    if (!carIsReady || typed === null) {
        showNothingTypedYet();
    } else {
        showOffer(evaluateOffer(typed.pay, typed.miles, typed.farTrip, carFrom(settings, new Date())));
    }

    if (carIsReady && cheatSheetOverlay.open) {
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

const offerCanBeSaved = (offer) => {
    return offer !== null && Number.isFinite(offer.hourly) && Number.isFinite(offer.perMile);
};

const logOffer = (took) => {
    if (offerCanBeSaved(offerOnScreen)) {
        const saved = addOffer({
            v: 2,
            id: newOfferId(),
            at: new Date().toISOString(),
            took: took,
            pay: offerOnScreen.pay,
            miles: offerOnScreen.miles,
            farTrip: offerOnScreen.farTrip,
            minutes: offerOnScreen.minutes,
            gas: offerOnScreen.gas,
            wear: offerOnScreen.wear,
            tax: offerOnScreen.tax,
            keep: offerOnScreen.keep,
            hourly: offerOnScreen.hourly,
            perMile: offerOnScreen.perMile,
            grade: offerOnScreen.grade
        });

        if (!saved) {
            window.alert("Couldn't save this dash on this phone.");
        }

        refreshTodayBar();
    }

    clearForm();
};

let cheatSheetGoalHourly = GOOD_HOURLY;

const fillCheatSheet = () => {
    const settings = loadSettings();
    const car = carFrom(settings, new Date());
    const milesYouTyped = Math.round(milesDriven(Number(milesBox.value), farTripBox.checked));

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

    const payForNoMiles = payNeededToHit(0, cheatSheetGoalHourly, car);
    const payPerMile = (payNeededToHit(10, cheatSheetGoalHourly, car) - payForNoMiles) / 10;
    const roundedBase = Math.round(payForNoMiles * 2) / 2;
    const roundedPerMile = Math.round(payPerMile * 4) / 4;
    cheatSheetHeadline.textContent = ROUGH_MONEY_FORMAT.format(roundedBase) + ", plus " +
        ROUGH_MONEY_FORMAT.format(roundedPerMile) + " a mile";

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
    cheatSheetOverlay.showModal();
    void cheatSheetPanel.offsetWidth;
    cheatSheetOverlay.classList.add("sheet-overlay--open");
    cheatSheetPanel.classList.add("sheet--open");
};

const closeCheatSheet = () => {
    if (cheatSheetCloseTimer !== null) {
        window.clearTimeout(cheatSheetCloseTimer);
    }

    cheatSheetOverlay.classList.remove("sheet-overlay--open");
    cheatSheetPanel.classList.remove("sheet--open");

    cheatSheetCloseTimer = window.setTimeout(() => {
        cheatSheetOverlay.close();
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

const moveToMilesOnEnter = (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        milesBox.focus();
    }
};

payBox.addEventListener("input", updateVerdict);
payBox.addEventListener("keydown", moveToMilesOnEnter);
milesBox.addEventListener("input", updateVerdict);
farTripBox.addEventListener("change", updateVerdict);

skipButton.addEventListener("click", () => logOffer(false));
takeButton.addEventListener("click", () => logOffer(true));

cheatSheetButton.addEventListener("click", openCheatSheet);
cheatSheetCloseButton.addEventListener("click", closeCheatSheet);

cheatSheetOverlay.addEventListener("click", (event) => {
    if (event.target === cheatSheetOverlay) closeCheatSheet();
});

cheatSheetOverlay.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeCheatSheet();
});

goodButton.addEventListener("click", () => setCheatSheetGoal(GOOD_HOURLY, goodButton, greatButton));
greatButton.addEventListener("click", () => setCheatSheetGoal(GREAT_HOURLY, greatButton, goodButton));

window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
        updateVerdict();
        refreshTodayBar();
    }
});

updateVerdict();
refreshTodayBar();
