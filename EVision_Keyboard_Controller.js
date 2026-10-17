// Custom SignalRGB plugin for Redragon K552 RGB-2 (EVision 320F:5000, product string "RGB Keyboard")
// Based on the official EVision_Keyboard_Controller.js, with selectable transport for debugging.
export function Name() { return "Redragon K552 RGB-2"; }
export function VendorId() { return 0x320F; }
export function ProductId() { return [0x5000]; }
export function Publisher() { return "Taqi Alghanimi (based on WhirlwindFx & Nuonuo EVision plugin)"; }
export function Size() { return [17, 6]; }
export function DeviceType() { return "keyboard"; }
export function Validate(endpoint) { return endpoint.interface === 1; }
export function ImageUrl() { return "https://assets.signalrgb.com/devices/brands/redragon/keyboards/k580.png"; }
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
transport:readonly
packetLength:readonly
framing:readonly
softwareMode:readonly
lowFPS:readonly
updateInterval:readonly
packetDelay:readonly
testRow:readonly
ledScan:readonly
scanRange:readonly
*/
export function ControllableParameters() {
	return [
		{property:"shutdownColor", group:"lighting", label:"Shutdown Color", min:"0", max:"360", type:"color", default:"#000000"},
		{property:"LightingMode", group:"lighting", label:"Lighting Mode", type:"combobox", values:["Canvas", "Forced"], default:"Canvas"},
		{property:"forcedColor", group:"lighting", label:"Forced Color", min:"0", max:"360", type:"color", default:"#009bde"},
		{property:"transport", group:"", label:"Transport", description:"How packets are sent to the keyboard", type:"combobox", values:["Output (write)", "Feature (send_report)"], default:"Output (write)"},
		{property:"packetLength", group:"", label:"Packet Length", type:"combobox", values:["64", "65"], default:"64"},
		{property:"framing", group:"", label:"Begin/End framing", description:"Send begin (0x01) / end (0x02) commands around each frame", type:"boolean", default:false},
		{property:"softwareMode", group:"", label:"Software mode on init", type:"boolean", default:false},
		{property:"lowFPS", group:"lighting", label:"Low frame-rate mode", type:"boolean", default:true},
		{property:"updateInterval", group:"lighting", label:"Update interval (ms)", description:"Minimum time between frames. Raise it if the keyboard disconnects", type:"combobox", values:["50", "100", "150", "250", "500", "1000"], default:"50"},
		{property:"packetDelay", group:"lighting", label:"Packet delay (ms)", description:"Pause between packets inside one frame. Raise it if the keyboard disconnects", type:"combobox", values:["2", "5", "10", "15", "20", "30"], default:"2"},
		{property:"testRow", group:"lighting", label:"Test row", description:"Debug: only light one keyboard row, others black", type:"combobox", values:["All", "Row 1 (Esc/F-keys)", "Row 2 (Numbers)", "Row 3 (Tab/QWERTY)", "Row 4 (Caps/ASDF)", "Row 5 (Shift/ZXCV)", "Row 6 (Ctrl/Space)"], default:"All"},
		{property:"ledScan", group:"lighting", label:"LED scan (debug)", description:"Lights one unmapped LED index at a time (every 2s) and prints it in the console", type:"boolean", default:false},
		{property:"scanRange", group:"lighting", label:"Scan range", type:"combobox", values:["Unused 0-127", "128-143", "144-159", "160-175"], default:"128-143"},
	];
}

// The keyboard's LED buffer: indices 0..127 (16 columns x 8 rows). Writing past it crashes the firmware.
const MAX_LEDS = 128;

