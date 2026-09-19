if (navigator.storage?.persist) {
    navigator.storage.persist().catch(() => { });
}

const SETTINGS_STORAGE_KEY = "dashcalc-settings";
const SELF_EMPLOYMENT_TAX_RATE = 0.153;
const SHORTEST_POSSIBLE_TRIP_MINUTES = 5;

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

const HOURLY_GRADES = [
    { grade: "A", atLeast: 20 },
    { grade: "B", atLeast: 15 },
    { grade: "C", atLeast: 11 },
    { grade: "D", atLeast: 7 }
];

const PER_MILE_GRADES = [
    { grade: "A", atLeast: 1.25 },
    { grade: "B", atLeast: 1.00 },
    { grade: "C", atLeast: 0.75 },
    { grade: "D", atLeast: 0.50 }
];

const GOLD_HOURLY = 35;
const GOLD_PER_MILE = 2.50;

const MONEY_FORMAT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const money = (amount) => MONEY_FORMAT.format(amount);

const readStorage = (key) => {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
};

const writeStorage = (key, value) => {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch {
        return false;
    }
};

const loadSettings = () => {
    const savedJson = readStorage(SETTINGS_STORAGE_KEY);
    if (savedJson === null) return { v: 1 };

    try {
        return JSON.parse(savedJson);
    } catch {
        return { v: 1 };
    }
};

const isFilledNumber = (value) => {
    return value !== undefined && String(value).trim() !== "" && Number.isFinite(Number(value));
};

const carIsSetUp = (settings) => {
    return Number(settings.mpg) > 0 &&
        isFilledNumber(settings.gasPrice) && Number(settings.gasPrice) >= 0 &&
        Object.hasOwn(STATE_TAX_RATES, settings.homeState ?? "") &&
        isFilledNumber(settings.typicalWait) && Number(settings.typicalWait) >= 0 &&
        Number(settings.avgSpeed) > 0;
};

const irsCentsPerMileOn = (day) => {
    let rateInEffect = IRS_MILEAGE_RATES[0];

    for (const rate of IRS_MILEAGE_RATES) {
        if (day >= rate.startsOn) {
            rateInEffect = rate;
        }
    }

    return rateInEffect.centsPerMile;
};

const carFrom = (settings, day) => {
    return {
        milesPerGallon: Number(settings.mpg),
        gasPricePerGallon: Number(settings.gasPrice),
        speedMph: Number(settings.avgSpeed),
        waitMinutes: Number(settings.typicalWait),
        taxRate: SELF_EMPLOYMENT_TAX_RATE + (STATE_TAX_RATES[settings.homeState] ?? 0),
        irsCentsPerMile: irsCentsPerMileOn(day)
    };
};

const milesDriven = (miles, farTrip) => {
    return farTrip ? miles * 2 : miles;
};

const minutesForTrip = (miles, car) => {
    const drivingMinutes = (miles / car.speedMph) * 60;
    return Math.max(drivingMinutes + car.waitMinutes, SHORTEST_POSSIBLE_TRIP_MINUTES);
};

const gasCostFor = (miles, car) => {
    return miles * (car.gasPricePerGallon / car.milesPerGallon);
};

const mileageDeductionFor = (miles, car) => {
    return miles * (car.irsCentsPerMile / 100);
};

const wearAndTearCostFor = (miles, car) => {
    return Math.max(0, mileageDeductionFor(miles, car) - gasCostFor(miles, car));
};

const taxToSetAside = (pay, miles, car) => {
    const payTheIrsCanTax = Math.max(0, pay - mileageDeductionFor(miles, car));
    return payTheIrsCanTax * car.taxRate;
};

const gradeOnScale = (value, scale) => {
    for (const step of scale) {
        if (value >= step.atLeast) return step.grade;
    }
    return "F";
};

const isGold = (hourly, perMile) => {
    return hourly !== null && perMile !== null &&
        hourly >= GOLD_HOURLY && perMile >= GOLD_PER_MILE;
};

const hourlyGrade = (hourly, perMile) => {
    if (isGold(hourly, perMile)) return "S";
    return hourly === null ? "" : gradeOnScale(hourly, HOURLY_GRADES);
};

const perMileGrade = (hourly, perMile) => {
    if (isGold(hourly, perMile)) return "S";
    return perMile === null ? "" : gradeOnScale(perMile, PER_MILE_GRADES);
};

const evaluateOffer = (pay, miles, farTrip, car) => {
    const driven = milesDriven(miles, farTrip);
    const gas = gasCostFor(driven, car);
    const wear = wearAndTearCostFor(driven, car);
    const tax = taxToSetAside(pay, driven, car);
    const keep = pay - gas - wear - tax;
    const minutes = minutesForTrip(driven, car);
    const hourly = keep / (minutes / 60);
    const perMile = keep / driven;

    return {
        pay: pay,
        miles: miles,
        farTrip: farTrip,
        minutes: minutes,
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
