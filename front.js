const EXAMPLE_CAR = carFrom({ mpg: "25", gasPrice: "3.40", homeState: "TX", typicalWait: "6", avgSpeed: "25" }, new Date());
const EXAMPLE_OFFER = evaluateOffer(9.5, 4.2, false, EXAMPLE_CAR);
const motionIsOk = !matchMedia("(prefers-reduced-motion: reduce)").matches;

const between = (value, low, high) => Math.min(Math.max(value, low), high);
const progress = (value, start, end) => between((value - start) / (end - start), 0, 1);
const smoothStep = (x) => x * x * (3 - 2 * x);
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const overshoot = (x) => (x <= 0 ? 0 : 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2));

if (!location.hash) {
    history.scrollRestoration = "manual";
    scrollTo(0, 0);
}

const page = document.documentElement;

const EXAMPLE_TEXT = {
    keep: money(EXAMPLE_OFFER.keep),
    hourly: money(EXAMPLE_OFFER.hourly),
    gas: money(EXAMPLE_OFFER.gas),
    wear: money(EXAMPLE_OFFER.wear),
    tax: money(EXAMPLE_OFFER.tax),
    grade: EXAMPLE_OFFER.grade,
    min: Math.round(EXAMPLE_OFFER.minutes) + " min",
    minutes: Math.round(EXAMPLE_OFFER.minutes) + " minutes"
};

for (const spot of document.querySelectorAll("[data-example]")) {
    spot.textContent = EXAMPLE_TEXT[spot.dataset.example];
}

for (const spot of document.querySelectorAll("[data-example-grade]")) {
    spot.dataset.grade = EXAMPLE_OFFER.grade;
}

const drive = document.querySelector(".drive");
const keepNumber = document.getElementById("drive-keep");
const hourNumber = document.getElementById("drive-hourly");
const gradeRing = document.getElementById("drive-ring");
const revealItems = [...document.querySelectorAll("[data-in]")];

let driveTarget = 0;
let driveShown = 0;
let driveIsMoving = false;

if (motionIsOk) page.classList.add("moving");

const ROAD_CAMERA = 340;
const ROAD_FAR = 1840;
const ROAD_FADE_FROM = 600;
const DASH_EVERY = 260;
const DASH_LENGTH = 110;
const DASHES_PER_DRIVE = 24;

const roadSvg = document.getElementById("road");
const roadFade = document.getElementById("road-fade");
const roadLight = document.getElementById("road-light");
const roadDashes = document.getElementById("road-dashes");
const road = { width: 0, height: 0, horizon: 0, plane: 0 };

const roadPoint = (across, depth) => {
    const scale = ROAD_CAMERA / (ROAD_CAMERA + depth);
    const x = road.width / 2 + across * road.plane * scale;
    const y = road.horizon + (road.height - road.horizon) * scale;
    return x.toFixed(1) + " " + y.toFixed(1);
};

const roadStrip = (left, right, near, far) => {
    return "M" + roadPoint(left, near) + "L" + roadPoint(right, near) + "L" + roadPoint(right, far) + "L" + roadPoint(left, far) + "Z";
};

const measureRoad = () => {
    road.width = roadSvg.clientWidth;
    road.height = roadSvg.clientHeight;
    road.horizon = road.height * 0.6;
    road.plane = Math.min(road.width * 1.5, 1100);

    roadSvg.setAttribute("viewBox", "0 0 " + road.width + " " + road.height);
    document.getElementById("road-shoulder").setAttribute("d", roadStrip(-0.5, 0.5, 0, ROAD_FAR));
    document.getElementById("road-lane").setAttribute("d", roadStrip(-0.43, 0.43, 0, ROAD_FAR));
    document.getElementById("road-edges").setAttribute("d", roadStrip(-0.41, -0.4, 0, ROAD_FAR) + roadStrip(0.4, 0.41, 0, ROAD_FAR));

    roadFade.setAttribute("y1", roadPoint(0, ROAD_FAR).split(" ")[1]);
    roadFade.setAttribute("y2", roadPoint(0, ROAD_FADE_FROM).split(" ")[1]);

    roadLight.setAttribute("cx", road.width / 2);
    roadLight.setAttribute("cy", road.height);
    roadLight.setAttribute("rx", road.plane * 0.6);
    roadLight.setAttribute("ry", road.height - Number(roadPoint(0, 440).split(" ")[1]));
};