// ---------- K552 layout (classic EVision matrix: index = column*8 + row) ----------
// Bottom-right block + PgUp/PgDn follow the K557 Kala V2 indices (confirmed by scan: 77, 101, 117, 125)
const vLedNames = [
	"Esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "Print Screen", "Scroll Lock", "Pause Break",
	"`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace", "Insert", "Home", "Page Up",
	"Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\", "Del", "End", "Page Down",
	"CapsLock", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter",
	"Left Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Right Shift", "Up Arrow",
	"Left Ctrl", "Left Win", "Left Alt", "Space", "Right Alt", "Fn", "Menu", "Right Ctrl", "Left Arrow", "Down Arrow", "Right Arrow",
];
const vLeds = [
	0,     8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96,      104, 112, 120,
	1,  9, 17, 25, 33, 41, 49, 57, 65, 73, 81, 89, 97, 105,    113, 121, 115,
	2, 10, 18, 26, 34, 42, 50, 58, 66, 74, 82, 90, 98, 106,    114, 122, 123,
	3, 11, 19, 27, 35, 43, 51, 59, 67, 75, 83, 91,     107,
	4,     20, 28, 36, 44, 52, 60, 68, 76, 84, 92,     108,         116,
	5, 13, 21,             29,             77, 85, 93, 101,    109, 117, 125,
];
const vLedPositions = [
	[0, 0],         [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [10, 0], [11, 0], [12, 0], [13, 0],   [14, 0], [15, 0], [16, 0],
	[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1], [13, 1],   [14, 1], [15, 1], [16, 1],
	[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2], [13, 2],   [14, 2], [15, 2], [16, 2],
	[0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],          [13, 3],
	[0, 4],         [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4],          [13, 4],            [15, 4],
	[0, 5], [1, 5], [2, 5],                         [6, 5],                         [10, 5], [11, 5], [12, 5], [13, 5],   [14, 5], [15, 5], [16, 5],
];

// Indices not used by the layout above, for LED scan
const scanIndices = [];
for (let i = 0; i < MAX_LEDS; i++) {
	if (!vLeds.includes(i)) { scanIndices.push(i); }
}

// ---------- lifecycle ----------
export function Initialize() {
	device.setName("Redragon K552 RGB-2");
	device.setSize([17, 6]);
	device.setControllableLeds(vLedNames, vLedPositions);

	selectEndpoint();

	if (softwareMode) {
		device.log("Sending software-mode packet");
		if (framing) { sendCommand(0x01, []); }
		sendCommand(0x0B, [0x30, 0x50, 0x01]);
		if (framing) { sendCommand(0x02, []); }
	}
}

let lastFrameTime = 0;
let lastFrameKey = "";
let lastForceTime = 0;
let scanPos = 0;
let scanLastStep = 0;

export function Render() {
	const now = Date.now();
	if (now - lastFrameTime < parseInt(updateInterval)) { return; }
	lastFrameTime = now;

	if (ledScan) {
		renderScan(now);
		return;
	}

	sendColors();
}

export function Shutdown(SystemSuspending) {
	sendColors(SystemSuspending ? "#000000" : shutdownColor);
}

// ---------- helpers ----------
function selectEndpoint() {
	const eps = device.getHidEndpoints();
	device.log("Endpoints: " + JSON.stringify(eps));

	for (const ep of eps) {
		if (ep.interface === 1 && ep.usage_page === 0xFF1C) {
			device.set_endpoint(ep.interface, ep.usage, ep.usage_page, ep.collection);
			device.log("Using endpoint: " + JSON.stringify(ep));
			return;
		}
	}
	device.log("Vendor endpoint 0xFF1C not found!");
}

let lastTransportLogged = "";

function sendRaw(packet) {
	const len = parseInt(packetLength);
	while (packet.length < len) { packet.push(0x00); }

	const mode = transport + "/" + len + "/" + framing;
	if (mode !== lastTransportLogged) {
		device.log("Transport: " + mode);
		lastTransportLogged = mode;
	}

	if (transport === "Feature (send_report)") {
		device.send_report(packet, len);
	} else {
		device.write(packet, len);
	}
}

// Packet: [0x04, chkLo, chkHi, cmd, size, offLo, offHi, 0x00, data...]
// Checksum = sum of all bytes from index 3 onward.
function sendCommand(cmd, data, offset = 0) {
	const body = [cmd, data.length, offset & 0xFF, (offset >> 8) & 0xFF, 0x00].concat(data);
	const sum = body.reduce((a, b) => a + b, 0) & 0xFFFF;
	sendRaw([0x04, sum & 0xFF, (sum >> 8) & 0xFF].concat(body));
}

let lastScanRange = "";

function getScanList() {
	if (scanRange === "Unused 0-127") { return scanIndices; }
	const [from, to] = scanRange.split("-").map(Number);
	const list = [];
	for (let i = from; i <= to; i++) { list.push(i); }
	return list;
}

function renderScan(now) {
	const list = getScanList();

	if (scanRange !== lastScanRange) {
		lastScanRange = scanRange;
		scanPos = -1;
		scanLastStep = 0;
	}

	if (now - scanLastStep >= 2000) {
		scanLastStep = now;
		scanPos = (scanPos + 1) % list.length;
		device.log("SCAN index " + list[scanPos] + "  (" + (scanPos + 1) + "/" + list.length + ")");
	}

	const idx = list[scanPos];
	// Buffer only as long as needed for this index
	const RGBData = new Array(Math.max(MAX_LEDS, idx + 1) * 3).fill(0);
	RGBData[idx * 3] = 255;
	RGBData[idx * 3 + 1] = 255;
	RGBData[idx * 3 + 2] = 255;

	writeFrame(RGBData);
}

function sendColors(overrideColor) {
	const RGBData = new Array(MAX_LEDS * 3).fill(0);
	const onlyRow = testRow === "All" ? -1 : parseInt(testRow.split(" ")[1]) - 1;

	for (let i = 0; i < vLeds.length; i++) {
		const [x, y] = vLedPositions[i];
		let color;

		if (!overrideColor && onlyRow >= 0 && y !== onlyRow) {
			color = [0, 0, 0];
		} else if (overrideColor) {
			color = hexToRgb(overrideColor);
		} else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		} else {
			color = device.color(x, y);
		}

		RGBData[vLeds[i] * 3]     = color[0];
		RGBData[vLeds[i] * 3 + 1] = color[1];
		RGBData[vLeds[i] * 3 + 2] = color[2];
	}

	// Skip unchanged frames (but resend at least every 300 ms: the firmware falls back to its own effect after ~1 s without data)
	const key = RGBData.join(",");
	const now = Date.now();
	if (!overrideColor && key === lastFrameKey && now - lastForceTime < 300) { return; }
	lastFrameKey = key;
	lastForceTime = now;

	writeFrame(RGBData);
}

function writeFrame(RGBData) {
	const chunk = lowFPS ? 48 : 56;
	const pause = parseInt(packetDelay);

	if (framing) { sendCommand(0x01, []); }

	for (let offset = 0; offset < RGBData.length; offset += chunk) {
		sendCommand(0x12, RGBData.slice(offset, offset + chunk), offset);
		device.pause(pause);
	}

	if (framing) { device.pause(pause); sendCommand(0x02, []); }
}

function hexToRgb(hex) {
	const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)];
}
