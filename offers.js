const OFFERS_STORAGE_KEY = "dashcalc-offers";
const NEW_DAY_STARTS_AT_HOUR = 4;

const loadOffers = () => {
    const savedJson = readStorage(OFFERS_STORAGE_KEY);
    if (savedJson === null) return [];

    try {
        const parsed = JSON.parse(savedJson);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const saveOffers = (offers) => {
    return writeStorage(OFFERS_STORAGE_KEY, JSON.stringify(offers));
};

const newOfferId = () => {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
};

const addOffer = (offer) => {
    const offers = loadOffers();
    offers.push(offer);
    return saveOffers(offers);
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
    const settings = loadSettings();
    if (!carIsSetUp(settings)) return;

    const offers = loadOffers();
    const offer = offers.find((offer) => offer.id === id);
    if (offer === undefined) return;

    offer[field] = value;

    const redone = evaluateOffer(offer.pay, offer.miles, offer.farTrip, carFrom(settings, new Date(offer.at)));

    offer.minutes = redone.minutes;
    offer.gas = redone.gas;
    offer.wear = redone.wear;
    offer.tax = redone.tax;
    offer.keep = redone.keep;
    offer.hourly = redone.hourly;
    offer.perMile = redone.perMile;
    offer.grade = redone.grade;

    saveOffers(offers);
};

const activeOffers = () => {
    return loadOffers().filter((offer) => !offer.deletedAt);
};

const workDayOf = (moment) => {
    const shifted = new Date(moment);
    shifted.setHours(shifted.getHours() - NEW_DAY_STARTS_AT_HOUR);
    return shifted.toDateString();
};

const offersFromToday = () => {
    const today = workDayOf(new Date());
    return activeOffers().filter((offer) => workDayOf(new Date(offer.at)) === today);
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

const addUpMilesDriven = (offers) => {
    return offers.reduce((total, offer) => total + Number(milesDriven(offer.miles, offer.farTrip) || 0), 0);
};

const summarizeOffers = (offers) => {
    const taken = offers.filter((offer) => offer.took);
    const keptTotal = addUp(taken, "keep");
    const hoursTotal = addUp(taken, "minutes") / 60;
    const milesTotal = addUpMilesDriven(taken);

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
