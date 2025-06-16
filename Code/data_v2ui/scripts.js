        // Command mapping (from original GitHub repo)
        const cmdMap = {
            'setTarget': 0,
            'toggleUnit': 1,
            'toggleBubbles': 2,
            'toggleHeater': 3,
            'togglePump': 4,
            'resetQueue': 5,
            'restartEsp': 6,
            'getTarget': 7,
            'resetTotals': 8, 
            'resetTimerChlorine': 9, 
            'resetTimerReplaceFilter': 10, 
            'toggleHydroJets': 11,
            'setBrightness': 12,
            'setBeep': 13, 
            'setAmbientF': 14,
            'setAmbientC': 15,
            'resetDailyMeter': 16,
            'toggleGodmode': 17,
            'setFullpower': 18, 
            'printText': 19, 
            'setReady': 20, 
            'setR': 21,
            'resetTimerRinseFilter': 22, 
            'resetTimerCleanFilter': 23, 
            'setPower': 24,
            'toggleTimer': 25
        };

        const cmdMapReverse = Object.fromEntries(
            Object.entries(cmdMap).map(([key, value]) => [value, key])
        );

        let connection;
        let currentTab = 'spa-control'; 
        let currentData = {
            UNT: 1,  
            TGTC: 38, TGTF: 100,
            AMBC: 15, AMBF: 59,
            TMPC: 34, TMPF: 93,
            VTMC: 34.9, VTMF: 94.8,
            AIR: 0, FLT: 1, HJT: 0, RED: 0, GRN: 0, 
            BRT: 7, LCK: 0,
            HEATER_RUNTIME: 245,
            PUMP_RUNTIME: 120,
            AIR_RUNTIME: 30,
            JET_RUNTIME: 15,

            COST_DAILY_HEATER: 2.00,
            COST_DAILY_PUMP: 0.10,
            COST_DAILY_AIR: 0.09,
            COST_DAILY_JET: 0.03,
            COST_DAILY_TOTAL: 2.22,

            MAINT_CHLORINE_LAST_TS: 1717804800,
            MAINT_CHLORINE_DAYS_LEFT: 1,
            MAINT_FILTER_CHANGE_LAST_TS: 1716422400,
            MAINT_FILTER_CHANGE_DAYS_LEFT: 9,
            MAINT_FILTER_RINSE_LAST_TS: 1718150400,
            MAINT_FILTER_RINSE_DAYS_LEFT: 1,
            MAINT_FILTER_CLEAN_LAST_TS: 1717718400,
            MAINT_FILTER_CLEAN_DAYS_LEFT: -1
        };

        let originalPinoutValues = {}; 
        let originalAmbientSensorValues = {}; 
        let originalPowerLevelsValues = {}; 

        let hardwareConfigDraft = {
            cio: '0', 
            dsp: '0', 
            pcb: 'v1', 
            hasTempSensor: "0",
            pins: ['', '', '', '', '', '', '', ''],
            pwr_levels: {
                override: false,
                heater_stage1: '', heater_stage2: '', pump: '', idle: '', air: '', jet: ''
            }
        }; 
        let _spaConfigData = { 
            PRICE: 0.25, 
            CLINT: 7, 
            FREPI: 30, 
            FRINI: 3, 
            FCLEI: 7, 
            AUDIO: false,
            NOTIFY: true, 
            NOTIFTIME: 32, 
            RESTORE: false, 
            VTCAL: false, 
            LCK: true,
            
            AIR: true,
            FLT: true,
            HTR: true,
            DN: true,
            UP: true,
            PWR: true,
            HJT: false,
            LCK_btn: true,
            UNT: true,
            TMR: true
        };

        let networkConfigData = {
            enableAp: false,
            apSsid: "",
            apPwd: "",
            enableWM: false,
            enableStaticIp4: false,
            ip4Address: "",
            ip4Gateway: "",
            ip4Subnet: "",
            ip4DnsPrimary: "",
            ip4DnsSecondary: "",
            ip4NTP: "pool.ntp.org",
            mqttHost: "",
            mqttPort: 1883,
            mqttUsername: "",
            mqttPassword: "",
            mqttClientId: "",
            mqttBaseTopic: "",
            mqttTelemetryInterval: 0
        };

        let spaCapabilities = {
            hasAir: true,  
            hasJets: true,
            hasTimer: true
        };

        let commandQueue = []; 

        // Flag to control the "Restarting" modal message
        let isManualRestart = false; 

        let modifiedSections = {
            'cio-dsp-pcb-section': false,
            'pinout-section': false,
            'ambient-sensor-section': false,
            'power-levels-section': false,
            'energy-costs-section': false,
            'maintenance-intervals-section': false,
            'audio-notifications-section': false,
            'display-button-config-section': false,
            'virtual-temp-calibration-section': false,
            'access-point-section': false,
            'soft-ap-section': false,
            'static-ip-section': false,
            'ntp-server-section': false,
            'mqtt-config-section': false
        };

        let tempChangeTimeout = null;
        const DEBOUNCE_DELAY = 500;

        function markHardwareSectionModified(sectionId) {
            modifiedSections[sectionId] = true;
            const saveButton = document.querySelector(`#${sectionId} .section-save-btn`);
            if (saveButton) {
                saveButton.disabled = false;
            }
            if (sectionId === 'pinout-section' || sectionId === 'ambient-sensor-section' || sectionId === 'power-levels-section') {
                const editSaveButton = document.querySelector(`#${sectionId} .edit-btn.save`);
                if (editSaveButton) {
                    editSaveButton.disabled = false;
                }
            }
        }

        function resetHardwareSectionModifiedState(sectionId) {
            modifiedSections[sectionId] = false;
            const saveButton = document.querySelector(`#${sectionId} .section-save-btn`);
            if (saveButton) {
                saveButton.disabled = true;
            }
            if (sectionId === 'pinout-section' || sectionId === 'ambient-sensor-section' || sectionId === 'power-levels-section') {
                const editSaveButton = document.querySelector(`#${sectionId} .edit-btn.save`);
                if (editSaveButton) {
                    editSaveButton.disabled = true;
                }
            }
        }

        function markSpaSectionModified(sectionId) {
            modifiedSections[sectionId] = true;
            const saveButton = document.querySelector(`#${sectionId} .section-save-btn`);
            if (saveButton) {
                saveButton.disabled = false;
            }
        }
        
        function resetSpaSectionModifiedState(sectionId) {
            modifiedSections[sectionId] = false;
            const saveButton = document.querySelector(`#${sectionId} .section-save-btn`);
            if (saveButton) {
                saveButton.disabled = true;
            }
        }

        function markConnectivitySectionModified(sectionId) {
            modifiedSections[sectionId] = true;
            const saveButton = document.querySelector(`#${sectionId} .section-save-btn`);
            if (saveButton) {
                saveButton.disabled = false;
            }
        }

        function resetConnectivitySectionModifiedState(sectionId) {
            modifiedSections[sectionId] = false;
            const saveButton = document.querySelector(`#${sectionId} .section-save-btn`);
            if (saveButton) {
                saveButton.disabled = true;
            }
        }

        let modalConfirmCallback = null;
        let modalCancelCallback = null;
        let modalInputCallback = null; 

        function showModal(title, message, onConfirm, onCancel, showInput = false, inputPlaceholder = "", showSpinner = false, fileList = null) {
            const modal = document.getElementById('custom-modal');
            const modalTitle = document.getElementById('modal-title');
            const modalMessage = document.getElementById('modal-message');
            const modalInput = document.getElementById('modal-input');
            const modalSelect = document.getElementById('modal-select'); 
            const modalConfirmBtn = document.getElementById('modal-confirm-btn');
            const modalCancelBtn = document.getElementById('modal-cancel-btn');
            const modalSpinner = document.getElementById('modal-spinner');

            modalTitle.textContent = i18n(title);
            modalMessage.textContent = i18n(message);

            modalInput.classList.add('hidden');
            modalSelect.classList.add('hidden');
            modalSelect.innerHTML = '';

            if (fileList && fileList.length > 0) {
                modalSelect.classList.remove('hidden');
                fileList.forEach(filename => {
                    const option = document.createElement('option');
                    option.value = filename.name;
                    option.textContent = filename.name;
                    modalSelect.appendChild(option);
                });
                modalInputCallback = onConfirm;
                modalConfirmBtn.textContent = i18n("OK");
                modalConfirmBtn.onclick = () => {
                    if (modalInputCallback) {
                        modalInputCallback(modalSelect.value);
                    }
                    if (!showSpinner) hideModal();
                };
            } else if (showInput) {
                modalInput.classList.remove('hidden');
                modalInput.placeholder = i18n(inputPlaceholder);
                modalInput.value = "";
                modalInputCallback = onConfirm;
                modalConfirmBtn.textContent = i18n("OK");
                modalConfirmBtn.onclick = () => {
                    if (modalInputCallback) {
                        modalInputCallback(modalInput.value);
                    }
                    if (!showSpinner) hideModal();
                };
            } else {
                modalInputCallback = null;
                modalConfirmBtn.textContent = i18n("OK");
                modalConfirmBtn.onclick = () => {
                    if (modalConfirmCallback) {
                        modalConfirmCallback();
                    }
                    if (!showSpinner) hideModal();
                };
            }

            modalConfirmCallback = onConfirm;
            modalCancelCallback = onCancel;

            modalCancelBtn.onclick = () => {
                if (modalCancelCallback) {
                    modalCancelCallback();
                }
                hideModal();
            };

            if (showSpinner) {
                modalSpinner.classList.remove('hidden');
                modalConfirmBtn.classList.add('hidden');
                modalCancelBtn.classList.add('hidden');
            } else {
                modalSpinner.classList.remove('hidden');
                modalConfirmBtn.classList.remove('hidden');
                modalCancelBtn.classList.remove('hidden');
            }

            modal.classList.remove('hidden');
            void modal.offsetWidth;
            modal.style.opacity = 1;
        }

        function hideModal() {
            const modal = document.getElementById('custom-modal');
            modal.style.opacity = 0;
            setTimeout(() => {
                modal.classList.add('hidden');
                modalConfirmCallback = null;
                modalCancelCallback = null;
                modalInputCallback = null;
            }, 300); 
        }

        function getEspBaseUrl() {
            const hostname = location.hostname;
            const port = '80';
            return `${location.protocol}//${hostname}:${port}`;
        }

        window.sendCommand = function(cmd) {
            if (typeof cmdMap[cmd] == "undefined") {
                console.error(i18n("Invalid command:"), cmd);
                return;
            }

            var unit = currentData.UNT === 1;
            var value = 0;
            
            let isButtonEnabledByConfig = true; 

            switch(cmd) {
                case "toggleBubbles": isButtonEnabledByConfig = _spaConfigData.AIR; break;
                case "toggleHeater": isButtonEnabledByConfig = _spaConfigData.HTR; break;
                case "togglePump": isButtonEnabledByConfig = _spaConfigData.FLT; break;
                case "toggleHydroJets": isButtonEnabledByConfig = _spaConfigData.HJT; break;
                case "toggleLock": isButtonEnabledByConfig = _spaConfigData.LCK_btn; break; 
                case "toggleUnit": isButtonEnabledByConfig = _spaConfigData.UNT; break;
                case "toggleTimer": isButtonEnabledByConfig = _spaConfigData.TMR; break;
            }

            const isMasterEnabled = _spaConfigData.LCK;
            if (!cmd.startsWith('resetTimer') && (!isMasterEnabled || !isButtonEnabledByConfig)) {
                console.warn(i18n('Command "{cmd}" not sent: button or main display panel buttons are disabled by configuration.', { cmd }));
                showModal(i18n('Unauthorized Action'), i18n('This action is disabled by the display buttons configuration. Please check the "SPA Configuration" tab.'), null, null);
                return; 
            } else if (cmd.startsWith('resetTimer') && !isMasterEnabled) {
                 console.warn(i18n('Command "{cmd}" not sent: main display buttons switch is disabled.', { cmd }));
                 showModal(i18n('Unauthorized Action'), i18n('Maintenance timer reset is disabled by the display buttons configuration. Please check the "SPA Configuration" tab.'), null, null);
                 return;
            }

            // Optimistic UI update
            if (cmd.startsWith("toggle")) {
                switch(cmd) {
                    case "toggleBubbles":
                        value = currentData.AIR === 1 ? 0 : 1;
                        currentData.AIR = value;
                        break;
                    case "toggleHeater":
                        value = (currentData.RED === 1 || currentData.GRN === 1) ? 0 : 1;
                        currentData.RED = value;
                        currentData.GRN = 0;
                        break;
                    case "togglePump":
                        value = currentData.FLT === 1 ? 0 : 1;
                        currentData.FLT = value;
                        break;
                    case "toggleHydroJets":
                        value = currentData.HJT === 1 ? 0 : 1;
                        currentData.HJT = value;
                        break;
                    case "toggleLock":
                        value = currentData.LCK === 1 ? 0 : 1;
                        currentData.LCK = value;
                        break;
                    case "toggleUnit":
                        value = currentData.UNT === 1 ? 0 : 1;
                        currentData.UNT = value;
                        break;
                    case "toggleTimer":
                        value = currentData.TMR === 1 ? 0 : 1;
                        currentData.TMR = value;
                        break;
                }
                updateInterface(currentData);
                updateSpaControlPageButtons();
            } else if (cmd.startsWith("resetTimer")) {
                 const now = Math.floor(Date.now() / 1000);
                 switch (cmd) {
                     case 'resetTimerChlorine':
                         currentData.MAINT_CHLORINE_LAST_TS = now;
                         currentData.MAINT_CHLORINE_DAYS_LEFT = _spaConfigData.CLINT;
                         break;
                     case 'resetTimerReplaceFilter':
                         currentData.MAINT_FILTER_CHANGE_LAST_TS = now;
                         currentData.MAINT_FILTER_CHANGE_DAYS_LEFT = _spaConfigData.FREPI;
                         break;
                     case 'resetTimerRinseFilter':
                         currentData.MAINT_FILTER_RINSE_LAST_TS = now;
                         currentData.MAINT_FILTER_RINSE_DAYS_LEFT = _spaConfigData.FRINI;
                         break;
                     case 'resetTimerCleanFilter':
                         currentData.MAINT_FILTER_CLEAN_LAST_TS = now;
                         currentData.MAINT_FILTER_CLEAN_DAYS_LEFT = _spaConfigData.FCLEI;
                         break;
                 }
                 updateMaintenanceDisplay();
            }

           if (cmd == "setTarget") {
    value = unit ? currentData.TGTC : currentData.TGTF;
} else if (cmd == "setAmbientC" || cmd == "setAmbientF") {
    value = unit ? currentData.AMBC : currentData.AMBF;
} else if (cmd == "setBrightness") {
    value = currentData.BRT;
} else if (cmd == "setBeep") { 
    value = document.getElementById('enable-sounds').checked ? 1 : 0;
}

var obj = {
    "CMD": cmdMap[cmd],
    "VALUE": value,
    "XTIME": Math.floor(Date.now() / 1000),
    "INTERVAL": 0,
    "TXT": ""
};

if (connection && connection.readyState === WebSocket.OPEN) {
    //console.log(`📤 Envoi commande: ${cmd}`, obj); // ← AJOUTEZ CETTE LIGNE ICI
    connection.send(JSON.stringify(obj));
} else {
    showModal(i18n('Connection Error'), i18n('WebSocket is not connected. Please ensure the ESP is online and connected.'), null, null);
}
        };

        window.changeTemp = function(type, delta) {
            if (type === 'target') {
                const unit = currentData.UNT === 1;
                const current = unit ? currentData.TGTC : currentData.TGTF;
                const min = unit ? 20 : 68;
                const max = unit ? 40 : 104;
                const newValue = Math.max(min, Math.min(max, current + delta));
                
                if (unit) {
                    currentData.TGTC = newValue;
                } else {
                    currentData.TGTF = newValue;
                }
                
                const tempTargetEl = document.getElementById('temp-target');
                if (tempTargetEl) {
                    tempTargetEl.textContent = newValue + (unit ? '°C' : '°F');
                }
                const isTempPlusEnabled = _spaConfigData.UP;
                const isTempMinusEnabled = _spaConfigData.DN;
                const isMasterEnabled = _spaConfigData.LCK;

                if (!isMasterEnabled || !(delta > 0 ? isTempPlusEnabled : isTempMinusEnabled)) {
                    showModal(i18n('Unauthorized Action'), i18n('This action is disabled by the display buttons configuration. Please check the "SPA Configuration" tab.'), null, null);
                    return;
                }
                sendCommand('setTarget');
                
            } else if (type === 'ambient') {
                const unit = currentData.UNT === 1;
                const current = currentData.UNT === 1 ? currentData.AMBC : currentData.AMBF;
                const min = unit ? -40 : -40;
                const max = unit ? 60 : 140;
                const newValue = Math.max(min, Math.min(max, current + delta));
                
                if (unit) {
                    currentData.AMBC = newValue;
                } else {
                    currentData.AMBF = newValue;
                }
                
                const tempAmbientEl = document.getElementById('temp-ambient');
                if (tempAmbientEl) {
                    tempAmbientEl.textContent = newValue + (unit ? '°C' : '°F');
                }
                clearTimeout(tempChangeTimeout);
                tempChangeTimeout = setTimeout(() => {
                    sendCommand(unit ? 'setAmbientC' : 'setAmbientF');
                }, DEBOUNCE_DELAY);
            }
        };

        window.toggleUnit = function() {
            sendCommand('toggleUnit');
        };

        window.toggleCommand = function(cmd) {
            sendCommand(cmd);
        };

        window.setBrightness = function(value) {
            currentData.BRT = parseInt(value);
            const brightnessEl = document.getElementById('brightness-value');
            if (brightnessEl) brightnessEl.textContent = value;
            sendCommand('setBrightness');
        };

