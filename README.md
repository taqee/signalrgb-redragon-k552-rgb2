# SignalRGB plugin – Redragon K552 RGB-2

A SignalRGB plugin for the **Redragon K552 RGB-2 (Kumara, TKL, 87 keys)**, which uses an EVision controller that the official `EVision_Keyboard_Controller.js` does not recognise.

## Why the official plugin fails

| | |
|---|---|
| USB VID / PID | `0x320F` / `0x5000` |
| HID product string | `RGB Keyboard` (generic, so model detection fails) |
| Lighting endpoint | interface `1`, usage `0x0092`, usage page `0xFF1C`, collection `0x0004` |
| Transport | Output report (`device.write`), 64 bytes. Feature reports are rejected (`HidD_SetFeature: Incorrect function`) |

The official plugin looks the model up by the HID product string. This keyboard reports the generic name `RGB Keyboard`, so it ends up with `Unknown Device ID` and no layout. Forcing another model (e.g. K557 Kala V2) does send data, but several LED indices in those layouts don't exist on the K552 and writing to them makes the firmware reset, so the keyboard disconnects and reconnects in a loop.

## LED layout

Classic EVision matrix (index = column × 8 + row). The bottom-right block (Right Alt, Fn, Menu, Right Ctrl, arrows) and Page Up / Page Down use the same indices as the K557 Kala V2; these were confirmed on hardware with the built-in LED scan. All 87 keys are mapped and the buffer is limited to 128 LEDs.

## Install

1. Download `EVision_Keyboard_Controller.js` from this repo.
2. Put it in `Documents\WhirlwindFX\Plugins\` (open `https://go.signalrgb.com/app/view/userplugins` to jump there). The file name must stay `EVision_Keyboard_Controller.js` so it replaces the CDN copy of the official plugin.
3. Close any Redragon software, fully quit SignalRGB from the tray and start it again.
4. The keyboard shows up as **Redragon K552 RGB-2**.

A SignalRGB update to the official EVision plugin may replace this file. If the keyboard stops working after an update, copy the file back.

## Settings

| Setting | Default | Notes |
|---|---|---|
| Update interval (ms) | 50 | Minimum time between frames |
| Packet delay (ms) | 2 | Pause between packets inside a frame. Raise to 5–10 if the keyboard disconnects |
| Low frame-rate mode | on | 48-byte chunks instead of 56 |
| Transport / Packet length / Framing / Software mode | Output, 64, off, off | Debug options, leave as is |
| Test row / LED scan / Scan range | All / off | Debug tools used to map the layout |

Tested on Windows with SignalRGB 2.5.80.

## Credits

Based on the official `EVision_Keyboard_Controller.js` by WhirlwindFx & Nuonuo.
