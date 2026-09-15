const OFFERS_STORAGE_KEY = "dashcalc-offers";

const loadOffers = () => {
    const savedJson = localStorage.getItem(OFFERS_STORAGE_KEY);
    if (savedJson === null) return [];

    try {
        const parsed = JSON.parse(savedJson);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const saveOffers = (offers) => {
    localStorage.setItem(OFFERS_STORAGE_KEY, JSON.stringify(offers));
};

const newOfferId = () => {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
};

const addOffer = (offer) => {
    const offers = loadOffers();
    offers.push(offer);
    saveOffers(offers);
};

const deleteOffer = (id) => {
    const offers = loadOffers();
    const offer = offers.find((offer) => offer.id === id);
    if (offer !== undefined) offer.deletedAt = new Date().toISOString();
    saveOffers(offers);
};

const restoreOffer = (id) => {
    const offers = loadOffers();
    const offer = offers.find((offer) => offer.id === id);
    if (offer !== undefined) delete offer.deletedAt;
    saveOffers(offers);
};

const updateOfferField = (id, field, value) => {
    const offers = loadOffers();
    const offer = offers.find((offer) => offer.id === id);
    if (offer === undefined) return;

    offer[field] = value;

    const keep = offer.pay - (offer.gas || 0) - (offer.wear || 0) - (offer.tax || 0);
    const hours = offer.minutes / 60;

    offer.keep = keep;
    offer.hourly = hours > 0 ? keep / hours : 0;
    offer.perMile = offer.miles > 0 ? keep / offer.miles : 0;
    offer.grade = hourlyGrade(offer.hourly, offer.perMile);

    saveOffers(offers);
};

const activeOffers = () => {
    return loadOffers().filter((offer) => !offer.deletedAt);
};

const offersFromToday = () => {
    const today = new Date().toDateString();
    return activeOffers().filter((offer) => new Date(offer.at).toDateString() === today);
};

const DELETED_RECORD_LIFESPAN_DAYS = 30;

const purgeOldDeletes = () => {
    const cutoff = Date.now() - DELETED_RECORD_LIFESPAN_DAYS * 24 * 60 * 60 * 1000;
    const offers = loadOffers();
    const kept = offers.filter((offer) => !offer.deletedAt || new Date(offer.deletedAt).getTime() > cutoff);

    if (kept.length !== offers.length) saveOffers(kept);
};

purgeOldDeletes();

const addUp = (offers, field) => {
    return offers.reduce((total, offer) => total + Number(offer[field] || 0), 0);
};

const summarizeOffers = (offers) => {
    const taken = offers.filter((offer) => offer.took);
    const keptTotal = addUp(taken, "keep");
    const hoursTotal = addUp(taken, "minutes") / 60;
    const milesTotal = addUp(taken, "miles");

    return {
        seen: offers.length,
        took: taken.length,
        passed: offers.length - taken.length,
        kept: keptTotal,
        miles: milesTotal,
        hourly: hoursTotal > 0 ? keptTotal / hoursTotal : null,
        perMile: milesTotal > 0 ? keptTotal / milesTotal : null
    };
};

const HOURLY_GRADES = [
    { grade: "A", atLeast: 22 },
    { grade: "B", atLeast: 18 },
    { grade: "C", atLeast: 14 },
    { grade: "D", atLeast: 10 }
];

const PER_MILE_GRADES = [
    { grade: "A", atLeast: 1.50 },
    { grade: "B", atLeast: 1.20 },
    { grade: "C", atLeast: 0.90 },
    { grade: "D", atLeast: 0.60 }
];

const GOLD_HOURLY = 35;
const GOLD_PER_MILE = 2.50;

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