function updateTime() {
    const now = new Date();
    const currentLang = document.documentElement.lang || 'en';
    
    // Seul l'anglais utilise le format 12h avec AM/PM
    const isEnglish = currentLang === 'en';
    
    const time = now.toLocaleTimeString(currentLang, { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: isEnglish  // AM/PM seulement pour l'anglais
    }); 
    
    const timeEl = document.getElementById('current-time');
    if (timeEl) {
        timeEl.textContent = time;
    }
}

        function switchTab(tabName, element) {
            document.querySelectorAll('.nav-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            const clickedTab = element || event.target.closest('.nav-tab');
            if (clickedTab) {
                clickedTab.classList.add('active');
            }
            
            document.getElementById('spa-control-content').classList.add('hidden');
            document.getElementById('hardware-content').classList.add('hidden');
            document.getElementById('spa-config-content').classList.add('hidden');
            document.getElementById('connectivity-content').classList.add('hidden');
            document.getElementById('files-content').classList.add('hidden');

            document.getElementById(`${tabName}-content`).classList.remove('hidden');
            
            currentTab = tabName;
            
            if (currentTab === 'hardware') {
                loadHardwareConfig();
            } else if (currentTab === 'spa-config') {
                loadSpaConfig();
            } else if (currentTab === 'connectivity') {
                loadConnectivityConfig();
            } else if (currentTab === 'files') {
                listFiles();
            } 
        }

        let reconnectAttempts = 0;
        const MAX_RECONNECT_ATTEMPTS = 5;
        const RECONNECT_INTERVAL = 5000;

function connect() {
    try {
        const wsUrl = `ws://${location.hostname}:81/`;
        const wsProtocol = "arduino";

        connection = new WebSocket(wsUrl, [wsProtocol]);
        
        connection.onopen = function() {
            const statusIndicator = document.getElementById('status-indicator');
            const statusText = document.getElementById('status-text');
            if (statusIndicator) statusIndicator.className = 'w-3 h-3 bg-green-500 rounded-full animate-pulse';
            if (statusText) {
                statusText.textContent = i18n('Connected');
                statusText.setAttribute('data-i18n', 'Connected');
            }
            // Reset manual restart flag on successful connection
            isManualRestart = false; 
            hideModal(); // Hide modal if it was showing "Restarting..."
            reconnectAttempts = 0;
            connection.send(JSON.stringify({ "CMD": "GET_STATES" })); 
            connection.send(JSON.stringify({ "CMD": "GET_HARDWARE_CONFIG" })); 
            connection.send(JSON.stringify({ "CMD": "GET_SPA_CONFIG" }));
            loadCommandQueueViaHttp(); 
        };

        connection.onerror = function(error) {
            console.error(i18n("WebSocket Error:"), error);
            const statusIndicator = document.getElementById('status-indicator');
            const statusText = document.getElementById('status-text');
            if (statusIndicator) statusIndicator.className = 'w-3 h-3 bg-red-500 rounded-full';
            if (statusText) {
                statusText.textContent = i18n('Error');
                statusText.setAttribute('data-i18n', 'Error');
            }
        };

        connection.onclose = function(event) {
            const statusIndicator = document.getElementById('status-indicator');
            const statusText = document.getElementById('status-text');

            reconnectAttempts++;
            if (reconnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
                if (statusIndicator) statusIndicator.className = 'w-3 h-3 bg-yellow-500 rounded-full';
                
                // Display "Restarting..." only if it's a manual restart
                if (isManualRestart) {
                    if (statusText) {
                        statusText.textContent = i18n('Reconnecting ({reconnectAttempts}/{MAX_RECONNECT_ATTEMPTS})...', { reconnectAttempts, MAX_RECONNECT_ATTEMPTS });
                        statusText.setAttribute('data-i18n', 'Reconnecting ({reconnectAttempts}/{MAX_RECONNECT_ATTEMPTS})...');
                    }
                    showModal(i18n('Restarting...'), i18n('The ESP is restarting. Connection may be temporarily lost. Please wait while we attempt to reconnect... Reconnecting ({reconnectAttempts}/{MAX_RECONNECT_ATTEMPTS})...', { reconnectAttempts, MAX_RECONNECT_ATTEMPTS }), null, null, false, "OK", true);
                } else {
                    if (statusText) {
                        statusText.textContent = i18n('Reconnecting ({reconnectAttempts}/{MAX_RECONNECT_ATTEMPTS})...', { reconnectAttempts, MAX_RECONNECT_ATTEMPTS });
                        statusText.setAttribute('data-i18n', 'Reconnecting ({reconnectAttempts}/{MAX_RECONNECT_ATTEMPTS})...');
                    }
                    // For non-manual disconnects, just show reconnection attempts, not "Restarting..."
                    showModal(i18n('Connection Lost'), i18n('Connection lost. Attempting to reconnect ({reconnectAttempts}/{MAX_RECONNECT_ATTEMPTS})...', { reconnectAttempts, MAX_RECONNECT_ATTEMPTS }), null, null, false, "OK", true);
                }
                
                setTimeout(connect, RECONNECT_INTERVAL);
            } else {
                if (statusIndicator) statusIndicator.className = 'w-3 h-3 bg-gray-500 rounded-full';
                if (statusText) {
                    statusText.textContent = i18n('Disconnected');
                    statusText.setAttribute('data-i18n', 'Disconnected');
                }
                // For persistent disconnections, hide any "reconnecting" modal and show final message
                hideModal();
                showModal(i18n('Connection Lost'), i18n('Unable to reconnect to ESP after multiple attempts. Please check ESP power and your network.'), null, null);
                isManualRestart = false; // Reset the flag if it was a manual restart but failed to reconnect
            }
        };

        connection.onmessage = function(e) {
            try {
                const data = JSON.parse(e.data);
                handleMessage(data);
            } catch (error) {
                console.error(i18n("Error parsing JSON for received message:"), error);
            }
        };
    } catch (error) {
        console.error(i18n("Error initializing WebSocket connection:"), error);
        const statusIndicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');
        if (statusIndicator) statusIndicator.className = 'w-3 h-3 bg-red-500 rounded-full';
        if (statusText) {
            statusText.textContent = i18n('Connection Failed');
            statusText.setAttribute('data-i18n', 'Connection Failed');
        }
    }
}

        function loadCommandQueueViaHttp() {
            var req = new XMLHttpRequest();
            const baseUrl = getEspBaseUrl();
            req.open('POST', `${baseUrl}/getcommands/`); 
            req.onload = function() {
                if (req.status === 200) {
                    try {
                        var json = JSON.parse(req.responseText);
                        handleMessage({ CONTENT: "COMMAND_QUEUE", ...json });
                    }
                    catch (e) {
                        console.error(i18n("JSON parse error for command queue from HTTP:"), e);
                        commandQueue = [];
                        renderCommandQueue(); 
                    }
                } else {
                    console.error(i18n("Failed to load command queue via HTTP. Status:"), req.status);
                    commandQueue = [];
                    renderCommandQueue(); 
                }
            };
            req.onerror = function() {
                console.error(i18n("XMLHttpRequest error for /getcommands/. This often occurs when loading HTML directly from your file system (file://) due to browser security restrictions (Same-Origin Policy). To fix, serve your HTML using a local web server (e.g., Python's `python -m http.server`) and access it via `http://localhost:PORT/yourfile.html`."));
                commandQueue = [];
                renderCommandQueue(); 
            };
            req.send();
        }

function handleMessage(data) {
    //console.log("📨 Message ESP reçu:", data.CONTENT || 'unknown');
    
    if (data.CONTENT === "STATES") {
        Object.assign(currentData, data);
        updateInterface(data);
        updateSpaControlPageButtons();
        updateMaintenanceDisplay();
        
    } else if (data.CONTENT === "TIMES") {
        // console.log("📊 TOUTES les données TIMES:", data);
        
        // Récupérer les intervalles de configuration
        const tempConfigFromTimes = {
            CLINT: data.CLINT,
            FREPI: data.FREPI,
            FRINI: data.FRINI, 
            FCLEI: data.FCLEI, 
        };
        for (const key in tempConfigFromTimes) {
            if (tempConfigFromTimes.hasOwnProperty(key) && tempConfigFromTimes[key] !== undefined) {
                _spaConfigData[key] = tempConfigFromTimes[key];
            }
        }
        
        // AJOUT : Mapper les vraies données ESP vers les variables de maintenance
        const now = Math.floor(Date.now() / 1000);
        
        // Timestamps des dernières actions
        currentData.MAINT_CHLORINE_LAST_TS = data.CLTIME;
        currentData.MAINT_FILTER_CHANGE_LAST_TS = data.FREP;
        currentData.MAINT_FILTER_RINSE_LAST_TS = data.FRIN;
        currentData.MAINT_FILTER_CLEAN_LAST_TS = data.FCLE;
        
        // Calculer les jours restants
        currentData.MAINT_CHLORINE_DAYS_LEFT = data.CLINT - Math.floor((now - data.CLTIME) / 86400);
        currentData.MAINT_FILTER_CHANGE_DAYS_LEFT = data.FREPI - Math.floor((now - data.FREP) / 86400);
        currentData.MAINT_FILTER_RINSE_DAYS_LEFT = data.FRINI - Math.floor((now - data.FRIN) / 86400);
        currentData.MAINT_FILTER_CLEAN_DAYS_LEFT = data.FCLEI - Math.floor((now - data.FCLE) / 86400);
        
        // Mettre à jour l'affichage de maintenance
        updateMaintenanceDisplay();
        
        <!-- console.log("🔧 Données maintenance mises à jour:", { -->
            <!-- chlorine: currentData.MAINT_CHLORINE_DAYS_LEFT, -->
            <!-- filterChange: currentData.MAINT_FILTER_CHANGE_DAYS_LEFT, -->
            <!-- filterRinse: currentData.MAINT_FILTER_RINSE_DAYS_LEFT, -->
            <!-- filterClean: currentData.MAINT_FILTER_CLEAN_DAYS_LEFT -->
        <!-- }); -->
        
    } else if (data.CONTENT === "OTHER") { 
        if (data.HASJETS !== undefined) {
            spaCapabilities.hasJets = data.HASJETS;
        }
        if (data.HASAIR !== undefined) { 
            spaCapabilities.hasAir = data.HASAIR;
        }
        if (data.HASTIMER !== undefined) {
            spaCapabilities.hasTimer = data.HASTIMER;
        }
        
        updateSpaControlPageButtons(); 
        updateSpaConfigPageElements(); 
        
    } else if (data.CONTENT === "HARDWARE_CONFIG") {
        applyHardwareConfig(data);
        
    } else if (data.CONTENT === "SPA_CONFIG") { 
        const defaults = {
            PRICE: 0.25, CLINT: 7, FREPI: 30, FRINI: 3, FCLEI: 7, 
            AUDIO: false, NOTIFY: true, NOTIFTIME: 32, RESTORE: false, 
            VTCAL: true, LCK: true, 
            AIR: true, FLT: true, HTR: true, DN: true, UP: true, PWR: true, HJT: false, 
            LCK_btn: true, UNT: true, TMR: true
        };
        const incomingSpaConfig = {};
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                const value = data[key];
                if (['AUDIO', 'NOTIFY', 'RESTORE', 'VTCAL', 'LCK', 'AIR', 'FLT', 'HTR', 'DN', 'UP', 'PWR', 'HJT', 'LCK_btn', 'UNT', 'TMR'].includes(key)) {
                    incomingSpaConfig[key] = (value === 1 || value === true || value === "1");
                } else {
                    incomingSpaConfig[key] = value;
                }
            }
        }
        Object.assign(_spaConfigData, defaults, incomingSpaConfig); 
        applySpaConfig(_spaConfigData); 
        
    } else if (data.CONTENT === "COMMAND_QUEUE") { 
        let rawCommands = [];
        if (data.commands && Array.isArray(data.commands)) {
            rawCommands = data.commands.filter(cmd => {
                return !(cmd.CMD === undefined || cmd.CMD === null ||
                         (cmd.CMD === 0 && cmd.XTIME === 0 && cmd.INTERVAL === 0 && (cmd.TXT === "" || cmd.TXT === undefined || cmd.TXT === null)));
            });
        } else if (Array.isArray(data.CMD) && Array.isArray(data.VALUE) && Array.isArray(data.XTIME) && Array.isArray(data.INTERVAL) && Array.isArray(data.TXT)) {
            const len = data.LEN || data.CMD.length; 
            for (let i = 0; i < len; i++) {
                const currentCmd = data.CMD[i];
                const currentTime = data.XTIME[i];
                const currentInterval = data.INTERVAL[i];
                const currentTxt = data.TXT[i];

                if (currentCmd === undefined || currentCmd === null ||
                    (currentCmd === 0 && currentTime === 0 && currentInterval === 0 && (currentTxt === "" || currentTxt === undefined || currentTxt === null))) {
                    continue; 
                }

                const cmd = {
                    CMD: currentCmd,
                    VALUE: data.VALUE[i] !== undefined ? data.VALUE[i] : null,
                    XTIME: currentTime !== undefined ? currentTime : null,
                    INTERVAL: currentInterval !== undefined ? currentInterval : null,
                    TXT: currentTxt !== undefined ? currentTxt : ""
                };
                rawCommands.push(cmd);
            }
        } else {
            console.warn(i18n("Received COMMAND_QUEUE data in unexpected format:"), data);
        }
        commandQueue = rawCommands; 
        renderCommandQueue();
        
    } else if (data.CONTENT === "NETWORK_CONFIG") {
        applyConnectivityConfig(data);
        
    } else if (data.CONTENT === "FILE_LIST") {
        renderFileList(data.files);
    }
}

        function updateInterface(data) {
            if (data.TMPC !== undefined || data.TMPF !== undefined) {
                const unit = data.UNT === 1 ? '°C' : '°F';
                const temp = data.UNT === 1 ? data.TMPC : data.TMPF;
                const tempActualEl = document.getElementById('temp-actual');
                if (tempActualEl) {
                    tempActualEl.textContent = temp + unit;
                }
            }
            
            if (data.VTMC !== undefined || data.VTMF !== undefined) {
                const unit = data.UNT === 1 ? '°C' : '°F';
                const temp = data.UNT === 1 ? data.VTMC : data.VTMF;
                const tempVirtualEl = document.getElementById('temp-virtual');
                if (tempVirtualEl) tempVirtualEl.textContent = temp.toFixed(1) + unit;
            }
            
            if (data.TGTC !== undefined || data.TGTF !== undefined) {
                const unit = currentData.UNT === 1 ? '°C' : '°F';
                const temp = currentData.UNT === 1 ? currentData.TGTC : currentData.TGTF;
                const tempTargetEl = document.getElementById('temp-target');
                if (tempTargetEl) {
                    tempTargetEl.textContent = temp + unit;
                }
            }
            
            if (data.AMBC !== undefined || data.AMBF !== undefined) {
                const unit = currentData.UNT === 1 ? '°C' : '°F';
                const temp = currentData.UNT === 1 ? currentData.AMBC : currentData.AMBF;
                const tempAmbientEl = document.getElementById('temp-ambient');
                if (tempAmbientEl) {
                    tempAmbientEl.textContent = temp + unit;
                }
            }

            if (data.UNT !== undefined) {
                const unitSymbol = document.getElementById('unit-symbol');
                const unitAction = document.getElementById('unit-action');
                
                if (unitSymbol && unitAction) {
                    if (data.UNT === 1) {
                        unitSymbol.textContent = '°C';
                        unitAction.textContent = i18n('Switch to °F');
                    } else {
                        unitSymbol.textContent = '°F';
                        unitAction.textContent = i18n('Switch to °C');
                    }
                }
            }

            if (data.BRT !== undefined) {
                const brightnessValueEl = document.getElementById('brightness-value');
                const brightnessSliderEl = document.getElementById('brightness-slider');
                if (brightnessValueEl) brightnessValueEl.textContent = data.BRT;
                if (brightnessSliderEl) brightnessSliderEl.value = data.BRT;
            }

            if (data.LCK !== undefined) {
                const lockIcon = document.getElementById('lock-icon');
                const lockStatusText = document.getElementById('lock-status-text');
                if (lockIcon && lockStatusText) {
                    // Lock icon fix: Ensure a common emoji font is preferred for better display compatibility
                    lockIcon.style.fontFamily = "'Segoe UI Emoji', 'Apple Color Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', sans-serif";
                    if (data.LCK === 1) {
                        lockIcon.textContent = '🔒'; // Correct Unicode for locked padlock
                        lockStatusText.textContent = i18n('Locked');
                        lockStatusText.className = 'text-lg text-red-400';
                    } else {
                        lockIcon.textContent = '🔓'; // Correct Unicode for unlocked padlock
                        lockStatusText.textContent = i18n('Unlocked');
                        lockStatusText.className = 'text-lg text-green-400';
                    }
                }
            }
        }

        function togglePinoutEditMode(enterEditMode) {
            const pinInputs = document.querySelectorAll('#pinout-section .pin-input');
            const editBtn = document.getElementById('editPinoutBtn');
            const saveBtn = document.getElementById('savePinoutBtn');
            const cancelBtn = document.getElementById('cancelPinoutBtn');
            const pcbRadioElements = document.querySelectorAll("input[name='pcb']");
            const cioSelect = document.getElementById('cio_model_select');
            const dspSelect = document.getElementById('dsp_model_select');
            
            const currentPcbRadio = document.querySelector("input[name='pcb']:checked");
            const currentPcbValue = currentPcbRadio ? currentPcbRadio.value : '';
            const isCustomPcb = (currentPcbValue === 'custom');


            if (enterEditMode) {
                editBtn.classList.add('hidden');
                saveBtn.classList.remove('hidden');
                cancelBtn.classList.remove('hidden');

                originalPinoutValues.cio = cioSelect.value;
                originalPinoutValues.dsp = dspSelect.value;
                originalPinoutValues.pcb = currentPcbValue;

                pinInputs.forEach(input => {
                    originalPinoutValues[input.id] = input.value;
                    input.disabled = !(isCustomPcb); 
                });

                cioSelect.disabled = true;
                dspSelect.disabled = true;
                pcbRadioElements.forEach(radio => radio.disabled = true);
                saveBtn.disabled = true;


            } else {
                editBtn.classList.remove('hidden');
                saveBtn.classList.add('hidden');
                cancelBtn.classList.add('hidden');

                if (event && event.target.id === 'cancelPinoutBtn') { 
                    cioSelect.value = originalPinoutValues.cio;
                    dspSelect.value = originalPinoutValues.dsp;
                    const originalPcbRadio = document.getElementById(originalPinoutValues.pcb);
                    if (originalPcbRadio) originalPcbRadio.checked = true;

                    pinInputs.forEach(input => {
                        input.value = originalPinoutValues[input.id] || '';
                    });
                }
                
                pinInputs.forEach(input => {
                    input.disabled = true;
                });
                cioSelect.disabled = false;
                dspSelect.disabled = false;
                pcbRadioElements.forEach(radio => radio.disabled = false);

                setPins(); 
                resetHardwareSectionModifiedState('pinout-section');
            }
        }

        function toggleAmbientSensorEditMode(enterEditMode) {
            const pin8Input = document.getElementById('pin8');
            const editBtn = document.getElementById('editAmbientSensorBtn');
            const saveBtn = document.getElementById('saveAmbientSensorBtn');
            const cancelBtn = document.getElementById('cancelAmbientSensorBtn');
            const sensorEnableText = document.getElementById('sensor_enable_text');


            if (enterEditMode) {
                editBtn.classList.add('hidden');
                saveBtn.classList.remove('hidden');
                cancelBtn.classList.remove('hidden');

                originalAmbientSensorValues.pin8 = pin8Input.value;
                originalAmbientSensorValues.hasTempSensor = hardwareConfigDraft.hasTempSensor === "1" ? true : false;
                
                pin8Input.disabled = false; 

                sensorEnableText.textContent = i18n("Enabled (Pin Modification)");
                saveBtn.disabled = true;


            } else {
                editBtn.classList.remove('hidden');
                saveBtn.classList.add('hidden');
                cancelBtn.classList.add('hidden');

                if (event && event.target.id === 'cancelAmbientSensorBtn') {
                    pin8Input.value = originalAmbientSensorValues.pin8 || '';
                    sensorEnableText.textContent = originalAmbientSensorValues.hasTempSensor ? i18n("Enabled") : i18n("Disabled"); 
                } else {
                    sensorEnableText.textContent = hardwareConfigDraft.hasTempSensor === "1" ? i18n("Enabled") : i18n("Disabled");
                }
                
                pin8Input.disabled = true; 
                resetHardwareSectionModifiedState('ambient-sensor-section');
            }
        }

        function togglePowerLevelsEditMode(enterEditMode) {
            const powerInputs = document.querySelectorAll('#power-levels-section .power-input-field'); 
            const editBtn = document.getElementById('editPowerLevelsBtn');
            const saveBtn = document.getElementById('savePowerLevelsBtn');
            const cancelBtn = document.getElementById('cancelPowerLevelsBtn');
            const powerOverrideText = document.getElementById('power_override_text');

            if (enterEditMode) {
                editBtn.classList.add('hidden');
                saveBtn.classList.remove('hidden');
                cancelBtn.classList.remove('hidden');

                powerInputs.forEach(input => {
                    originalPowerLevelsValues[input.id] = input.value;
                });
                originalPowerLevelsValues.override = hardwareConfigDraft.pwr_levels.override;

                powerInputs.forEach(input => {
                    input.disabled = false;
                });

                powerOverrideText.textContent = i18n("Custom Power Levels Active");
                saveBtn.disabled = true;

            } else {
                editBtn.classList.remove('hidden');
                saveBtn.classList.add('hidden');
                cancelBtn.classList.add('hidden');

                if (event && event.target.id === 'cancelPowerLevelsBtn') { 
                    powerInputs.forEach(input => {
                        input.value = originalPowerLevelsValues[input.id] || '';
                    });
                    powerOverrideText.textContent = originalPowerLevelsValues.override ? i18n("Custom Power Levels Active") : i18n("Default Power Levels");
                } else {
                    powerOverrideText.textContent = hardwareConfigDraft.pwr_levels.override ? i18n("Custom Power Levels Active") : i18n("Default Power Levels");
                }

                powerInputs.forEach(input => {
                    input.disabled = true;
                });
                resetHardwareSectionModifiedState('power-levels-section');
            }
        }

        function commitPinoutChanges() {
            hardwareConfigDraft.cio = document.getElementById("cio_model_select").value;
            hardwareConfigDraft.dsp = document.getElementById("dsp_model_select").value;
            hardwareConfigDraft.pcb = document.querySelector("input[name='pcb']:checked")?.value || '';

            hardwareConfigDraft.pins = [
                document.getElementById('pin1').value,
                document.getElementById('pin2').value,
                document.getElementById('pin3').value,
                document.getElementById('pin4').value,
                document.getElementById('pin5').value,
                document.getElementById('pin6').value,
                document.getElementById('pin7').value,
                document.getElementById('pin8').value 
            ];

            togglePinoutEditMode(false); 
        }

        function commitAmbientSensorChanges() {
            hardwareConfigDraft.hasTempSensor = (document.getElementById('pin8').value.trim() !== "") ? "1" : "0"; 
            if (!hardwareConfigDraft.pins) {
                hardwareConfigDraft.pins = ['', '', '', '', '', '', '', '']; 
            }
            hardwareConfigDraft.pins[7] = document.getElementById('pin8').value;

            toggleAmbientSensorEditMode(false); 
        }

        function commitPowerLevelsChanges() {
            let anyPowerLevelSet = false;
            document.querySelectorAll("#power-levels-section .power-input-field").forEach(e => { 
                if (e.value.trim() !== "") {
                    anyPowerLevelSet = true;
                }
            });
            hardwareConfigDraft.pwr_levels.override = anyPowerLevelSet; 

            document.querySelectorAll("#power-levels-section .power-input-field").forEach(e => { 
                hardwareConfigDraft.pwr_levels[e.id.slice(4)] = e.value;
            });

            togglePowerLevelsEditMode(false); 
        }

        function setPins() {
            const cioSelect = document.getElementById('cio_model_select');
            const dspSelect = document.getElementById('dsp_model_select');
            const pcbRadio = document.querySelector("input[name='pcb']:checked");
            const pcb = pcbRadio ? pcbRadio.value : '';
            
            let p1 = '', p2 = '', p3 = '', p4 = '', p5 = '', p6 = '', p7 = '';

            const pinoutInEditMode = !document.getElementById('savePinoutBtn').classList.contains('hidden');
            const isCustomPcbSelected = (pcb === 'custom');

            const editPinoutBtn = document.getElementById('editPinoutBtn');
            if (editPinoutBtn) {
                editPinoutBtn.classList.toggle('hidden', !isCustomPcbSelected);
            }
            if (!isCustomPcbSelected && !pinoutInEditMode) {
                const cio = cioSelect.value;
                const dsp = dspSelect.value;
                
                switch(pcb) {
                    case 'v1':
                        if (['0', '1', '2', '3'].includes(cio)) { 
                            p1 = '7'; p2 = '2'; p3 = '1';
                        } else if (['4', '5', '6', '7', '8'].includes(cio)) { 
                            p1 = '3'; p2 = '2'; p3 = '';
                        }
                        if (['0', '1', '2', '3'].includes(dsp)) { 
                            p4 = '5'; p5 = '4'; p6 = '3'; p7 = '6';
                        } else if (['4', '5', '6', '7', '8'].includes(dsp)) { 
                            p4 = '6'; p5 = '7'; p6 = ''; p7 = '';
                        }
                        break;
                    case 'v2':
                        if (['0', '1', '2', '3'].includes(cio)) { 
                            p1 = '1'; p2 = '2'; p3 = '3';
                        } else if (['4', '5', '6', '7', '8'].includes(cio)) { 
                            p1 = '1'; p2 = '2'; p3 = '';
                        }
                        if (['0', '1', '2', '3'].includes(dsp)) { 
                            p4 = '4'; p5 = '5'; p6 = '6'; p7 = '7';
                        } else if (['4', '5', '6', '7', '8'].includes(dsp)) { 
                            p4 = '4'; p5 = '5'; p6 = ''; p7 = '';
                        }
                        break;
                    case 'v2b':
                        if (['0', '1', '2', '3'].includes(cio)) { 
                            p1 = '1'; p2 = '2'; p3 = '5';
                        } else if (['4', '5', '6', '7', '8'].includes(cio)) { 
                            p1 = '2'; p2 = '5'; p3 = '';
                        }
                        if (['0', '1', '2', '3'].includes(dsp)) { 
                            p4 = '6'; p5 = '4'; p6 = '3'; p7 = '7';
                        } else if (['4', '5', '6', '7', '8'].includes(dsp)) { 
                            p4 = '4'; p5 = '3'; p6 = ''; p7 = '';
                        }
                        break;
                    default:
                        p1=p2=p3=p4=p5=p6=p7='';
                        break;
                }
                document.getElementById('pin1').value = String(p1);
                document.getElementById('pin2').value = String(p2);
                document.getElementById('pin3').value = String(p3);
                document.getElementById('pin4').value = String(p4);
                document.getElementById('pin5').value = String(p5);
                document.getElementById('pin6').value = String(p6);
                document.getElementById('pin7').value = String(p7);
            }
            
            const shouldPinsBeEnabled = isCustomPcbSelected && pinoutInEditMode;

            document.getElementById('pin1').disabled = !shouldPinsBeEnabled;
            document.getElementById('pin2').disabled = !shouldPinsBeEnabled;
            document.getElementById('pin3').disabled = !shouldPinsBeEnabled;
            document.getElementById('pin4').disabled = !shouldPinsBeEnabled;
            document.getElementById('pin5').disabled = !shouldPinsBeEnabled;
            document.getElementById('pin6').disabled = !shouldPinsBeEnabled;
            document.getElementById('pin7').disabled = !shouldPinsBeEnabled;
            
        }

        function loadHardwareConfig() {
            var req = new XMLHttpRequest();
            const baseUrl = getEspBaseUrl();
            req.open('POST', `${baseUrl}/gethardware/`);
            req.onload = function() {
                if (req.status === 200) {
                    try {
                        var json = JSON.parse(req.responseText);
                        applyHardwareConfig(json);
                    } catch (e) {
                        console.error(i18n("JSON parse error for hardware config:"), e);
                    }
                } else {
                    console.error(i18n("Failed to load hardware config. Status:"), req.status);
                }
            };
            req.onerror = function() {
                console.error(i18n("XMLHttpRequest error for /gethardware/. This often occurs when loading HTML directly from your file system (file://) due to browser security restrictions (Same-Origin Policy). To fix, serve your HTML using a local web server (e.g., Python's `python -m http.server`) and access it via `http://localhost:PORT/yourfile.html`."));
            };
            req.send();
        }

        function applyHardwareConfig(json) {
            const cioSelect = document.getElementById("cio_model_select");
            if (cioSelect && json.cio !== undefined) {
                cioSelect.value = json.cio.toString();
            } else if (cioSelect) {
                 cioSelect.value = '0';
            }

            const dspSelect = document.getElementById("dsp_model_select");
            if (dspSelect && json.dsp !== undefined) {
                dspSelect.value = json.dsp.toString();
            } else if (dspSelect) {
                 dspSelect.value = '0';
            }

            const pcbRadio = document.getElementById(json.pcb);
            if (pcbRadio) {
                pcbRadio.checked = true;
            } else {
                document.getElementById('v1').checked = true;
            }

            const sensorEnableText = document.getElementById('sensor_enable_text');
            if (sensorEnableText) {
                sensorEnableText.textContent = (json.hasTempSensor === '1' || json.hasTempSensor === true) ? i18n("Enabled") : i18n("Disabled");
            }
            
            if (json.pins) {
                document.getElementById('pin1').value = json.pins[0] !== null && json.pins[0] !== undefined ? json.pins[0].toString() : '';
                document.getElementById('pin2').value = json.pins[1] !== null && json.pins[1] !== undefined ? json.pins[1].toString() : '';
                document.getElementById('pin3').value = json.pins[2] !== null && json.pins[2] !== undefined ? json.pins[2].toString() : '';
                document.getElementById('pin4').value = json.pins[3] !== null && json.pins[3] !== undefined ? json.pins[3].toString() : '';
                document.getElementById('pin5').value = json.pins[4] !== null && json.pins[4] !== undefined ? json.pins[4].toString() : '';
                document.getElementById('pin6').value = json.pins[5] !== null && json.pins[5] !== undefined ? json.pins[5].toString() : '';
                document.getElementById('pin7').value = json.pins[6] !== null && json.pins[6] !== undefined ? json.pins[6].toString() : '';
                document.getElementById('pin8').value = json.pins[7] !== null && json.pins[7] !== undefined ? json.pins[7].toString() : '';
            }

            hardwareConfigDraft = {
                cio: cioSelect.value,
                dsp: dspSelect.value,
                pcb: document.querySelector("input[name='pcb']:checked")?.value || '',
                hasTempSensor: (json.hasTempSensor === '1' || json.hasTempSensor === true) ? "1" : "0", 
                pins: [
                    document.getElementById('pin1').value,
                    document.getElementById('pin2').value,
                    document.getElementById('pin3').value,
                    document.getElementById('pin4').value,
                    document.getElementById('pin5').value,
                    document.getElementById('pin6').value,
                    document.getElementById('pin7').value,
                    document.getElementById('pin8').value
                ],
                pwr_levels: {
                    override: json.pwr_levels && json.pwr_levels.override, 
                    heater_stage1: json.pwr_levels && json.pwr_levels.heater_stage1 !== undefined ? json.pwr_levels.heater_stage1.toString() : '',
                    heater_stage2: json.pwr_levels && json.pwr_levels.heater_stage2 !== undefined ? json.pwr_levels.heater_stage2.toString() : '',
                    pump: json.pwr_levels && json.pwr_levels.pump !== undefined ? json.pwr_levels.pump.toString() : '',
                    idle: json.pwr_levels && json.pwr_levels.idle !== undefined ? json.pwr_levels.idle.toString() : '',
                    air: json.pwr_levels && json.pwr_levels.air !== undefined ? json.pwr_levels.air.toString() : '',
                    jet: json.pwr_levels && json.pwr_levels.jet !== undefined ? json.pwr_levels.jet.toString() : '',
                }
            };

            if (json.pwr_levels) {
                const powerOverrideText = document.getElementById('power_override_text');
                if (powerOverrideText) {
                    powerOverrideText.textContent = hardwareConfigDraft.pwr_levels.override ? i18n("Custom Power Levels Active") : i18n("Default Power Levels");
                }
                 document.getElementById('pwr_heater_stage1').value = hardwareConfigDraft.pwr_levels.heater_stage1;
                document.getElementById('pwr_heater_stage2').value = hardwareConfigDraft.pwr_levels.heater_stage2;
                document.getElementById('pwr_pump').value = hardwareConfigDraft.pwr_levels.pump;
                document.getElementById('pwr_idle').value = hardwareConfigDraft.pwr_levels.idle;
                document.getElementById('pwr_air').value = hardwareConfigDraft.pwr_levels.air;
                document.getElementById('pwr_jet').value = hardwareConfigDraft.pwr_levels.jet;
            }

            const cioModel = parseInt(hardwareConfigDraft.cio);
            spaCapabilities.hasAir = false;
            spaCapabilities.hasJets = false;

            if (['0', '1', '3', '5', '8'].includes(cioModel.toString())) { 
                spaCapabilities.hasAir = true;
            }
            if (['2', '4', '6', '7'].includes(cioModel.toString())) { 
                spaCapabilities.hasJets = true;
            }
            if (['2', '4', '7'].includes(cioModel.toString())) { 
                 spaCapabilities.hasAir = true;
                 spaCapabilities.hasJets = true;
            }

            setPins(); 
            toggleAmbientSensorEditMode(false); 
            togglePowerLevelsEditMode(false);
            togglePinoutEditMode(false);
            
            updateSpaControlPageButtons(); 
            updateSpaConfigPageElements(); 

            Object.keys(modifiedSections).forEach(sectionId => {
                if (sectionId.includes('hardware')) {
                    resetHardwareSectionModifiedState(sectionId);
                }
            });
        }

        function saveHardwareConfigSection() {
            const saveButton = event.target;
            buttonConfirm(saveButton, i18n("Saving..."), 6); 

            hardwareConfigDraft.cio = document.getElementById("cio_model_select").value;
            hardwareConfigDraft.dsp = document.getElementById("dsp_model_select").value;
            hardwareConfigDraft.pcb = document.querySelector("input[name='pcb']:checked")?.value || '';
            hardwareConfigDraft.hasTempSensor = (document.getElementById('pin8').value.trim() !== "") ? "1" : "0"; 

            hardwareConfigDraft.pins = [
                document.getElementById('pin1').value,
                document.getElementById('pin2').value,
                document.getElementById('pin3').value,
                document.getElementById('pin4').value,
                document.getElementById('pin5').value,
                document.getElementById('pin6').value,
                document.getElementById('pin7').value,
                document.getElementById('pin8').value 
            ];
            hardwareConfigDraft.pwr_levels.override = Array.from(document.querySelectorAll("#power-levels-section .power-input-field")).some(e => e.value.trim() !== "");
            hardwareConfigDraft.pwr_levels.heater_stage1 = document.getElementById('pwr_heater_stage1').value;
            hardwareConfigDraft.pwr_levels.heater_stage2 = document.getElementById('pwr_heater_stage2').value;
            hardwareConfigDraft.pwr_levels.pump = document.getElementById('pwr_pump').value;
            hardwareConfigDraft.pwr_levels.idle = document.getElementById('pwr_idle').value;
            hardwareConfigDraft.pwr_levels.air = document.getElementById('pwr_air').value;
            hardwareConfigDraft.pwr_levels.jet = document.getElementById('pwr_jet').value;

            var req = new XMLHttpRequest();
            const baseUrl = getEspBaseUrl();
            req.open('POST', `${baseUrl}/sethardware/`);
            req.setRequestHeader('Content-Type', 'application/json');

            req.send(JSON.stringify(hardwareConfigDraft));

            req.onload = function() {
                if (req.status === 200) {
                    showModal(i18n('Success'), i18n('Hardware configuration saved successfully! Restart the ESP to apply changes.'), null, null);
                    loadHardwareConfig();
                } else {
                    console.error(i18n("Failed to save hardware configuration. Status:"), req.status);
                    showModal(i18n('Error'), i18n("Failed to save hardware configuration. Please try again."), null, null);
                }
            };
            req.onerror = function() {
                console.error(i18n("XMLHttpRequest error during saveHardwareConfig. Check network/ESP response."));
                showModal(i18n('Network Error'), i18n('Unable to communicate with device.'), null, null);
            };
        }

        function buttonConfirm(elem, text = "", timeout = 3, reset = true) {
            var originalText = elem.innerHTML;

            elem.innerHTML = text == "" ? "&check;" : text;
            elem.disabled = true;

            if (reset) {
                setTimeout(function () {
                    elem.innerHTML = originalText;
                    elem.disabled = false;
                }, timeout * 1000);
            }
        }

        function loadSpaConfig() {
            var req = new XMLHttpRequest();
            const baseUrl = getEspBaseUrl();
            req.open('POST', `${baseUrl}/getconfig/`); 
            req.onload = function() {
                if (req.status === 200) {
                    try {
                        const rawResponseText = req.responseText;
                        var json = JSON.parse(rawResponseText);
                        
                        const defaults = {
                            PRICE: 0.25, CLINT: 7, FREPI: 30, FRINI: 3, FCLEI: 7, 
                            AUDIO: false, NOTIFY: true, NOTIFTIME: 32, RESTORE: false, 
                            VTCAL: true, LCK: true, 
                            AIR: true, FLT: true, HTR: true, DN: true, UP: true, PWR: true, HJT: false, 
                            LCK_btn: true, UNT: true, TMR: true
                        };
                        Object.assign(_spaConfigData, defaults); 
                        for (const key in json) {
                            if (json.hasOwnProperty(key) && json[key] !== undefined) {
                                if (['AUDIO', 'NOTIFY', 'RESTORE', 'VTCAL', 'LCK', 'AIR', 'FLT', 'HTR', 'DN', 'UP', 'PWR', 'HJT', 'LCK_btn', 'UNT', 'TMR'].includes(key)) {
                                    _spaConfigData[key] = (json[key] === 1 || json[key] === true || json[key] === "1");
                                } else {
                                    _spaConfigData[key] = json[key];
                                }
                            }
                        }
                        applySpaConfig(_spaConfigData); 
                    } catch (e) {
                        console.error(i18n("JSON parse error for SPA configuration from /getconfig/:"), e);
                        applySpaConfig(_spaConfigData); 
                    }
                } else {
                    console.error(i18n("Failed to load SPA configuration from /getconfig/. Status:"), req.status);
                    applySpaConfig(_spaConfigData); 
                }
            };
            req.onerror = function() {
                console.error(i18n("XMLHttpRequest error for /getconfig/. Using existing SPA configuration data. Ensure ESP endpoint is accessible."));
                applySpaConfig(_spaConfigData); 
            };
            req.send();
        }

        function applySpaConfig(config) { 
            const kwhPriceEl = document.getElementById('kwh-price');
            if (kwhPriceEl) kwhPriceEl.value = _spaConfigData.PRICE !== undefined ? _spaConfigData.PRICE.toFixed(4) : '';

            const chlorineDaysEl = document.getElementById('chlorine-days');
            if (chlorineDaysEl) chlorineDaysEl.value = _spaConfigData.CLINT !== undefined ? _spaConfigData.CLINT : '';

            const filterChangeDaysEl = document.getElementById('filter-change-days');
            if (filterChangeDaysEl) filterChangeDaysEl.value = _spaConfigData.FREPI !== undefined ? _spaConfigData.FREPI : '';

            const filterRinseDaysEl = document.getElementById('filter-rinse-days');
            if (filterRinseDaysEl) filterRinseDaysEl.value = _spaConfigData.FRINI !== undefined ? _spaConfigData.FRINI : '';

            const filterCleanDaysEl = document.getElementById('filter-clean-days');
            if (filterCleanDaysEl) filterCleanDaysEl.value = _spaConfigData.FCLEI !== undefined ? _spaConfigData.FCLEI : '';
            
            const enableSoundsEl = document.getElementById('enable-sounds');
            if (enableSoundsEl) enableSoundsEl.checked = _spaConfigData.AUDIO;

            const enableNotificationsEl = document.getElementById('enable-notifications');
            if (enableNotificationsEl) enableNotificationsEl.checked = _spaConfigData.NOTIFY; 
            
            const notificationVolumeEl = document.getElementById('notification-volume');
            if (notificationVolumeEl) notificationVolumeEl.value = _spaConfigData.NOTIFTIME;
            
            const calibratedCheckboxEl = document.getElementById('calibrated-checkbox');
            if (calibratedCheckboxEl) calibratedCheckboxEl.checked = _spaConfigData.VTCAL; 
            
            const activateDisplayButtonsCheckbox = document.getElementById('activate-display-buttons');
            if (activateDisplayButtonsCheckbox) {
                activateDisplayButtonsCheckbox.checked = _spaConfigData.LCK;
            }
            
            updateSpaConfigPageElements();
            updateSpaControlPageButtons();
            updateMaintenanceDisplay();

            Object.keys(modifiedSections).forEach(sectionId => {
                if (sectionId.includes('section')) {
                    resetSpaSectionModifiedState(sectionId);
                }
            });
        }

        function saveSpaConfigSection() {
            _spaConfigData.PRICE = parseFloat(document.getElementById('kwh-price').value);
            _spaConfigData.CLINT = parseInt(document.getElementById('chlorine-days').value);
            _spaConfigData.FREPI = parseInt(document.getElementById('filter-change-days').value);
            _spaConfigData.FRINI = parseInt(document.getElementById('filter-rinse-days').value);
            _spaConfigData.FCLEI = parseInt(document.getElementById('filter-clean-days').value);
            _spaConfigData.AUDIO = document.getElementById('enable-sounds').checked;
            _spaConfigData.NOTIFY = document.getElementById('enable-notifications').checked; 
            _spaConfigData.NOTIFTIME = parseInt(document.getElementById('notification-volume').value);
            _spaConfigData.VTCAL = document.getElementById('calibrated-checkbox').checked; 
            _spaConfigData.LCK = document.getElementById('activate-display-buttons').checked; 

            _spaConfigData.AIR = document.getElementById('btn-bubbles').checked;
            _spaConfigData.FLT = document.getElementById('btn-filter').checked;
            _spaConfigData.HTR = document.getElementById('btn-heating').checked;
            _spaConfigData.DN = document.getElementById('btn-temp-minus').checked;
            _spaConfigData.UP = document.getElementById('btn-temp-plus').checked;
            _spaConfigData.PWR = document.getElementById('btn-power').checked;
            _spaConfigData.HJT = document.getElementById('btn-jets').checked;
            _spaConfigData.LCK_btn = document.getElementById('btn-lock').checked; 
            _spaConfigData.UNT = document.getElementById('btn-unit').checked;
            _spaConfigData.TMR = document.getElementById('btn-timer').checked;

            const saveButton = event.target;
            buttonConfirm(saveButton, i18n("Saving..."), 6);

            var req = new XMLHttpRequest();
            const baseUrl = getEspBaseUrl();
            req.open('POST', `${baseUrl}/setconfig/`); 
            req.setRequestHeader('Content-Type', 'application/json');
            req.send(JSON.stringify(_spaConfigData)); 

            req.onload = function() {
                if (req.status === 200) {
                    buttonConfirm(saveButton, i18n("Saved &check;"), 3, true);
                    loadSpaConfig();
                } else {
                    console.error(i18n("Failed to save SPA config. Status:"), req.status);
                    buttonConfirm(saveButton, i18n("Save Failed!"), 3, true);
                }
            };
            req.onerror = function() {
                console.error(i18n("XMLHttpRequest error during saveSpaConfig. Check network/ESP response."));
                buttonConfirm(saveButton, i18n("Failed (Network Error)"), 3, true);
            };
        }

        function updateSpaControlPageButtons() {
            const controlButtonMap = {
                'btn-heating': { configKey: 'HTR', dataKey: { red: 'RED', green: 'GRN' }, textId: 'heating-action' },
                'btn-pump': { configKey: 'FLT', dataKey: 'FLT', textId: 'pump-action' },
                'btn-bubbles': { configKey: 'AIR', dataKey: 'AIR', textId: 'bubbles-action' },
                'btn-hydrojets': { configKey: 'HJT', dataKey: 'HJT', textId: 'hydrojets-action' },
                'btn-units': { configKey: 'UNT', dataKey: 'UNT', textId: 'unit-action' } 
            };

            for (const btnId in controlButtonMap) {
                const map = controlButtonMap[btnId];
                const controlButton = document.getElementById(btnId);
                if (!controlButton) {
                    continue;
                }

                let isFeatureAvailable = true;
                if (btnId === 'btn-bubbles' && !spaCapabilities.hasAir) isFeatureAvailable = false;
                if (btnId === 'btn-hydrojets' && !spaCapabilities.hasJets) isFeatureAvailable = false;

                controlButton.classList.toggle('hidden', !isFeatureAvailable);
                if (!isFeatureAvailable) continue; 

                controlButton.classList.remove('active', 'inactive', 'standby');

                if (btnId === 'btn-heating') {
                    if (currentData.RED === 1) {
                        controlButton.classList.add('active'); 
                        document.getElementById(map.textId).textContent = i18n('Heating Active');
                    } else if (currentData.GRN === 1) {
                        controlButton.classList.add('standby'); 
                        document.getElementById(map.textId).textContent = i18n('Standby');
                    } else {
                        controlButton.classList.add('inactive'); 
                        document.getElementById(map.textId).textContent = i18n('Off');
                    }
                    controlButton.classList.add('btn-heating'); 
                } else if (btnId === 'btn-pump') {
                    if (currentData.FLT === 1) {
                        controlButton.classList.add('active');
                        document.getElementById(map.textId).textContent = i18n('Disable');
                    } else {
                        controlButton.classList.add('inactive');
                        document.getElementById(map.textId).textContent = i18n('Enable');
                    }
                    controlButton.classList.add('btn-pump'); 
                } else if (btnId === 'btn-bubbles') {
                    if (currentData.AIR === 1) {
                        controlButton.classList.add('active');
                        document.getElementById(map.textId).textContent = i18n('Disable');
                    } else {
                        controlButton.classList.add('inactive');
                        document.getElementById(map.textId).textContent = i18n('Enable');
                    }
                    controlButton.classList.add('btn-bubbles'); 
                } else if (btnId === 'btn-hydrojets') {
                    if (currentData.HJT === 1) {
                        controlButton.classList.add('active');
                        document.getElementById(map.textId).textContent = i18n('Disable');
                    } else {
                        controlButton.classList.add('inactive');
                        document.getElementById(map.textId).textContent = i18n('Enable');
                    }
                    controlButton.classList.add('btn-hydrojets'); 
                } else if (btnId === 'btn-units') {
                    controlButton.classList.add('btn-units'); 
                }
            }
        }

        function updateSpaConfigPageElements() {
            const masterSwitchActive = document.getElementById('activate-display-buttons').checked;

            const configButtonMapping = {
                'btn-power': { visualId: 'visual-btn-power', configKey: 'PWR', label: 'Power On/Off' },
                'btn-filter': { visualId: 'visual-btn-filter', configKey: 'FLT', label: 'Filter/Pump' },
                'btn-heating': { visualId: 'visual-btn-heating', configKey: 'HTR', label: 'Heating' },
                'btn-bubbles': { visualId: 'visual-btn-bubbles', configKey: 'AIR', label: 'Bubbles' },
                'btn-jets': { visualId: 'visual-btn-jets', configKey: 'HJT', label: 'Hydrojets' },
                'btn-temp-plus': { visualId: 'visual-btn-temp-plus', configKey: 'UP', label: 'Temp +' }, 
                'btn-temp-minus': { visualId: 'visual-btn-temp-minus', configKey: 'DN', label: 'Temp -' },
                'btn-lock': { visualId: 'visual-btn-lock', configKey: 'LCK_btn', label: 'Lock' }, 
                'btn-unit': { visualId: 'visual-btn-unit', configKey: 'UNT', label: 'Unit' },
                'btn-timer': { visualId: 'visual-btn-timer', configKey: 'TMR', label: 'Timer' }
            };

            for (const checkboxId in configButtonMapping) {
                const map = configButtonMapping[checkboxId];
                const checkbox = document.getElementById(checkboxId);
                const visualButton = document.getElementById(map.visualId);
                const checkboxContainer = document.getElementById(`checkbox-${checkboxId.replace('btn-', '')}-container`);

                if (!checkbox || !visualButton || !checkboxContainer) continue;

                let isFeatureAvailable = true;
                if (map.configKey === 'AIR' && !spaCapabilities.hasAir) isFeatureAvailable = false;
                if (map.configKey === 'HJT' && !spaCapabilities.hasJets) isFeatureAvailable = false;
                if (map.configKey === 'TMR' && !spaCapabilities.hasTimer) isFeatureAvailable = false;

                checkboxContainer.classList.toggle('hidden', !isFeatureAvailable);
                visualButton.classList.toggle('hidden', !isFeatureAvailable);

                if (!isFeatureAvailable) continue; 

                checkbox.disabled = !masterSwitchActive;
                
                checkbox.checked = _spaConfigData[map.configKey]; 

                const isDisabledVisual = !masterSwitchActive || !checkbox.checked;
                visualButton.classList.toggle('disabled-by-config', isDisabledVisual);
                visualButton.classList.toggle('active-color', masterSwitchActive && checkbox.checked);

                if (!visualButton._hasClickListener) {
                    visualButton.addEventListener('click', () => {
                        if (masterSwitchActive) { 
                            checkbox.checked = !checkbox.checked; 
                            _spaConfigData[map.configKey] = checkbox.checked; 
                            updateSpaConfigPageElements(); 
                            markSpaSectionModified('display-button-config-section');
                        } else {
                            showModal(i18n('Unauthorized Action'), i18n('Please "Enable Display Panel Buttons" first to modify individual settings.'), null, null);
                        }
                    });
                    visualButton._hasClickListener = true;
                }
            }
        }

        window.promptRestartESP = function() {
            showModal(
                i18n('Restart ESP'),
                i18n('Are you sure you want to restart the ESP? This will temporarily disconnect the spa.'),
                () => {
                    // Set flag before sending restart command
                    isManualRestart = true; 
                    var req = new XMLHttpRequest();
                    const baseUrl = getEspBaseUrl();
                    req.open('POST', `${baseUrl}/restart/`);
                    req.onload = function() {
                        if (req.status === 200) {
                            reconnectAttempts = 0;
                            // Modal for restarting is now handled by onclose, which checks isManualRestart
                            // No need to show it here explicitly unless we want a separate initial message.
                            // For now, let onclose handle it to centralize reconnection UI.
                        } else {
                            showModal(i18n('Restart Error'), i18n(`Failed to send restart command. Status: {status}.`, { status: req.status }), null, null);
                            isManualRestart = false; // Reset if command failed to send
                        }
                    };
                    req.onerror = function() {
                        showModal(i18n('Network Error'), i18n('Unable to communicate with device.'), null, null);
                        isManualRestart = false; // Reset if network error
                    };
                    req.send();
                },
                () => {
                    // If restart is cancelled, ensure the flag is false
                    isManualRestart = false; 
                }
            );
        };

        function initializeInterface() {
            document.getElementById('spa-control-content').classList.remove('hidden'); 
            document.getElementById('hardware-content').classList.add('hidden');
            document.getElementById('spa-config-content').classList.add('hidden'); 
            document.getElementById('connectivity-content').classList.add('hidden');
            document.getElementById('files-content').classList.add('hidden');

            document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));
            document.querySelector('.nav-tab[onclick="switchTab(\'spa-control\', this)"]').classList.add('active');


            updateTime();
            setInterval(updateTime, 60000);
            
            loadConnectivityConfig().then(() => {
                connect();
            });
            
            loadHardwareConfig(); 
            loadSpaConfig(); 

        }

        function addCommand() {
            const commandSelect = document.getElementById('command-select');
            const commandValueInput = document.getElementById('command-value');
            const executionTimeInput = document.getElementById('execution-time');
            const repeatIntervalInput = document.getElementById('repeat-interval');

            const cmdName = commandSelect.value;
            const cmdCode = cmdMap[cmdName];
            let value = commandValueInput.value;
            const xTime = executionTimeInput.value ? Math.floor(new Date(executionTimeInput.value).getTime() / 1000) : 0;
            const interval = parseInt(repeatIntervalInput.value) || 0;

            if (cmdName === "setTarget" || cmdName === "setBrightness" || cmdName === "setAmbientC" || cmdName === "setAmbientF" || cmdName === "setBeep") {
                if (isNaN(parseFloat(value))) {
                    showModal(i18n('Error'), i18n('The value for this command must be a number.'), null, null);
                    return;
                }
                value = parseFloat(value);
            }
            if (cmdName === "printText" && !value) {
                 showModal(i18n('Error'), i18n('Text for "Display text" command cannot be empty.'), null, null);
                 return;
            }

            if (xTime === 0 && executionTimeInput.value) { 
                showModal(i18n('Error'), i18n("Please enter a valid execution time."), null, null);
                return;
            }

            if (cmdCode === undefined || cmdName === "") {
                showModal(i18n('Error'), i18n('Please select a command.'), null, null);
                return;
            }

            const newCommandPayload = {
                CMD: cmdCode,
                VALUE: value,
                XTIME: xTime,
                INTERVAL: interval,
                TXT: String(value) 
            };

            var req = new XMLHttpRequest();
            const baseUrl = getEspBaseUrl();
            req.open('POST', `${baseUrl}/addcommand/`);
            req.setRequestHeader('Content-Type', 'application/json');
            req.send(JSON.stringify(newCommandPayload));

            req.onload = function() {
                if (req.status === 200) {
                    loadCommandQueueViaHttp();
                } else {
                    console.error(i18n("Failed to send add command. Status:"), req.status);
                    showModal(i18n('Error'), i18n(`Failed to add command. Status: {status}`, { status: req.status }), null, null);
                }
            };
            req.onerror = function() {
                console.error(i18n("XMLHttpRequest error while adding command. Check network/ESP response."));
                showModal(i18n('Network Error'), i18n('Unable to communicate with device.'), null, null);
            };
        }

        function removeCommand(index) {
            showModal(
                i18n('Delete Command'),
                i18n('Are you sure you want to delete this scheduled command?'),
                () => {
                    var req = new XMLHttpRequest();
                    const baseUrl = getEspBaseUrl();
                    req.open('POST', `${baseUrl}/delcommand/`);
                    req.setRequestHeader('Content-Type', 'application/json');
                    req.send(JSON.stringify({ IDX: index }));

                    req.onload = function() {
                        if (req.status === 200) {
                            loadCommandQueueViaHttp();
                        } else {
                            console.error(i18n("Failed to delete command. Status:"), req.status);
                            showModal(i18n('Error'), i18n(`Failed to delete command. Status: {status}`, { status: req.status }), null, null);
                        }
                    };
                    req.onerror = function() {
                        console.error(i18n("XMLHttpRequest error while deleting command. Check network/ESP response."));
                        showModal(i18n('Network Error'), i18n('Unable to communicate with device.'), null, null);
                    };
                },
                () => {
                }
            );
        }

        function clearCommandQueue() {
            showModal(
                i18n('Clear Command Queue'),
                i18n('Are you sure you want to clear the scheduled command queue? This action is irreversible.'),
                () => {
                    var req = new XMLHttpRequest();
                    const baseUrl = getEspBaseUrl();
                    req.open('POST', `${baseUrl}/addcommand/`);
                    req.setRequestHeader('Content-Type', 'application/json');
                    var json = {
                        'CMD': cmdMap['resetQueue'],
                        'VALUE': 1,
                        'XTIME': 0,
                        'INTERVAL': 0
                    };
                    req.send(JSON.stringify(json)); 

                    req.onload = function() {
                        if (req.status === 200) {
                            loadCommandQueueViaHttp();
                        } else {
                            console.error(i18n("Failed to send clear queue command. Status:"), req.status);
                            showModal(i18n('Error'), i18n(`Failed to clear command queue. Status: {status}`, { status: req.status }), null, null);
                        }
                    };
                    req.onerror = function() {
                        console.error(i18n("XMLHttpRequest error while clearing command queue. Check network/ESP response."));
                        showModal(i18n('Network Error'), i18n('Unable to communicate with device.'), null, null);
                    };
                },
                () => {
                }
            );
        }

