// === YOUR OpenWeatherMap key ===
const API_KEY = "edf4d9eb2106597d03c969d275c9a7bc";  // replace if you regenerate

// === Element references ===
const form          = document.getElementById("weatherForm");
const cityInput     = document.getElementById("cityInput");
const useLocBtn     = document.getElementById("useLoc");
const loadingMsg    = document.getElementById("loadingMsg");
const errorMsg      = document.getElementById("errorMsg");
const resultBox     = document.getElementById("result");
const cityNameEl    = document.getElementById("cityName");
const tempEl        = document.getElementById("temperature");
const descEl        = document.getElementById("description");
const iconEl        = document.getElementById("icon");
const forecastBox   = document.getElementById("forecast");
const forecastList  = document.getElementById("forecastList");

// === Small helpers ===
const toggleInputs = disabled => {
  cityInput.disabled = disabled;
  useLocBtn.disabled = disabled;
  form.querySelector("button").disabled = disabled;
};

const showLoading = () => {
  loadingMsg.classList.remove("hidden");
  toggleInputs(true);
};

const hideLoading = () => {
  loadingMsg.classList.add("hidden");
  toggleInputs(false);
};

const clearError = () => {
  errorMsg.textContent = "";
  errorMsg.classList.add("hidden");
};

const showError = msg => {
  hideLoading();
  errorMsg.textContent = msg;
  errorMsg.classList.remove("hidden");
  // hide old results / forecast
  resultBox.classList.remove("show");
  forecastBox.classList.remove("show");
  resultBox.classList.add("hidden");
  forecastBox.classList.add("hidden");
  forecastList.innerHTML = "";
};

// date helper for forecast rows
const formatDate = d =>
  d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

// === Fetch wrapper with loading + error handling ===
const fetchWeather = async url => {
  showLoading();
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Unable to fetch weather");
    }
    return await res.json();
  } finally {
    hideLoading();
  }
};

// === Populate current weather card ===
const showWeather = data => {
  clearError();
  resultBox.classList.remove("hidden");
  resultBox.classList.add("card", "show");

  cityNameEl.textContent = `${data.name}, ${data.sys.country}`;
  tempEl.textContent     = `${Math.round(data.main.temp)}°C`;
  descEl.textContent     = data.weather[0].description;
  iconEl.src             = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
  iconEl.alt             = data.weather[0].description;

  localStorage.setItem("lastCity", data.name);   // remember last city
};

// === Build & display 5‑day forecast ===
const showForecast = async url => {
  try {
    const data = await fetchWeather(url);

    // grab one entry (noon) per day, first 5
    const daily = data.list.filter(i => i.dt_txt.includes("12:00:00")).slice(0, 5);

    forecastList.innerHTML = "";
    daily.forEach(item => {
      const date = new Date(item.dt_txt);
      const temp = Math.round(item.main.temp);
      const desc = item.weather[0].description;
      const iconCode = item.weather[0].icon;

      forecastList.insertAdjacentHTML(
        "beforeend",
        `<div>
           <strong>${formatDate(date)}</strong> :
           ${temp}°C,
           ${desc}
           <img src="https://openweathermap.org/img/wn/${iconCode}.png" alt="${desc}">
         </div>`
      );
    });

    forecastBox.classList.remove("hidden");
    forecastBox.classList.add("card", "show");
  } catch (err) {
    console.error(err);          // keep current weather but log forecast issue
  }
};

// === Fetch helpers (city / coords) ===
const fetchByCity = async city => {
  const base = "https://api.openweathermap.org/data/2.5";
  const currentURL  = `${base}/weather?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`;
  const forecastURL = `${base}/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`;

  try {
    const current = await fetchWeather(currentURL);
    showWeather(current);
    await showForecast(forecastURL);
  } catch (err) {
    showError(err.message);
  }
};

const fetchByCoords = async (lat, lon) => {
  const base = "https://api.openweathermap.org/data/2.5";
  const currentURL  = `${base}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
  const forecastURL = `${base}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;

  try {
    const current = await fetchWeather(currentURL);
    showWeather(current);
    await showForecast(forecastURL);
  } catch (err) {
    showError(err.message);
  }
};

// === Event listeners ===
form.addEventListener("submit", e => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (city) fetchByCity(city);
});

useLocBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    showError("Geolocation not supported in this browser.");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => fetchByCoords(pos.coords.latitude, pos.coords.longitude),
    ()  => showError("Permission denied or location unavailable.")
  );
});

// === Auto‑load last searched city on page load ===
window.addEventListener("load", () => {
  const lastCity = localStorage.getItem("lastCity");
  if (lastCity) {
    cityInput.value = lastCity;
    fetchByCity(lastCity);
  }
});
