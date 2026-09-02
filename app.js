
let settings = {
    mileGas: document.getElementById("mpg"),
    gasPrice: document.getElementById("gas-price"),
    taxLocale: document.getElementById("home-state"),
    waitTime: document.getElementById("typical-wait"),
    driveSpeed: document.getElementById("avg-speed")
};

/* let date = new Date(); // stores date of when page is opened
let current = [date.getMonth() + 1, date.getDate(), date.getFullYear()];
console.log(current);
^^ my code then next step
You didn't paste the updated code, so I'm going off your last version with the guard refs fixed. One thing still standing out there: current is [9, 1, 2026] — an array of numbers.
That format is a dead end for Step 14, because you can't easily ask "is this between two dates." You'll want today as a string like "2026-09-01" instead. More on that below.
First, the tax thing — what is this rate?
When you drive for DoorDash you're self-employed. You owe tax on your profit, not on everything DoorDash pays you. 
Profit = money in − business costs. Your car is a business cost: gas, tires, oil, insurance, the car losing value over time.
Tracking every receipt is miserable, so the IRS offers a shortcut: skip all that, just deduct a flat number of cents for every mile you drove for work. 
That flat number is the "standard mileage rate." "Deduct" means "subtract from the income they tax you on."
Example: you earn $80 on an offer and drive 100 miles for it.
- Without the deduction: taxed on $80.
- With it: taxed on $80 − (100 × $0.725) = $7.50.
The mileage deduction is huge — it wipes out most of the taxable income. Get the rate wrong and the driver either overpays tax or underpays and owes a penalty. That's why the app needs the exact rate.
Why it's a table and not one number: the rate changed halfway through 2026. An offer driven June 28 uses 72.5¢; one driven July 3 uses 76¢. And every January the IRS picks a new number. So "what's the rate" really means "what's the rate on this date."
The code structure, plainly
Picture a paper table taped to your dash:

FROM          TO            RATE
Jan 1 2026    Jun 30 2026   72.5
Jul 1 2026    Dec 31 2026   76

One row of that table, in JavaScript, is an object — a bundle of labeled values:
{ start: "2026-01-01", end: "2026-06-30", rate: 72.5 }
The whole table is those rows sitting in an array (a numbered list):
[ { row 1 }, { row 2 } ]
Looking up the rate = walk down the list, find the row whose FROM–TO window contains today, read its rate.
The walking-and-finding is one method: .find(). You give .find() a yes/no question to ask about a single row. It asks row 1 the question; if the answer is no, it asks row 2; the instant a row answers yes, .find() hands you that entire row object. Then you read .rate off it.
The yes/no question for one row is just: today is >= row.start AND today is <= row.end. If you store every date as a "2026-06-30"-style string, those >= / <= comparisons work directly, because that date format sorts alphabetically in the same order as calendar time.
If no row matches (you forgot to add 2027's rate someday), .find() gives back undefined — check for that and show \u2014, same as your gas guard.
Your move, in order
1. Re-read the tax section until it clicks. No code yet.
2. Replace current with today as a string: "2026-09-01". You can build it from your date object's pieces (pad month and day to two digits with padStart) or slice it out of date.toISOString().
3. Write the rate table: an array holding two objects, each with start, end, rate.
4. Call .find() on that array with the between-check question to get the matching row.
5. If the result is undefined, show the dash. Otherwise put the row's rate into irs-rate-display via .textContent, formatted how you like ("72.5¢").
6. Test: temporarily set date to new Date("2026-06-15"), confirm you get 72.5, then a July date for 76.
Next: do step 2 — get today as a "YYYY-MM-DD" string and console.log it to confirm it reads 2026-09-01.
*/

const gasMath = () => {
    let x = Number(settings.mileGas.value);
    let y = Number(settings.gasPrice.value);
    let gasResult = document.getElementById("gas-cost-per-mile");

    if (settings.mileGas.value.trim() === "" || settings.gasPrice.value.trim() === "" ||
        !Number.isFinite(x) || !Number.isFinite(y) || x <= 0) {
        gasResult.textContent = "\u2014";
        return;
    }

    gasResult.textContent = "$" + (y / x).toFixed(3)
};


settings.mileGas.addEventListener("input", gasMath);
settings.gasPrice.addEventListener("input", gasMath);