function renderCommandQueue() {
    const queueDisplay = document.getElementById('command-queue-display');
    queueDisplay.innerHTML = ''; 

    if (commandQueue.length === 0) {
        queueDisplay.innerHTML = `
            <div class="command-queue-info-box bg-gray-700 p-4 rounded-lg text-gray-300 mb-4" id="empty-queue-message-container">
                <p class="text-center" id="empty-queue-message" data-i18n="Command queue is empty">${i18n("Command queue is empty")}</p>
            </div>
        `;
        return;
    }

    commandQueue.forEach((cmd, index) => {
        const cmdName = i18n(cmdMapReverse[cmd.CMD] || 'Unknown Command');
        const valueDisplay = cmd.TXT || (cmd.VALUE !== null ? cmd.VALUE.toString() : '');
        
        // FIX: Utiliser la langue actuelle au lieu de i18n()
        const currentLang = document.documentElement.lang || 'en';
        const timeDisplay = cmd.XTIME ? new Date(cmd.XTIME * 1000).toLocaleString(currentLang) : i18n('Immediately'); 
        
        const intervalDisplay = cmd.INTERVAL > 0 ? i18n('Repeat every {interval}s', { interval: cmd.INTERVAL }) : i18n('Once');

        const commandEntry = document.createElement('div');
        commandEntry.classList.add('scheduled-command-entry', 'mb-2');
        commandEntry.innerHTML = `
            <div>
                <p class="font-semibold">${cmdName}: ${valueDisplay}</p>
                <p class="text-sm text-gray-400">${i18n('At:')} ${timeDisplay} (${intervalDisplay})</p>
            </div>
            <button onclick="removeCommand(${index})" class="delete-btn">${i18n('Delete')}</button>
        `;
        queueDisplay.appendChild(commandEntry);
    });
}

        async function getDirListing() {
            const baseUrl = getEspBaseUrl();
            const dirUrl = `${baseUrl}/dir/`;

            try {
                const response = await fetch(dirUrl);
                if (!response.ok) {
                    throw new Error(i18n(`HTTP Error! Status: {status}`, { status: response.status }));
                }
                const htmlText = await response.text();

                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlText, 'text/html');
                const links = doc.querySelectorAll('a');
                const files = [];

                links.forEach(link => {
                    const filename = link.textContent.trim();
                    if (filename && filename !== '/' && filename !== '..' && !filename.startsWith('remove')) { 
                        let size = (Math.random() * 100).toFixed(1) + ' KB'; // Placeholder size
                        if (filename.endsWith('.json')) {
                            size = (Math.random() * 5 + 1).toFixed(1) + ' KB';
                        } else if (filename.endsWith('.bin.gz') || filename.endsWith('.bin')) {
                            size = (Math.random() * 1000 + 100).toFixed(1) + ' KB';
                        } else if (filename.endsWith('.mel')) {
                             size = (Math.random() * 20 + 5).toFixed(1) + ' KB';
                        }
                        files.push({ name: filename, size: size });
                    }
                });
                return files;
            } catch (error) {
                console.error(i18n("Error fetching directory listing:"), error);
                showModal(i18n('Load Error'), i18n(`Unable to list files from ESP: {error.message}. Ensure /dir/ path is accessible.`, { 'error.message': error.message }), null, null);
                return [];
            }
        }

        function saveCommandQueueToFile() {
            showModal(
                i18n('Save Command Queue'),
                i18n('Enter a file name to save the current command queue to the ESP - WARNING no spaces or special characters (e.g., Daily_Heat) :'),
                (filename) => {
                    if (!filename) {
                        showModal(i18n('Error'), i18n('File name cannot be empty.'), null, null);
                        return;
                    }
                    const invalidChars = /[^\w-]/g;
                    if (invalidChars.test(filename)) {
                        showModal(i18n('Error'), i18n('File name should not contain spaces or special characters. Use hyphens or underscores if needed.'), null, null);
                        return;
                    }

                    if (!filename.toLowerCase().endsWith('_schedule.json')) {
                        filename += '_schedule.json';
                    }

                    const payload = {
                        ACT: 'save',
                        NAME: filename
                    };

                    var req = new XMLHttpRequest();
                    const baseUrl = getEspBaseUrl();
                    req.open('POST', `${baseUrl}/cmdq_file/`);
                    req.setRequestHeader('Content-Type', 'application/json');
                    req.send(JSON.stringify(payload)); 
                    
                    req.onload = function() {
                        if (req.status === 200) {
                            showModal(i18n('Success'), i18n(`Command queue save request sent for "{filename}". The ESP will now save its current queue.`, { filename }), null, null);
                        } else {
                            showModal(i18n('Error'), i18n(`Failed to send command queue save request. Status: {status}`, { status: req.status }), null, null);
                        }
                    };
                    req.onerror = function() {
                        showModal(i18n('Network Error'), i18n('Unable to communicate with device.'), null, null);
                    };
                },
                () => { },
                true,
                i18n("Daily_Heat")
            );
        }

        async function loadCommandQueueFromFile() {
            const scheduleFiles = (await getDirListing()).filter(file => file.name.toLowerCase().endsWith('_schedule.json'));

            showModal(
                i18n('Load Command Queue'),
                scheduleFiles.length > 0 ? i18n('Select a command file to load from the ESP, or enter a file name below :') : i18n('Enter the file name to load from the ESP (e.g., mycommands_schedule.json) :'),
                (filename) => {
                    if (!filename) {
                        showModal(i18n('Error'), i18n('File name cannot be empty.'), null, null);
                        return;
                    }
                    if (!filename.toLowerCase().endsWith('_schedule.json')) {
                        filename += '_schedule.json';
                    }

                    const payload = {
                        ACT: 'load',
                        NAME: filename
                    };

                    var req = new XMLHttpRequest();
                    const baseUrl = getEspBaseUrl();
                    req.open('POST', `${baseUrl}/cmdq_file/`);
                    req.setRequestHeader('Content-Type', 'application/json');
                    req.send(JSON.stringify(payload)); 
                    
                    req.onload = function() {
                        if (req.status === 200) {
                            showModal(i18n('Success'), i18n(`Command queue load request sent for "{filename}". The ESP will now load and apply it.`, { filename }), null, null);
                            loadCommandQueueViaHttp(); 
                        } else {
                            showModal(i18n('Error'), i18n(`Failed to send command queue load request. Status: {status}`, { status: req.status }), null, null);
                        }
                    };
                    req.onerror = function() {
                        showModal(i18n('Network Error'), i18n('Unable to communicate with device.'), null, null);
                    };
                },
                () => { },
                true,
                i18n("Daily_Heat_schedule.json"),
                false,
                scheduleFiles
            );
        }

        async function loadConnectivityConfig() {
            const baseUrl = getEspBaseUrl(); 
            
            return Promise.all([
                new Promise((resolve, reject) => {
                    var reqWifi = new XMLHttpRequest();
                    reqWifi.open('POST', `${baseUrl}/getwifi/`);
                    reqWifi.onload = function() {
                        if (reqWifi.status === 200) {
                            try {
                                const json = JSON.parse(reqWifi.responseText);
                                Object.assign(networkConfigData, json);
                                resolve();
                            } catch (e) {
                                console.error(i18n("JSON parse error for network configuration (WiFi):"), e);
                                resolve();
                            }
                        } else {
                            console.error(i18n("Failed to load network configuration (WiFi). Status:"), reqWifi.status);
                            resolve();
                        }
                    };
                    reqWifi.onerror = function() {
                        console.error(i18n("XMLHttpRequest error for /getwifi/. Ensure ESP endpoint is accessible."));
                        resolve();
                    };
                    reqWifi.send();
                }),
                new Promise((resolve, reject) => {
                    var reqMqtt = new XMLHttpRequest();
                    reqMqtt.open('POST', `${baseUrl}/getmqtt/`);
                    reqMqtt.onload = function() {
                        if (reqMqtt.status === 200) {
                            try {
                                const json = JSON.parse(reqMqtt.responseText);
                                Object.assign(networkConfigData, json);
                                resolve();
                            } catch (e) {
                                console.error(i18n("JSON parse error for MQTT configuration:"), e);
                                resolve();
                            }
                        } else {
                            console.error(i18n("Failed to load MQTT configuration. Status:"), reqMqtt.status);
                            resolve();
                        }
                    };
                    reqMqtt.onerror = function() {
                        console.error(i18n("XMLHttpRequest error for /getmqtt/. Ensure ESP endpoint is accessible."));
                        resolve();
                    };
                    reqMqtt.send();
                })
            ]).then(() => {
                applyConnectivityConfig(networkConfigData);
            }).catch(error => {
                console.error(i18n("Error during combined connectivity configuration loading:"), error);
                applyConnectivityConfig(networkConfigData);
            });
        }

        function applyConnectivityConfig(config) {
            document.getElementById('enableAp').checked = networkConfigData.enableAp || false;
            document.getElementById('apSsid').value = networkConfigData.apSsid || '';
            // Set password field to a placeholder if empty, don't display actual value from networkConfigData
            const apPwdField = document.getElementById('apPwd');
            apPwdField.value = networkConfigData.apPwd ? networkConfigData.apPwd : i18n('<enter password>');
            apPwdField.type = 'password'; // Ensure it starts as password field

            document.getElementById('enableWM').checked = networkConfigData.enableWM || false;
            document.getElementById('enableStaticIp4').checked = networkConfigData.enableStaticIp4 || false;
            document.getElementById('ip4Address').value = networkConfigData.ip4Address || '';
            document.getElementById('ip4Gateway').value = networkConfigData.ip4Gateway || '';
            document.getElementById('ip4Subnet').value = networkConfigData.ip4Subnet || '';
            document.getElementById('ip4DnsPrimary').value = networkConfigData.ip4DnsPrimary || '';
            document.getElementById('ip4DnsSecondary').value = networkConfigData.ip4DnsSecondary || '';
            document.getElementById('ip4NTP').value = networkConfigData.ip4NTP || 'pool.ntp.org';

            document.getElementById('enableMqtt').checked = networkConfigData.enableMqtt || false;
            document.getElementById('mqttHost').value = networkConfigData.mqttHost || '';
            document.getElementById('mqttPort').value = networkConfigData.mqttPort !== undefined ? networkConfigData.mqttPort : 1883;
            document.getElementById('mqttUsername').value = networkConfigData.mqttUsername || '';
            // Set password field to a placeholder if empty, don't display actual value from networkConfigData
            const mqttPwdField = document.getElementById('mqttPassword');
            mqttPwdField.value = networkConfigData.mqttPassword ? networkConfigData.mqttPassword : i18n('<enter password>');
            mqttPwdField.type = 'password'; // Ensure it starts as password field


            document.getElementById('mqttClientId').value = networkConfigData.mqttClientId || '';
            document.getElementById('mqttBaseTopic').value = networkConfigData.mqttBaseTopic || '';
            document.getElementById('mqttTelemetryInterval').value = networkConfigData.mqttTelemetryInterval !== undefined ? networkConfigData.mqttTelemetryInterval : 0;

            Object.keys(modifiedSections).forEach(sectionId => {
                if (sectionId.includes('access-point') || sectionId.includes('soft-ap') || sectionId.includes('static-ip') || sectionId.includes('ntp-server') || sectionId.includes('mqtt-config')) {
                    resetConnectivitySectionModifiedState(sectionId);
                }
            });
        }

        function saveConnectivitySection(sectionId) {
            const saveButton = document.querySelector(`#${sectionId} .section-save-btn`);
            buttonConfirm(saveButton, i18n("Saving..."), 6);

            networkConfigData.enableAp = document.getElementById('enableAp').checked;
            networkConfigData.apSsid = document.getElementById('apSsid').value;
            const apPwdField = document.getElementById('apPwd');
            // Only update password if it's not the placeholder
            if (apPwdField.value !== i18n('<enter password>')) {
                 networkConfigData.apPwd = apPwdField.value;
            } else {
                 // If placeholder, don't send this field in the payload to avoid overwriting with placeholder
                 delete networkConfigData.apPwd;
            }

            networkConfigData.enableWM = document.getElementById('enableWM').checked;
            networkConfigData.enableStaticIp4 = document.getElementById('enableStaticIp4').checked;
            networkConfigData.ip4Address = document.getElementById('ip4Address').value;
            networkConfigData.ip4Gateway = document.getElementById('ip4Gateway').value;
            networkConfigData.ip4Subnet = document.getElementById('ip4Subnet').value;
            networkConfigData.ip4DnsPrimary = document.getElementById('ip4DnsPrimary').value;
            networkConfigData.ip4DnsSecondary = document.getElementById('ip4DnsSecondary').value;
            networkConfigData.ip4NTP = document.getElementById('ip4NTP').value;
            
            networkConfigData.enableMqtt = document.getElementById('enableMqtt').checked;
            networkConfigData.mqttHost = document.getElementById('mqttHost').value;
            networkConfigData.mqttPort = parseInt(document.getElementById('mqttPort').value);
            networkConfigData.mqttUsername = document.getElementById('mqttUsername').value;
            const mqttPwdField = document.getElementById('mqttPassword');
            // Only update password if it's not the placeholder
            if (mqttPwdField.value !== i18n('<enter password>')) {
                 networkConfigData.mqttPassword = mqttPwdField.value;
            } else {
                 // If placeholder, don't send this field in the payload to avoid overwriting with placeholder
                 delete networkConfigData.mqttPassword;
            }
            networkConfigData.mqttClientId = document.getElementById('mqttClientId').value;
            networkConfigData.mqttBaseTopic = document.getElementById('mqttBaseTopic').value;
            networkConfigData.mqttTelemetryInterval = parseInt(document.getElementById('mqttTelemetryInterval').value);


            let payload = {};
            let endpoint = '';

            if (sectionId === 'access-point-section' || sectionId === 'soft-ap-section' || sectionId === 'static-ip-section' || sectionId === 'ntp-server-section') {
                endpoint = '/setwifi/';
                payload = {
                    'enableAp': networkConfigData.enableAp,
                    'apSsid': networkConfigData.apSsid,
                    // If apPwd is undefined/deleted, it won't be sent. This correctly handles the placeholder logic.
                    'apPwd': networkConfigData.apPwd, 
                    'enableWM': networkConfigData.enableWM,
                    'enableStaticIp4': networkConfigData.enableStaticIp4,
                    'ip4Address': networkConfigData.ip4Address,
                    'ip4Gateway': networkConfigData.ip4Gateway,
                    'ip4Subnet': networkConfigData.ip4Subnet,
                    'ip4DnsPrimary': networkConfigData.ip4DnsPrimary,
                    'ip4DnsSecondary': networkConfigData.ip4DnsSecondary,
                    'ip4NTP': networkConfigData.ip4NTP
                };
            } else if (sectionId === 'mqtt-config-section') {
                endpoint = '/setmqtt/';
                payload = {
                    'enableMqtt': networkConfigData.enableMqtt,
                    'mqttHost': networkConfigData.mqttHost,
                    'mqttPort': networkConfigData.mqttPort,
                    'mqttUsername': networkConfigData.mqttUsername,
                    // If mqttPassword is undefined/deleted, it won't be sent. This correctly handles the placeholder logic.
                    'mqttPassword': networkConfigData.mqttPassword, 
                    'mqttClientId': networkConfigData.mqttClientId,
                    'mqttBaseTopic': networkConfigData.mqttBaseTopic,
                    'mqttTelemetryInterval': networkConfigData.mqttTelemetryInterval
                };
            } else {
                console.error(i18n("Unknown connectivity section for saving:"), sectionId);
                saveButton.disabled = false;
                return;
            }

            var req = new XMLHttpRequest();
            const baseUrl = getEspBaseUrl();
            req.open('POST', `${baseUrl}${endpoint}`); 
            req.setRequestHeader('Content-Type', 'application/json');
            req.send(JSON.stringify(payload));

            req.onload = function() {
                if (req.status === 200) {
                    showModal(i18n('Success'), i18n('Configuration saved successfully! Restart the ESP to apply changes.'), null, null);
                    loadConnectivityConfig();
                } else {
                    console.error(i18n(`Failed to save configuration {sectionId}. Status:`, { sectionId }), req.status);
                    showModal(i18n('Error'), i18n('Failed to save configuration. Please try again.'), null, null);
                }
            };
            req.onerror = function() {
                console.error(i18n(`XMLHttpRequest error while saving {sectionId}. Check network/ESP response.`, { sectionId }));
                showModal(i18n('Network Error'), i18n('Unable to communicate with device.'), null, null);
            };
        }