const paintRoad = (drive) => {
    const moved = (drive * DASHES_PER_DRIVE * DASH_EVERY) % DASH_EVERY;
    let dashes = "";

    for (let near = -moved; near < ROAD_FAR; near += DASH_EVERY) {
        const far = Math.min(near + DASH_LENGTH, ROAD_FAR);
        if (far > 0) dashes += roadStrip(-0.011, 0.011, Math.max(near, 0), far);
    }

    roadDashes.setAttribute("d", dashes);
};

const measureScroll = () => {
    const box = drive.getBoundingClientRect();
    const scrollRoom = page.scrollHeight - innerHeight;
    const tops = motionIsOk ? revealItems.map((item) => item.getBoundingClientRect().top) : [];

    driveTarget = between(-box.top / (box.height - innerHeight), 0, 1);
    page.style.setProperty("--page", (scrollRoom > 0 ? scrollY / scrollRoom : 0).toFixed(4));

    const atBottom = scrollY >= scrollRoom - 2;

    tops.forEach((top, i) => {
        const shown = atBottom ? 1 : between((innerHeight - top) / (innerHeight * 0.42) - (Number(revealItems[i].dataset.in) || 0), 0, 1);
        revealItems[i].style.setProperty("--reveal", shown.toFixed(3));
    });
};

const paintDrive = () => {
    driveShown += (driveTarget - driveShown) * 0.12;
    if (Math.abs(driveTarget - driveShown) < 0.0004) driveShown = driveTarget;

    drive.style.setProperty("--drive", driveShown.toFixed(4));
    paintRoad(driveShown);

    const lostToCosts = EXAMPLE_OFFER.pay - EXAMPLE_OFFER.keep;
    keepNumber.textContent = money(EXAMPLE_OFFER.pay - lostToCosts * progress(driveShown, 0.24, 0.54));

    const landed = progress(driveShown, 0.58, 0.78);
    hourNumber.textContent = money(EXAMPLE_OFFER.hourly * landed);
    gradeRing.setAttribute("stroke-dasharray", (66 * landed).toFixed(1) + " 100");

    if (driveShown !== driveTarget) requestAnimationFrame(paintDrive);
    else driveIsMoving = false;
};

const onScroll = () => {
    measureScroll();
    if (motionIsOk && !driveIsMoving) {
        driveIsMoving = true;
        requestAnimationFrame(paintDrive);
    }
};

const tryForm = document.getElementById("try-form");
const tryPay = document.getElementById("try-pay");
const tryMiles = document.getElementById("try-miles");
const tryGrade = document.getElementById("try-grade");
const tryHourly = document.getElementById("try-hourly");
let tryShownHourly = EXAMPLE_OFFER.hourly;
let tryCountRun = 0;

