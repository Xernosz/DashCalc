const THEME_STORAGE_KEY = "dashcalc-theme";
const BROWSER_BAR_COLORS = { night: "#0E0F12", day: "#D5D8DC" };

const savedTheme = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(THEME_STORAGE_KEY));
        return saved && saved.theme === "day" ? "day" : "night";
    } catch {
        return "night";
    }
};

const saveTheme = (theme) => {
    try {
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ v: 1, theme: theme }));
    } catch {
    }
};

const applyTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", BROWSER_BAR_COLORS[theme]);

    for (const button of document.querySelectorAll(".theme-toggle")) {
        button.setAttribute("aria-pressed", String(theme === "day"));
        button.setAttribute("aria-label", theme === "day" ? "Switch to Night" : "Switch to Day");
    }

    document.dispatchEvent(new CustomEvent("themechange", { detail: theme }));
};

const showAppVersion = () => {
    if (typeof APP_VERSION !== "string") return;

    for (const link of document.querySelectorAll(".app-version")) {
        link.textContent = "v" + APP_VERSION;
    }
};

applyTheme(savedTheme());

document.addEventListener("DOMContentLoaded", () => {
    applyTheme(savedTheme());
    showAppVersion();

    for (const button of document.querySelectorAll(".theme-toggle")) {
        button.addEventListener("click", () => {
            const next = document.documentElement.dataset.theme === "day" ? "night" : "day";
            saveTheme(next);
            applyTheme(next);
        });
    }
});