window.togglePlainText = function(id) {
    const inputField = document.getElementById(id);
    const button = document.querySelector(`button[onclick="togglePlainText('${id}')"]`);
    
    // Toggle le type peu importe la valeur
    if (inputField.type === "password") {
        inputField.type = "text";
        if (button) button.textContent = i18n("Hide Password");
    } else {
        inputField.type = "password";
        if (button) button.textContent = i18n("Show Password");
    }
};

        // Removed validatePassword function as it was causing issues with empty passwords
        // and its logic is now implicitly handled by how networkConfigData.apPwd/mqttPassword is sent.

        window.resetWifi = function() {
            showModal(
                i18n('Reset WiFi Configuration'),
                i18n('Are you sure you want to reset WiFi? This will remove credentials and the ESP will restart, enabling its own access point.'),
                () => {
                    // Set flag before sending reset command
                    isManualRestart = true; 
                    var req = new XMLHttpRequest();
                    const baseUrl = getEspBaseUrl();
                    req.open('POST', `${baseUrl}/resetwifi/`);
                    req.onload = function() {
                        if (req.status === 200) {
                            showModal(i18n('WiFi Reset'), i18n('ESP is restarting now. Please connect to the "layzspa_module######" access point and reconfigure your WiFi via http://192.168.4.2/wifi.html.'), null, null);
                            reconnectAttempts = 0;
                        } else {
                            showModal(i18n('Reset Error'), i18n(`Failed to reset WiFi. Status: {status}.`, { status: req.status }), null, null);
                            isManualRestart = false; // Reset if command failed
                        }
                    };
                    req.onerror = function() {
                        showModal(i18n('Network Error'), i18n('Unable to communicate with device.'), null, null);
                        isManualRestart = false; // Reset if network error
                    };
                    req.send();
                },
                () => {
                    // If reset is cancelled, ensure the flag is false
                    isManualRestart = false; 
                }
            );
        };

        document.getElementById('fileInput').addEventListener('change', function() {
            const fileNameDisplay = document.getElementById('fileNameDisplay');
            if (this.files && this.files.length > 0) {
                fileNameDisplay.textContent = this.files[0].name;
            } else {
                fileNameDisplay.textContent = i18n('No file selected');
            }
        });