const countUpTo = (target) => {
    const from = tryShownHourly;
    const run = ++tryCountRun;
    const started = performance.now();

    const step = (now) => {
        if (run !== tryCountRun) return;
        const done = motionIsOk ? progress(now - started, 0, 260) : 1;
        tryShownHourly = from + (target - from) * (1 - Math.pow(1 - done, 3));
        tryHourly.textContent = money(tryShownHourly);
        if (done < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
};

const updateTry = () => {
    const pay = Number.parseFloat(tryPay.value);
    const miles = Number.parseFloat(tryMiles.value);
    if (!(pay >= 0 && miles > 0)) return;

    const offer = evaluateOffer(pay, miles, false, EXAMPLE_CAR);
    countUpTo(offer.hourly);

    if (tryForm.dataset.grade !== offer.grade) {
        tryForm.dataset.grade = offer.grade;
        tryGrade.textContent = offer.grade;
        replayPop(tryGrade);
    }
};

tryForm.addEventListener("submit", (event) => event.preventDefault());
tryPay.addEventListener("input", updateTry);
tryMiles.addEventListener("input", updateTry);

const MAP_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 resolution;
uniform float time;
uniform vec2 shift;
uniform vec3 cameraOrigin;
uniform vec3 cameraForward;
uniform vec3 cameraRight;
uniform vec3 cameraUp;
uniform float focal;
uniform vec2 routePoints[6];
uniform float routePointCount;
uniform float routeDrawn;
uniform float routeShown;
uniform vec2 pickupAt;
uniform vec2 dropoffAt;
uniform float pickupSize;
uniform float dropoffSize;
uniform vec2 carAt;
uniform float carShown;
uniform float day;

const vec2 CELL = vec2(1.3, 1.0);
const float MINOR = 0.1;
const float MAJOR = 0.14;
const vec3 RED = vec3(1.0, 0.19, 0.03);
float pixel;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float fill(float d) { return 1.0 - smoothstep(-pixel, pixel, d); }

vec3 ground(vec2 w) {
  vec2 g = w / CELL;
  vec2 id = floor(g + 0.5);
  vec2 dl = abs(g - id) * CELL;
  float majX = step(mod(id.x, 4.0), 0.5);
  float majZ = step(mod(id.y, 3.0), 0.5);
  float hwX = mix(MINOR, MAJOR, majX);
  float hwZ = mix(MINOR, MAJOR, majZ);
  vec2 cell = floor(g);
  vec2 f = fract(g);
  float hb = hash(cell);
  float cut = hb > 0.5 ? f.x : f.y;
  float split = 0.35 + 0.3 * hash(cell + 7.7);
  vec3 lot = mix(mix(vec3(0.063, 0.071, 0.082), vec3(0.086, 0.094, 0.11), hash(cell + 3.1)), mix(vec3(0.69, 0.71, 0.74), vec3(0.75, 0.77, 0.8), hash(cell + 3.1)), day);
  lot *= mix(0.88 + 0.24 * hash(cell + step(split, cut) + 11.0), 0.95 + 0.1 * hash(cell + step(split, cut) + 11.0), day);
  if (hash(cell + 5.5) < 0.08) lot = mix(vec3(0.047, 0.07, 0.056), vec3(0.6, 0.69, 0.61), day);
  float edge = min(dl.x - hwX, dl.y - hwZ);
  float lotMask = fill(0.035 - edge) * (1.0 - fill(abs(cut - split) * (hb > 0.5 ? CELL.x : CELL.y) - 0.008));
  vec3 col = mix(mix(vec3(0.04, 0.043, 0.053), vec3(0.62, 0.64, 0.67), day), lot, lotMask);
  vec3 minorC = mix(vec3(0.114, 0.125, 0.145), vec3(0.86, 0.87, 0.885), day);
  vec3 majorC = mix(vec3(0.15, 0.165, 0.192), vec3(0.93, 0.935, 0.945), day);
  float sx = fill(dl.x - hwX);
  float sz = fill(dl.y - hwZ);
  col = mix(col, mix(minorC, majorC, majX), sx);
  col = mix(col, mix(minorC, majorC, majZ), sz);
  float dashX = majX * fill(dl.x - 0.006) * step(0.5, fract(w.y * 2.5)) * (1.0 - sz);
  float dashZ = majZ * fill(dl.y - 0.006) * step(0.5, fract(w.x * 2.5)) * (1.0 - sx);
  col = mix(col, mix(vec3(0.3, 0.27, 0.2), vec3(0.95, 0.75, 0.15), day), max(dashX, dashZ) * 0.55);
  float il = length((g - id) * CELL);
  col += vec3(1.0, 0.62, 0.25) * 0.08 * exp(-il * il * 16.0) * step(0.45, hash(id + 2.0)) * (1.0 - day);
  return col;
}

void traffic(inout vec3 col, vec2 w) {
  vec2 g = w / CELL;
  vec2 id = floor(g + 0.5);
  float majX = step(mod(id.x, 4.0), 0.5);
  float majZ = step(mod(id.y, 3.0), 0.5);
  for (int axis = 0; axis < 2; axis++) {
    float major = axis == 0 ? majX : majZ;
    float line = axis == 0 ? id.x * CELL.x : id.y * CELL.y;
    float idx = axis == 0 ? id.x : id.y + 100.0;
    float hw = mix(MINOR, MAJOR, major);
    float across = (axis == 0 ? w.x : w.y) - line;
    float along = axis == 0 ? w.y : w.x;
    float block = axis == 0 ? CELL.y : CELL.x;
    if (abs(across) > hw) continue;
    for (int lane = 0; lane < 2; lane++) {
      float dir = lane == 0 ? 1.0 : -1.0;
      float seed = hash(vec2(idx, float(lane) + 0.5));
      if (seed < mix(0.45, 0.12, major)) continue;
      float spacing = block * (2.0 + floor(seed * 3.0));
      float speed = (0.3 + seed * 0.25) * mix(0.8, 1.15, major);
      float om = 6.2831853 / block;
      float ph = time * speed;
      float travel = ph - 0.34 * sin(om * ph) / om;
      float vel = 1.0 - 0.34 * cos(om * ph);
      float a = along * dir - travel - block * floor(seed * 7.0);
      float cz = (fract(a / spacing + 0.5) - 0.5) * spacing;
      float lat = across - dir * hw * 0.42;
      float tailLen = 0.05 + vel * 0.28;
      float behind = -cz;
      float head = exp(-(lat * lat + cz * cz) / 0.0005);
      float tail = step(0.0, behind) * exp(-behind / tailLen * 2.2) * (1.0 - smoothstep(0.0, tailLen * 1.6, behind)) * exp(-lat * lat / 0.00018);
      float amount = (head * 0.85 + tail * 0.5) * mix(0.55, 0.9, major);
      vec3 nightTint = dir > 0.0 ? vec3(1.0, 0.84, 0.62) : vec3(1.0, 0.22, 0.07);
      vec3 dayTint = dir > 0.0 ? vec3(0.25, 0.27, 0.3) : vec3(0.78, 0.16, 0.07);
      col = mix(col + nightTint * amount, mix(col, dayTint, min(amount, 1.0) * 0.85), day);
    }
  }
}

void route(inout vec3 col, vec2 w) {
  if (routeShown < 0.002) return;
  float total = 0.0;
  for (int i = 0; i < 5; i++) {
    if (float(i) >= routePointCount - 1.0) break;
    total += length(routePoints[i + 1] - routePoints[i]);
  }
  float best = 1000.0;
  float along = 0.0;
  float acc = 0.0;
  for (int i = 0; i < 5; i++) {
    if (float(i) >= routePointCount - 1.0) break;
    vec2 a = routePoints[i];
    vec2 ba = routePoints[i + 1] - a;
    float len = length(ba);
    float hh = clamp(dot(w - a, ba) / (len * len), 0.0, 1.0);
    float d = length(w - a - ba * hh);
    if (d < best) { best = d; along = acc + hh * len; }
    acc += len;
  }
  float on = (1.0 - smoothstep(routeDrawn * total - 0.03, routeDrawn * total + 0.03, along)) * routeShown;
  float glow = (exp(-best * 9.0) * 0.26 + exp(-best * 28.0) * 0.5) * on;
  col = mix(col + RED * glow, mix(col, RED, min(glow, 1.0) * 0.6), day);
  col = mix(col, RED, fill(best - 0.036) * on);
  col = mix(col, vec3(1.0, 0.74, 0.64), fill(best - 0.01) * on);
}

void pin(inout vec3 col, vec2 w, vec2 at, float s, vec3 outer, vec3 inner) {
  if (s < 0.002) return;
  float d = length(w - at);
  float a = min(s, 1.0);
  float ring = fract(time * 0.65);
  col = mix(col, outer, fill(abs(d - (0.09 + ring * 0.24)) - 0.012) * (1.0 - ring) * 0.7 * a);
  col += outer * exp(-d * 11.0) * 0.22 * a * (1.0 - day);
  col = mix(col, outer, fill(d - 0.09 * s));
  col = mix(col, inner, fill(d - 0.036 * s));
}

void car(inout vec3 col, vec2 w) {
  if (carShown < 0.002) return;
  float d = length(w - carAt);
  vec3 lit = RED * exp(-d * 7.0) * 0.45 * (1.0 - day * 0.7);
  lit = mix(lit, RED, fill(abs(d - 0.07) - 0.009));
  lit = mix(lit, vec3(1.0, 0.97, 0.94), fill(d - 0.04));
  col = mix(col, col + lit, carShown);
  col = mix(col, lit + col * 0.2, fill(d - 0.04) * carShown);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * resolution) / resolution.y - shift;
  vec3 rd = normalize(cameraForward * focal + uv.x * cameraRight + uv.y * cameraUp);
  vec3 fog = mix(vec3(0.055, 0.059, 0.071), vec3(0.835, 0.847, 0.863), day);
  vec3 col = fog;
  if (rd.y < -0.001) {
    float th = -cameraOrigin.y / rd.y;
    vec2 w = (cameraOrigin + rd * th).xz;
    pixel = th / (focal * resolution.y) * (0.6 + 0.6 / max(-rd.y, 0.12));
    col = ground(w);
    traffic(col, w);
    route(col, w);
    pin(col, w, pickupAt, pickupSize, RED, vec3(1.0));
    pin(col, w, dropoffAt, dropoffSize, mix(vec3(0.95, 0.94, 0.92), vec3(0.12, 0.13, 0.15), day), fog);
    car(col, w);
    col = mix(col, fog, smoothstep(9.0, 28.0, th));
  }
  col += mix(vec3(0.5, 0.07, 0.02) * 0.14, vec3(1.0, 0.8, 0.6) * 0.05, day) * exp(-abs(rd.y) * 12.0);
  vec2 q = gl_FragCoord.xy / resolution;
  col *= 1.0 - mix(0.35, 0.12, day) * pow(length(q - 0.5) * 1.2, 2.0);
  col += (hash(gl_FragCoord.xy + fract(time * 7.0) * 91.0) - 0.5) * mix(0.03, 0.015, day);
  gl_FragColor = vec4(col, 1.0);
}
`;

const MAP_UNIFORMS = ["resolution", "time", "shift", "cameraOrigin", "cameraForward", "cameraRight", "cameraUp", "focal", "routePoints",
    "routePointCount", "routeDrawn", "routeShown", "pickupAt", "dropoffAt", "pickupSize", "dropoffSize", "carAt", "carShown", "day"];

const mapCanvas = document.getElementById("map");
const heroSection = mapCanvas.parentElement;
const rider = heroSection.querySelector(".rider");
const offerChip = rider.querySelector(".chip--offer");
const verdictChip = rider.querySelector(".chip--verdict");
const chipOffer = document.getElementById("chip-offer");
const chipGrade = document.getElementById("chip-grade");
const chipHourly = document.getElementById("chip-hourly");
const pauseButton = document.getElementById("map-pause");
const gl = mapCanvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });

const blockAt = (column, row) => [column * 1.3, row];

const DELIVERY_ROUTES = [
    { stops: [blockAt(-1, 1), blockAt(0, 1), blockAt(0, -1), blockAt(1, -1)], pay: 9.5, miles: 4.2 },
    { stops: [blockAt(1, 1), blockAt(1, 0), blockAt(-1, 0), blockAt(-1, -2), blockAt(0, -2)], pay: 6.25, miles: 5.8 },
    { stops: [blockAt(-1, -1), blockAt(1, -1), blockAt(1, 0)], pay: 12.5, miles: 3.5 }
];

for (const route of DELIVERY_ROUTES) {
    const offer = evaluateOffer(route.pay, route.miles, false, EXAMPLE_CAR);
    route.grade = offer.grade;
    route.hourly = offer.hourly;
    route.legs = [];
    route.length = 0;

    for (let i = 0; i < route.stops.length - 1; i++) {
        const leg = Math.hypot(route.stops[i + 1][0] - route.stops[i][0], route.stops[i + 1][1] - route.stops[i][1]);
        route.legs.push(leg);
        route.length += leg;
    }

    const xs = route.stops.map((stop) => stop[0]);
    const zs = route.stops.map((stop) => stop[1]);
    route.center = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2];
    route.radius = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) / 2;
    route.flat = new Float32Array(12);
    route.stops.forEach((stop, i) => {
        route.flat[i * 2] = stop[0];
        route.flat[i * 2 + 1] = stop[1];
    });
}

const pointAlong = (route, distance) => {
    let left = between(distance, 0, route.length);

    for (let i = 0; i < route.legs.length; i++) {
        if (left <= route.legs[i] || i === route.legs.length - 1) {
            const share = Math.min(left / route.legs[i], 1);
            const from = route.stops[i];
            const to = route.stops[i + 1];
            return [from[0] + (to[0] - from[0]) * share, from[1] + (to[1] - from[1]) * share];
        }
        left -= route.legs[i];
    }
};

const cameraLooking = (targetX, targetZ, turn, tilt, distance) => {
    const flat = Math.cos(tilt);
    const forward = [Math.sin(turn) * flat, -Math.sin(tilt), Math.cos(turn) * flat];
    const origin = [targetX - forward[0] * distance, Math.sin(tilt) * distance, targetZ - forward[2] * distance];
    const sideLength = Math.hypot(forward[2], forward[0]);
    const right = [-forward[2] / sideLength, 0, forward[0] / sideLength];
    const up = [
        right[1] * forward[2] - right[2] * forward[1],
        right[2] * forward[0] - right[0] * forward[2],
        right[0] * forward[1] - right[1] * forward[0]
    ];
    return { origin, forward, right, up };
};

const toScreen = (camera, point, focal, shift, width, height) => {
    const toward = [point[0] - camera.origin[0], -camera.origin[1], point[1] - camera.origin[2]];
    const dot = (axis) => toward[0] * axis[0] + toward[1] * axis[1] + toward[2] * axis[2];
    const depth = dot(camera.forward);
    return [
        width / 2 + (dot(camera.right) / depth * focal + shift[0]) * height,
        height / 2 - (dot(camera.up) / depth * focal + shift[1]) * height
    ];
};

const compileShader = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) && !gl.isContextLost()) console.error(gl.getShaderInfoLog(shader));
    return shader;
};

const buildMap = () => {
    const program = gl.createProgram();
    gl.attachShader(program, compileShader(gl.VERTEX_SHADER, "attribute vec2 corner;void main(){gl_Position=vec4(corner,0.,1.);}"));
    gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, MAP_SHADER));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const corner = gl.getAttribLocation(program, "corner");
    gl.enableVertexAttribArray(corner);
    gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);
    gl.viewport(0, 0, mapCanvas.width, mapCanvas.height);

    const slot = {};
    for (const name of MAP_UNIFORMS) {
        slot[name] = gl.getUniformLocation(program, name);
    }
    return slot;
};

if (gl) {
    const LOOP_MS = 7600;
    const camera = { x: DELIVERY_ROUTES[0].center[0], z: DELIVERY_ROUTES[0].center[1], fit: DELIVERY_ROUTES[0].radius };
    let slot = null;
    let routeShown = -1;
    let pointerAim = 0;
    let pointerNow = 0;
    let dayNow = page.dataset.theme === "day" ? 1 : 0;
    let lastFrame = 0;
    let loopStart = null;
    let mapVisible = true;
    let mapPaused = false;
    let pausedAt = 0;
    let pausedFor = 0;
    let chipHalfWidth = 90;

    heroSection.addEventListener("pointermove", (event) => {
        const box = heroSection.getBoundingClientRect();
        pointerAim = (event.clientX - box.left) / box.width - 0.5;
    }, { passive: true });

    const sizeMap = () => {
        const sharpness = Math.min(devicePixelRatio || 1, 2);
        const width = Math.round(mapCanvas.clientWidth * sharpness);
        const height = Math.round(mapCanvas.clientHeight * sharpness);
        if (width === mapCanvas.width && height === mapCanvas.height) return;

        mapCanvas.width = width;
        mapCanvas.height = height;
        gl.viewport(0, 0, width, height);
    };

    const showRoute = (route) => {
        chipOffer.textContent = money(route.pay) + " · " + route.miles + " mi";
        chipGrade.textContent = route.grade;
        chipHourly.textContent = money(route.hourly);
        verdictChip.dataset.grade = route.grade;
        chipHalfWidth = Math.max(offerChip.offsetWidth, verdictChip.offsetWidth) / 2;
    };

    const drawMap = (frameTime) => {
        if (slot === null) return;
        const now = frameTime - pausedFor;
        if (loopStart === null) {
            loopStart = now;
            lastFrame = now;
        }
        const seconds = Math.min((now - lastFrame) / 1000, 0.1);
        lastFrame = now;

        const elapsed = motionIsOk ? now - loopStart : 5600;
        const which = Math.floor(elapsed / LOOP_MS) % DELIVERY_ROUTES.length;
        const beat = elapsed % LOOP_MS;
        const route = DELIVERY_ROUTES[which];
        if (which !== routeShown) {
            routeShown = which;
            showRoute(route);
        }

        const aimAt = beat > 6700 ? DELIVERY_ROUTES[(which + 1) % DELIVERY_ROUTES.length] : route;
        const follow = motionIsOk ? 1 - Math.exp(-seconds * 1.4) : 1;
        camera.x += (aimAt.center[0] - camera.x) * follow;
        camera.z += (aimAt.center[1] - camera.z) * follow;
        camera.fit += (aimAt.radius - camera.fit) * follow;
        pointerNow += (pointerAim - pointerNow) * 0.05;
        dayNow += ((page.dataset.theme === "day" ? 1 : 0) - dayNow) * (motionIsOk ? 0.08 : 1);

        const fade = 1 - smoothStep(progress(beat, 6900, 7500));
        const drawn = easeInOut(progress(beat, 700, 4500));
        const carAt = pointAlong(route, drawn * route.length);

        const width = mapCanvas.clientWidth;
        const height = mapCanvas.clientHeight;
        const tall = height > width;
        const zoomOut = 1 + Math.min(scrollY / innerHeight, 1) * 0.35;
        const distance = (tall ? Math.max(9, camera.fit * 5.2) : Math.max(6.6, camera.fit * 3.3)) * zoomOut;
        const view = cameraLooking(camera.x, camera.z, -0.55 + Math.sin(now / 9000) * 0.07 + pointerNow * 0.25, 0.92, distance);
        const shift = tall ? [0, 0.16] : [0.3, 0.04];
        const focal = 1.1;

        gl.uniform2f(slot.resolution, mapCanvas.width, mapCanvas.height);
        gl.uniform1f(slot.time, now / 1000);
        gl.uniform2f(slot.shift, shift[0], shift[1]);
        gl.uniform3fv(slot.cameraOrigin, view.origin);
        gl.uniform3fv(slot.cameraForward, view.forward);
        gl.uniform3fv(slot.cameraRight, view.right);
        gl.uniform3fv(slot.cameraUp, view.up);
        gl.uniform1f(slot.focal, focal);
        gl.uniform2fv(slot.routePoints, route.flat);
        gl.uniform1f(slot.routePointCount, route.stops.length);
        gl.uniform1f(slot.routeDrawn, drawn);
        gl.uniform1f(slot.routeShown, smoothStep(progress(beat, 0, 400)) * fade);
        gl.uniform2fv(slot.pickupAt, route.stops[0]);
        gl.uniform2fv(slot.dropoffAt, route.stops[route.stops.length - 1]);
        gl.uniform1f(slot.pickupSize, overshoot(progress(beat, 0, 480)) * fade);
        gl.uniform1f(slot.dropoffSize, overshoot(progress(beat, 4500, 4980)) * fade);
        gl.uniform2fv(slot.carAt, carAt);
        gl.uniform1f(slot.carShown, smoothStep(progress(beat, 150, 600)) * fade);
        gl.uniform1f(slot.day, dayNow);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        mapCanvas.classList.add("is-on");

        const spot = toScreen(view, carAt, focal, shift, width, height);
        const x = between(spot[0], chipHalfWidth + 12, width - chipHalfWidth - 12);
        rider.style.transform = "translate3d(" + x.toFixed(1) + "px," + spot[1].toFixed(1) + "px,0)";
        offerChip.classList.toggle("is-on", motionIsOk && beat > 200 && beat < 4500);
        verdictChip.classList.toggle("is-on", beat >= 4500 && beat < 6800);

        if (mapVisible && motionIsOk && !mapPaused) requestAnimationFrame(drawMap);
    };

    const startMap = () => {
        sizeMap();
        slot = buildMap();
        requestAnimationFrame(drawMap);
    };

    new IntersectionObserver((entries) => {
        const wasVisible = mapVisible;
        mapVisible = entries[0].isIntersecting;
        if (mapVisible && !wasVisible && motionIsOk && !mapPaused) {
            requestAnimationFrame(drawMap);
        }
    }).observe(mapCanvas);

    pauseButton.hidden = !motionIsOk;
    pauseButton.addEventListener("click", () => {
        mapPaused = !mapPaused;
        pauseButton.setAttribute("aria-pressed", String(mapPaused));
        pauseButton.setAttribute("aria-label", mapPaused ? "Play the map" : "Pause the map");

        if (mapPaused) {
            pausedAt = performance.now();
        } else {
            pausedFor += performance.now() - pausedAt;
            requestAnimationFrame(drawMap);
        }
    });

    mapCanvas.addEventListener("webglcontextlost", (event) => {
        event.preventDefault();
        slot = null;
        mapCanvas.classList.remove("is-on");
    });
    mapCanvas.addEventListener("webglcontextrestored", startMap);

    addEventListener("resize", () => {
        sizeMap();
        if (!motionIsOk) requestAnimationFrame(drawMap);
    });
    document.addEventListener("themechange", () => {
        if (!motionIsOk) requestAnimationFrame(drawMap);
    });

    startMap();
}

const SEEN_NEWS_KEY = "dashcalc-seen-news";
const newsDialog = document.getElementById("news");
const newsOpenButton = document.getElementById("news-open");

const openNews = () => {
    if (!newsDialog.open) newsDialog.showModal();
};

newsOpenButton.addEventListener("click", openNews);
newsDialog.addEventListener("close", () => {
    writeStorage(SEEN_NEWS_KEY, "1");
    delete newsOpenButton.dataset.unread;
});

if (readStorage(SEEN_NEWS_KEY) === null) {
    newsOpenButton.dataset.unread = "";
    setTimeout(openNews, 1200);
}

addEventListener("scroll", onScroll, { passive: true });
addEventListener("resize", () => {
    measureRoad();
    paintRoad(driveShown);
    onScroll();
});
measureRoad();
paintRoad(motionIsOk ? 0 : 1);
onScroll();
updateTry();
