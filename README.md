# NEW : Available UI Versions

![screenshot](https://raw.githubusercontent.com/dodemodexter/WiFi-remote-for-Bestway-Lay-Z-SPA/master/Code/Screenshots/Screen02.png)

### 🔵 Modern UI (v2 - Full Redesign)
Location: `/Code/data_v2ui/`  
Maintained by @dodemodexter  
✔ Full multilingual support (EN, FR, DE, IT, ES, PT)  
✔ Responsive design  
✔ UI theming / clarity  
✔ .json-based configuration  
✔ Compatible with original firmware
⚠ Slightly heavier than original version — not recommended on low-memory ESP.

# 🌐 External WebSocket - Remote Connection

## ✨ New Feature: External WebSocket Connection

This feature allows you to connect to your Lay-Z-Spa module **from outside your local network**, providing real-time access even when you're away from home.

### 🔧 How it Works

The system uses an intelligent connection strategy with **automatic fallback**:

1. **Local WebSocket** → Direct connection on your local network  
2. **External WebSocket** → Connection from outside (via your public IP)
3. **HTTP Polling** → Backup mode with periodic refresh

**✅ No code modification required** - Everything is automatic!

### 📋 Prerequisites

- Lay-Z-Spa ESP module configured and functional
- Access to your router's administration interface
- Public IP address (provided by your ISP)

### ⚙️ Network Configuration

#### 1. Assign a Fixed IP to your ESP

**In your router interface:**
1. Go to **DHCP** → **Address Reservation**
2. Find your ESP (usually "ESP_XXXXXX")
3. **Reserve a fixed IP** (e.g.: `192.168.1.100` or `192.168.0.41`)

**Or configure static IP directly on the ESP:**
- **Connectivity** tab → **Static IP**
- Check "Enable Static IP"
- Set an IP within your network range

#### 2. Port Forwarding Configuration

⚠️ **Important:** Port 81 is often blocked by ISPs. You need to use a different external port!

**In your router:**
1. Go to **NAT/PAT** or **Port Forwarding**
2. Create **TWO rules**:

**Rule 1 - Web Interface:**
```
Name: Lay-Z-Spa Web
External Port: 8080 (or another free port)
Internal Port: 80  
Target IP: 192.168.x.xx (your ESP IP)
Protocol: TCP
```

**Rule 2 - WebSocket:**
```
Name: Lay-Z-Spa WebSocket
External Port: 8081 (or another free port)
Internal Port: 81  
Target IP: 192.168.x.xx (your ESP IP)
Protocol: TCP
```

#### 3. Recommended Ports

**Avoid these ports (often blocked):**
- Port 80, 81, 443, 25, 22

**Use instead:**
- **8080-8090**: Generally free
- **9000-9999**: Rarely used
- **49000-65000**: Dynamic ports, very rarely blocked

**Typical configuration example:**
- Web interface: External port **8080** → Internal port **80**
- WebSocket: External port **8081** → Internal port **81**

#### 4. Connection Test

The interface automatically displays the status:
- **🟢 Connected (WS)** → Local WebSocket (same network)
- **🟢 Connected (Ext)** → External WebSocket (from outside)  
- **🟡 Connected (HTTP)** → HTTP polling mode (fallback)

### 🌐 External Access

Once configured, you can access your spa from anywhere:

**External access URLs:**
```
Web interface: http://YOUR-PUBLIC-IP:8080
WebSocket: ws://YOUR-PUBLIC-IP:8081 (automatic)
```

**How to find your public IP:**
1. Go to [whatismyip.com](https://whatismyip.com)
2. Note your public IP address
3. Use this IP with your configured ports

**Complete example:**
- Your public IP: `123.45.67.89`
- External web access: `http://123.45.67.89:8080`
- WebSocket will automatically use port 8081

### 💡 Why not port 81 directly?

**Common issues with port 81:**
- ❌ **Blocked by ISPs** (Orange, SFR, etc.)
- ❌ **Filtered by corporate firewalls**
- ❌ **Considered "non-standard"**

**Solution: Use "high" ports**
- ✅ **Ports 8000-9999**: Rarely blocked
- ✅ **Ports 49000+**: Almost never filtered
- ✅ **Better network compatibility**

### 🔒 Security

⚠️ **Important:** This configuration exposes your ESP to the Internet.

**Recommendations:**
- **Change default passwords** on your ESP
- **Monitor connections** in logs
- **Use a VPN** when possible for added security
- **Limit access** by IP address if your router supports it

### 🛠️ Troubleshooting

#### ❌ External connection doesn't work

1. **Check fixed IP:**
   - Does the ESP still have the same local IP?
   - Is DHCP reservation active?

2. **Test port forwarding:**
   ```bash
   # From outside, test connectivity
   telnet YOUR-PUBLIC-IP 8080
   ```

3. **Check firewall:**
   - Are ports 8080/8081 open on your router?
   - Is there a firewall blocking connections?

#### ✅ Local vs External Test

- **Local**: `http://192.168.x.xx:80` → should work
- **External**: `http://YOUR-PUBLIC-IP:8080` → should work from outside

### 📱 Adaptive Interface

The interface automatically detects the connection type and displays:
- **Mobile-optimized status**: `Connected (Ext)` instead of "External WebSocket"
- **Visual indicators**: HTTP mode with "not real time" marker
- **Smart fallback**: Automatic switching between modes

---

## 💡 Typical Use Cases

- **🏠 Pre-heating**: Start the spa before coming home from work
- **📊 Monitoring**: Check temperature while on vacation  
- **🔧 Diagnostics**: Remote troubleshooting
- **👥 Family access**: Control from multiple devices/locations

**Result:** Your spa becomes accessible 24/7 from anywhere in the world! 🌍✨


### 🟢 Default UI (Original)
Location: `/Code/data/`  
Maintained by upstream (VisualApproach)  
Lightweight, minimal design.

---

### ✅ To switch between UIs:
Upload the files from the desired version folder into your ESP module via `/upload.html`



# WiFi remote for Bestway Lay-Z-SPA (fork – i18n + UI update)
=================================
Fork based on the great original project by [visualapproach](https://github.com/visualapproach).  
This version includes:

- 🌐 Internationalization (i18n) The UI is now available in six languages:

    🇬🇧 English
    🇫🇷 Français
    🇪🇸 Español
    🇮🇹 Italiano
    🇩🇪 Deutsch
    🇵🇹 Português

- 🎨 Updated CSS styles (modern, mobile-first layout)
- 🖼️ Refreshed UI with a pseudo-LCD display and icon tweaks
- 📁 All web files are stored under `/data/` and easily editable (HTML, CSS, JS, TXT)

> No changes were made to the ESP8266 core logic – only the web interface.

---

## Preview

Here are a few screenshots of the updated UI with multilingual support and enhanced styling:

![screenshot](https://raw.githubusercontent.com/dodemodexter/WiFi-remote-for-Bestway-Lay-Z-SPA/master/Code/Screenshots/05.png)

![screenshot](https://raw.githubusercontent.com/dodemodexter/WiFi-remote-for-Bestway-Lay-Z-SPA/master/Code/Screenshots/01.png)

![screenshot](https://raw.githubusercontent.com/dodemodexter/WiFi-remote-for-Bestway-Lay-Z-SPA/master/Code/Screenshots/02.png)

![screenshot](https://raw.githubusercontent.com/dodemodexter/WiFi-remote-for-Bestway-Lay-Z-SPA/master/Code/Screenshots/03.png)

![screenshot](https://raw.githubusercontent.com/dodemodexter/WiFi-remote-for-Bestway-Lay-Z-SPA/master/Code/Screenshots/04.png)

![screenshot](https://raw.githubusercontent.com/dodemodexter/WiFi-remote-for-Bestway-Lay-Z-SPA/master/Code/Screenshots/06.png)

---

## How to customize

Each language is defined in a .txt file (e.g., Langue_fr-FR.txt) located in the /data directory. These files are fully editable and allow easy customization or translation updates.

➕ Add a new language

To add support for another language:

1. Create a new `.txt` file named `Langue_xx-XX.txt` in the `/data` folder, using the same key/value structure.
2. Edit the file `webconfig.html` and:

   - Add a new `<option>` entry inside the hidden `<select>` used by the script:

     ```html
     <option value="xx-XX">YourLanguage</option>
     ```

   - Add a new flag inside the `#lang-flags` block:

     ```html
     <span class="flag" data-lang="xx-XX" title="YourLanguage">🌐</span>
     ```

That’s all — the system will automatically pick up and apply the new language file via `i18n.js`.

---
## Android App (APK)


A lightweight Android app is available to simplify access to the web interface:
[Download the APK](https://github.com/dodemodexter/WiFi-remote-for-Bestway-Lay-Z-SPA/blob/master/Code/APK/Lay-Z-By-visualapproach.apk)

This app wraps the existing web UI and makes it easier to use on mobile:

    Language is selected automatically on first launch

    The IP address of your Lay-Z-Spa module must be known and entered at first use

    Once configured, access is instant — just launch the app

    Note: This is not a native app. It simply embeds the web UI in a dedicated container.

## Credit

This fork exists thanks to the amazing original work of [visualapproach](https://github.com/visualapproach/WiFi-remote-for-Bestway-Lay-Z-SPA).

All license terms from the original repo still apply.