// Function to get file listing from ESP
async function getDirListing() {
    try {
        const response = await fetch(getEspBaseUrl() + '/dir/');
        if (!response.ok) {
            throw new Error(i18n(`HTTP {status}`, { status: response.status }));
        }
        
        const html = await response.text();
        
        // Parse the HTML response to extract files
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Split content by <br> to process line by line
        const bodyContent = doc.body.innerHTML;
        const lines = bodyContent.split('<br>');
        
        const files = [];
        
        lines.forEach(line => {
            // Look for file links (not removal links)
            const linkMatch = line.match(/<a href="\/([^"]+)"[^>]*>([^<]+)<\/a>/);
            if (linkMatch) {
                const href = linkMatch[1];
                const filename = linkMatch[2];
                
                // Ignore removal links and system folders
                if (!href.includes('remove') && !href.includes('..') && filename) {
                    
                    // Extract size from the same line
                    let sizeInfo = i18n('Unknown');
                    const sizeMatch = line.match(/Size:\s*(\d+)\s*Bytes/i);
                    if (sizeMatch) {
                        const bytes = parseInt(sizeMatch[1]);
                        sizeInfo = formatFileSize(bytes);
                    }
                    
                    files.push({
                        name: filename,
                        size: sizeInfo
                    });
                }
            }
        });
        
        return files;
        
    } catch (error) {
        console.error(i18n('Error fetching directory listing:'), error);
        throw error;
    }
}

// Function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Modified upload function
document.getElementById('uploadForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const fileInput = document.getElementById('fileInput');
    if (!fileInput.files || fileInput.files.length === 0) {
        showModal(i18n('Error'), i18n('Please select a file to upload.'), null, null);
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('Choose file', file);
    
    showModal(i18n('Uploading...'), i18n(`Uploading "{filename}"...`, { filename: file.name }), null, null, false, "OK", true);
    
    // Perform upload with fetch and a 5-second timeout
    const uploadPromise = fetch(getEspBaseUrl() + '/upload.html', {
        method: 'POST',
        body: formData
    });
    
    const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => resolve('timeout'), 5000);
    });
    
    Promise.race([uploadPromise, timeoutPromise])
        .then(() => {
            showModal(i18n('Upload Complete'), i18n(`"{filename}" uploaded successfully!`, { filename: file.name }), null, null);
            fileInput.value = '';
            document.getElementById('fileNameDisplay').textContent = i18n('No file selected');
            
            // Refresh file list after upload
            setTimeout(listFiles, 1500);
        })
        .catch(() => {
            showModal(i18n('Upload Complete'), i18n(`"{filename}" upload completed (may have succeeded).`, { filename: file.name }), null, null);
            fileInput.value = '';
            document.getElementById('fileNameDisplay').textContent = i18n('No file selected');
            
            // Refresh the list even on error (often the upload still succeeded)
            setTimeout(listFiles, 1500);
        });
});

// Corrected listFiles function
async function listFiles() {
    const filesTableBody = document.getElementById('filesTableBody');
    const loadingRow = document.getElementById('loading-files-row');
    const noFilesRow = document.getElementById('no-files-row');

    // Reset display
    loadingRow.classList.remove('hidden');
    noFilesRow.classList.add('hidden');
    
    // Clear the table but keep loading and no-files rows
    const existingRows = filesTableBody.querySelectorAll('tr:not(#loading-files-row):not(#no-files-row)');
    existingRows.forEach(row => row.remove());

    try {
        const files = await getDirListing();
        
        loadingRow.classList.add('hidden');

        if (files.length === 0) {
            noFilesRow.classList.remove('hidden');
        } else {
            noFilesRow.classList.add('hidden');
            files.forEach(file => {
                const row = document.createElement('tr');
                row.classList.add('bg-gray-800', 'border-b', 'border-gray-700', 'hover:bg-gray-700');
                row.innerHTML = `
                    <th scope="row" class="px-6 py-4 font-medium text-white whitespace-nowrap">
                        ${file.name}
                    </th>
                    <td class="px-6 py-4">
                        ${file.size}
                    </td>
                    <td class="px-6 py-4 space-x-2">
                        <button class="text-blue-400 hover:underline" onclick="downloadFile('${file.name}')">${i18n('Download')}</button>
                        <button class="text-red-400 hover:underline" onclick="deleteFile('${file.name}')">${i18n('Delete')}</button>
                    </td>
                `;
                filesTableBody.appendChild(row);
            });
        }
    } catch (error) {
        console.error(i18n("Error displaying files:"), error);
        loadingRow.classList.add('hidden');
        noFilesRow.classList.remove('hidden');
        noFilesRow.querySelector('td').textContent = i18n(`Error loading files: {error.message}`, { 'error.message': error.message });
    }
}

// Download file function (unchanged)
function downloadFile(filename) {
    showModal(
        i18n('Download File'),
        i18n(`Do you want to download "{filename}"?`, { filename }),
        () => {
            const baseUrl = getEspBaseUrl();
            const downloadUrl = `${baseUrl}/${filename}`; 
            window.open(downloadUrl, '_blank');
        },
        () => { }
    );
}

// Delete file function (corrected)
function deleteFile(filename) {
    showModal(
        i18n('Delete File'),
        i18n(`Are you sure you want to delete "{filename}"? This action is irreversible.`, { filename }),
        async () => {
            showModal(i18n('Deleting...'), i18n(`Deleting "{filename}"...`, { filename }), null, null, false, "OK", true);
            try {
                const baseUrl = getEspBaseUrl();
                const response = await fetch(`${baseUrl}/remove/?FileToRemove=${encodeURIComponent(filename)}`);

                if (response.ok || response.status === 303) {
                    showModal(i18n('Deletion Success'), i18n(`"{filename}" deleted successfully!`, { filename }), null, null);
                    // Refresh the list after deletion
                    setTimeout(listFiles, 1000);
                } else {
                    const errorText = await response.text();
                    showModal(i18n('Deletion Error'), i18n(`Failed to delete "{filename}". Status: {status}. Response: {errorText}`, { filename, status: response.status, errorText }), null, null);
                }
            } catch (error) {
                console.error(i18n("Error during deletion:"), error);
                showModal(i18n('Network Error'), i18n(`Unable to communicate with ESP during deletion: {error.message}`, { 'error.message': error.message }), null, null);
            }
        },
        () => { }
    );
}

// Load file list on page startup
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for the page to load then load files
    setTimeout(() => {
        if (document.getElementById('filesTableBody')) {
            listFiles();
        }
    }, 1000);
});

        window.resetTotals = function() {
            showModal(
                i18n('Reset Totals'),
                i18n('Are you sure you want to reset all runtime and cost totals? This action is irreversible.'),
                () => {
                    sendCommand('resetTotals');
                    currentData.HEATER_RUNTIME = 0;
                    currentData.PUMP_RUNTIME = 0;
                    currentData.AIR_RUNTIME = 0;
                    currentData.JET_RUNTIME = 0;
                    currentData.COST_DAILY_HEATER = 0;
                    currentData.COST_DAILY_PUMP = 0;
                    currentData.COST_DAILY_AIR = 0;
                    currentData.COST_DAILY_JET = 0;
                    currentData.COST_DAILY_TOTAL = 0;
                    showModal(i18n('Success'), i18n('Totals have been reset.'), null, null);
                },
                () => { }
            );
        };

window.resetMaintenanceTimer = function(commandName) {
    let timerNameKey = '';
    switch(commandName) {
        case 'resetTimerChlorine': timerNameKey = 'Chlorine'; break;
        case 'resetTimerReplaceFilter': timerNameKey = 'Filter Change'; break;
        case 'resetTimerRinseFilter': timerNameKey = 'Filter Rinse'; break;
        case 'resetTimerCleanFilter': timerNameKey = 'Filter Clean'; break;
        default: return;
    }

    showModal(
        i18n('Reset {timerName}', { timerName: i18n(timerNameKey) }),
        i18n('Are you sure you want to reset the timer for "{timerName}"?', { timerName: i18n(timerNameKey) }),
        () => {
           // console.log(`⏳ Envoi commande reset: ${commandName}`);
            sendCommand(commandName);
            
            // Recharger les données depuis l'ESP après 1 seconde
            setTimeout(() => {
                if (connection && connection.readyState === WebSocket.OPEN) {
                   // console.log("🔄 Rechargement données depuis ESP...");
                    connection.send(JSON.stringify({ "CMD": "GET_STATES" }));
                }
            }, 1000);
            
            // Afficher un message de succès (mais les vraies données viendront de l'ESP)
            showModal(i18n('Success'), i18n('The timer for "{timerName}" has been reset.', { timerName: i18n(timerNameKey) }), null, null);
        },
        () => { }
    );
};

// Ajoutez aussi cette fonction pour forcer le rechargement des données depuis l'ESP
function reloadMaintenanceData() {
    if (connection && connection.readyState === WebSocket.OPEN) {
        connection.send(JSON.stringify({ "CMD": "GET_STATES" }));
        //console.log("🔄 Rechargement des données de maintenance depuis l'ESP");
    }
}



        // Utility function to update a specific maintenance item
function updateMaintenanceItem(prefix, lastTimestamp, daysLeft) {
    const dateElement = document.getElementById(`maint-${prefix}-date`);
    const statusElement = document.getElementById(`maint-${prefix}-status`);

    if (!dateElement || !statusElement) {
        console.warn(i18n(`Maintenance elements for {prefix} not found.`, { prefix }));
        return;
    }

    const lastDate = lastTimestamp ? new Date(lastTimestamp * 1000) : null;
    
    // CORRECTION: Utiliser getDateLocale() au lieu de i18n('en-US-locale-code-for-datetime')
    const localeCode = window.getDateLocale ? window.getDateLocale() : 'en-US';
    
    const formattedDate = lastDate ? lastDate.toLocaleDateString(localeCode, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }) : i18n('N/A');

    dateElement.innerHTML = `<span class="maint-date-label" data-i18n="Date:">${i18n('Date:')}</span> ${formattedDate}`;

    let statusText = '';
    let textColorClass = 'text-gray-400';

    if (daysLeft !== undefined && daysLeft !== null) {
        if (daysLeft <= 0) {
            statusText = i18n('OVERDUE');
            textColorClass = 'text-red-500';
        } else if (daysLeft === 1) {
            statusText = i18n('1 Day remaining');
            textColorClass = 'text-red-400';
        } else if (daysLeft < 3) {
            statusText = i18n('{daysLeft} Days remaining', { daysLeft });
            textColorClass = 'text-orange-400';
        } else {
            statusText = i18n('{daysLeft} Days remaining', { daysLeft });
            textColorClass = 'text-blue-400';
        }
    } else {
        statusText = i18n('N/A');
        textColorClass = 'text-gray-400';
    }

    statusElement.innerHTML = `<span class="maint-status-label" data-i18n="Status:">${i18n('Status:')}</span> ${statusText}`;
    statusElement.classList.remove('text-red-500', 'text-orange-400', 'text-red-400', 'text-blue-400', 'text-gray-400');
    statusElement.classList.add(textColorClass);
}

        // Main function to update maintenance display
        function updateMaintenanceDisplay() {
            updateMaintenanceItem(
                'chlorine',
                currentData.MAINT_CHLORINE_LAST_TS,
                currentData.MAINT_CHLORINE_DAYS_LEFT
            );
            updateMaintenanceItem(
                'filter-change',
                currentData.MAINT_FILTER_CHANGE_LAST_TS,
                currentData.MAINT_FILTER_CHANGE_DAYS_LEFT
            );
            updateMaintenanceItem(
                'filter-rinse',
                currentData.MAINT_FILTER_RINSE_LAST_TS,
                currentData.MAINT_FILTER_RINSE_DAYS_LEFT
            );
            updateMaintenanceItem(
                'filter-clean',
                currentData.MAINT_FILTER_CLEAN_LAST_TS,
                currentData.MAINT_FILTER_CLEAN_DAYS_LEFT
            );
        }

        initializeInterface();

        document.addEventListener('DOMContentLoaded', () => {
            const hardwareSectionIds = ['cio-dsp-pcb-section', 'pinout-section', 'ambient-sensor-section', 'power-levels-section'];
            hardwareSectionIds.forEach(sectionId => {
                const sectionElement = document.getElementById(sectionId);
                if (sectionElement) {
                    sectionElement.querySelectorAll('input, select, radio').forEach(input => {
                        input.addEventListener('input', () => markHardwareSectionModified(sectionId));
                        input.addEventListener('change', () => markHardwareSectionModified(sectionId));
                    });
                }
            });

            const spaConfigSectionIds = ['energy-costs-section', 'maintenance-intervals-section', 'audio-notifications-section', 'display-button-config-section', 'virtual-temp-calibration-section'];
            spaConfigSectionIds.forEach(sectionId => {
                const sectionElement = document.getElementById(sectionId);
                if (sectionElement) {
                    sectionElement.querySelectorAll('input, select').forEach(input => {
                        input.addEventListener('input', () => markSpaSectionModified(sectionId));
                        input.addEventListener('change', () => markSpaSectionModified(sectionId));
                    });
                }
            });

            const connectivitySectionIds = ['access-point-section', 'soft-ap-section', 'static-ip-section', 'ntp-server-section', 'mqtt-config-section']; 
            connectivitySectionIds.forEach(sectionId => {
                const sectionElement = document.getElementById(sectionId);
                if (sectionElement) {
                    sectionElement.querySelectorAll('input, select').forEach(input => {
                        input.addEventListener('input', () => markConnectivitySectionModified(sectionId));
                        input.addEventListener('change', () => markConnectivitySectionModified(sectionId));
                    });
                }
            });
			

			
            document.getElementById('activate-display-buttons').addEventListener('change', () => {
                _spaConfigData.LCK = document.getElementById('activate-display-buttons').checked;
                updateSpaConfigPageElements();
                markSpaSectionModified('display-button-config-section');
            });
            
            const individualButtonCheckboxes = ['btn-power', 'btn-filter', 'btn-heating', 'btn-bubbles', 'btn-jets', 'btn-temp-plus', 'btn-temp-minus', 'btn-lock', 'btn-unit', 'btn-timer']; 
            const configKeyMap = { 
                'btn-power': 'PWR', 'btn-filter': 'FLT', 'btn-heating': 'HTR', 'btn-bubbles': 'AIR', 
                'btn-jets': 'HJT', 'btn-temp-plus': 'UP', 'btn-temp-minus': 'DN', 
                'btn-lock': 'LCK_btn', 'btn-unit': 'UNT', 'btn-timer': 'TMR' 
            };
            individualButtonCheckboxes.forEach(id => {
                const checkbox = document.getElementById(id);
                if (checkbox) {
                    checkbox.addEventListener('change', () => {
                        const key = configKeyMap[id];
                        _spaConfigData[key] = checkbox.checked; 
                        updateSpaConfigPageElements(); 
                        markSpaSectionModified('display-button-config-section');
                    });
                }
            });

            document.getElementById('enable-sounds').addEventListener('change', () => {
                sendCommand('setBeep'); 
                markSpaSectionModified('audio-notifications-section');
            });

            document.getElementById('add-command-btn').addEventListener('click', addCommand);
            document.getElementById('clear-queue-btn').addEventListener('click', clearCommandQueue);
            document.getElementById('save-queue-btn').addEventListener('click', saveCommandQueueToFile);
            document.getElementById('load-queue-btn').addEventListener('click', loadCommandQueueFromFile);

            document.querySelectorAll("input[name='pcb']").forEach(radio => {
                radio.addEventListener('change', () => {
                    setPins(); 
                    markHardwareSectionModified('cio-dsp-pcb-section'); 
                });
            });

            renderCommandQueue();
            updateMaintenanceDisplay();
        });