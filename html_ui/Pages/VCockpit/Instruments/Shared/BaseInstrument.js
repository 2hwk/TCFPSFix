// --------------------------
// BaseInstrument
// v 1.1.3a
// --------------------------

const TC_DEBUG = true;

class BaseInstrument extends TemplateElement {
    constructor() {
        super();
        this.urlConfig = new URLConfig();
        this.xmlConfigLoading = false;
        this._deltaTime = 0;
        this.frameCount = 0;
        this._lastTime = 0;
        this._isConnected = false;
        this._isInitialized = false;
        this._quality = Quality.high;
        this._gameState = GameState.ingame;
        this.highlightList = [];
        this.backgroundList = [];
        this.dataMetaManager = new DataReadMetaManager();
        //  ---------------------------  MOD  ------------------------------------------  //
        this._refresh = Refresh.ultra;          // Refresh at FPS by default
        this.frameReduce = 1;                   // Default reduction factor
        //  ---------------------------  MOD  ------------------------------------------  //
    }
    get initialized() { return this._isInitialized; }
    get instrumentIdentifier() {return this._instrumentId;}
    get instrumentIndex() { return (this.urlConfig.index != null) ? this.urlConfig.index : 1; }
    get isInteractive() { return false; }
    get IsGlassCockpit() { return false; }
    get isPrimary() { return (this.urlConfig.index == null || this.urlConfig.index == 1); }
    get deltaTime() { return this._deltaTime; }
    connectedCallback() {
        super.connectedCallback();
        //  ---------------------------  DEBUG  ------------------------------------------  //
        if (TC_DEBUG && g_modDebugMgr) {
            g_modDebugMgr.AddConsole(null);
        }
        //  ---------------------------  DEBUG  ------------------------------------------  //
        this.electricity = this.getChildById("Electricity");
        this.highlightSvg = this.getChildById("highlight");
        this.loadDocumentAttributes();
        this.loadURLAttributes();
        this.loadXMLConfig();
        window.document.addEventListener("OnVCockpitPanelAttributesChanged", this.loadDocumentAttributes.bind(this));
        this.startTime = Date.now();
        this.createMainLoop();
        //  ---------------------------  MOD  ------------------------------------------  //
        this.frameReduce = this.loadFrameRed();
        // DEBUG
        if (TC_DEBUG) console.log(this.instrumentIdentifier);
        //  ---------------------------  MOD  ------------------------------------------  //
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        this._isConnected = false;
    }
    Init() {
        this._isInitialized = true;
        this.initTransponder();
    }
    setInstrumentIdentifier(_identifier) {
        if (_identifier && _identifier != "" && _identifier != this.instrumentIdentifier) {
            this._instrumentId = _identifier;
            var guid = this.getAttribute("Guid");
            if (guid != undefined) {
                LaunchFlowEvent("ON_VCOCKPIT_INSTRUMENT_INITIALIZED", guid, this.instrumentIdentifier, this.isInteractive, this.IsGlassCockpit);
            }
        }
    }
    setConfigFile(_path) {
        this._xmlConfigPath = _path;
    }
    getChildById(_selector) {
        if (_selector == "")
            return null;
        if (!_selector.startsWith("#") && !_selector.startsWith("."))
            _selector = "#" + _selector;
        var child = this.querySelector(_selector.toString());
        return child;
    }
    getChildrenById(_selector) {
        if (_selector == "")
            return null;
        if (!_selector.startsWith("#") && !_selector.startsWith("."))
            _selector = "#" + _selector;
        var children = this.querySelectorAll(_selector.toString());
        return children;
    }
    getChildrenByClassName(_selector) {
        return this.getElementsByClassName(_selector);
    }
    startHighlight(_id) {
        let elem = this.getChildById(_id);
        if (elem) {
            let highlight = new HighlightedElement();
            highlight.elem = elem;
            highlight.style = elem.style.cssText;
            this.highlightList.push(highlight);
        }
        let elems = this.getChildrenByClassName(_id);
        for (let i = 0; i < elems.length; i++) {
            let highlight = new HighlightedElement();
            highlight.elem = elems[i];
            highlight.style = elems[i].style.cssText;
            this.highlightList.push(highlight);
        }
        this.updateHighlightElements();
    }
    stopHighlight(_id) {
        let elem = this.getChildById(_id);
        if (elem) {
            for (let i = 0; i < this.highlightList.length; i++) {
                if (this.highlightList[i].elem == elem) {
                    elem.style.cssText = this.highlightList[i].style;
                    this.highlightList.splice(i, 1);
                }
            }
        }
        let elems = this.getChildrenByClassName(_id);
        for (let i = 0; i < elems.length; i++) {
            for (let j = 0; j < this.highlightList.length; j++) {
                if (this.highlightList[j].elem == elems[i]) {
                    elems[i].style.cssText = this.highlightList[j].style;
                    this.highlightList.splice(j, 1);
                }
            }
        }
        this.updateHighlightElements();
    }
    clearHighlights() {
        this.highlightList = [];
        this.updateHighlightElements();
    }
    updateHighlightElements() {
        for (let i = 0; i < this.backgroundList.length; i++) {
            this.backgroundList[i].remove();
        }
        this.backgroundList = [];
        if (this.highlightList.length > 0) {
            this.highlightSvg.setAttribute("active", "true");
            let elems = "";
            for (let i = 0; i < this.highlightList.length; i++) {
                let rect = this.highlightList[i].elem.getBoundingClientRect();
                if (this.highlightList[i] instanceof HTMLElement) {
                    let bg = document.createElement("div");
                    bg.style.backgroundColor = "rgba(0,0,0,0.9)";
                    bg.style.zIndex = "-1";
                    bg.style.left = this.highlightList[i].elem.offsetLeft.toString() + "px";
                    bg.style.top = this.highlightList[i].elem.offsetTop.toString() + "px";
                    bg.style.width = rect.width.toString() + "px";
                    bg.style.height = rect.height.toString() + "px";
                    bg.style.position = "absolute";
                    this.highlightList[i].elem.parentElement.appendChild(bg);
                    this.backgroundList.push(bg);
                }
                if (i > 0) {
                    elems += ";";
                }
                elems += rect.left + " ";
                elems += rect.top + " ";
                elems += rect.right + " ";
                elems += rect.bottom;
            }
            this.highlightSvg.setAttribute("elements", elems);
        }
        else {
            this.highlightSvg.setAttribute("active", "false");
        }
    }
    onInteractionEvent(_args) {
    }
    onSoundEnd(_event) {
    }
    getQuality() {
        return this._quality;
    }
    getGameState() {
        return this._gameState;
    }
    reboot() {
        console.log("Rebooting Instrument...");
        this.initTransponder();
    }
    onFlightStart() {
        console.log("Flight Starting...");
        SimVar.SetSimVarValue("L:HUD_AP_SELECTED_SPEED", "Number", 0);
        SimVar.SetSimVarValue("L:HUD_AP_SELECTED_ALTITUDE", "Number", 0);
        this.dispatchEvent(new Event('FlightStart'));
    }
    onQualityChanged(_quality) {
        this._quality = _quality;
    }
    onGameStateChanged(_oldState, _newState) {
        if (_oldState == GameState.loading && (_newState == GameState.ingame || _newState == GameState.briefing)) {
            this.reboot();
        }
        else if (_oldState == GameState.briefing && _newState == GameState.ingame) {
            this.onFlightStart();
        }
        this._gameState = _newState;
    }
    loadDocumentAttributes() {
        var attr = undefined;
        if (document.body.hasAttribute("quality"))
            attr = document.body.getAttribute("quality");
        else if (window.parent && window.parent.document.body.hasAttribute("quality"))
            attr = window.parent.document.body.getAttribute("quality");
        if (attr != undefined) {
            var quality = Quality[attr];
            if (quality != undefined && this._quality != quality) {
                this.onQualityChanged(quality);
            }
        }
        if (document.body.hasAttribute("gamestate"))
            attr = document.body.getAttribute("gamestate");
        else if (window.parent && window.parent.document.body.hasAttribute("gamestate"))
            attr = window.parent.document.body.getAttribute("gamestate");
        if (attr != undefined) {
            var state = GameState[attr];
            if (state != undefined && this._gameState != state) {
                this.onGameStateChanged(this._gameState, state);
            }
        }
    }
    parseXMLConfig() {
        if (this.instrumentXmlConfig) {
            let electric = this.instrumentXmlConfig.getElementsByTagName("Electric");
            if (electric.length > 0) {
                this.electricalLogic = new CompositeLogicXMLElement(this, electric[0]);
            }
        }
    }
    parseURLAttributes() {
        var instrumentID = this.templateID;
        if (this.urlConfig.index)
            instrumentID += "_" + this.urlConfig.index;
        this.setInstrumentIdentifier(instrumentID);
        if (this.urlConfig.style)
            this.setAttribute("instrumentstyle", this.urlConfig.style);
    }
    beforeUpdate() {
        var curTime = Date.now();
        this._deltaTime = curTime - this._lastTime;
        this._lastTime = curTime;
    }
    Update() {
        this.dataMetaManager.UpdateAll();
        this.updateHighlight();
    }
    afterUpdate() {
        this.frameCount++;
    }
    //  ---------------------------  MOD  ------------------------------------------  //
    CanUpdate() {
        let frame_red = this.getFrameRed();
        let quality = this.getQuality();

        if (quality == Quality.high) {
            if ((this.frameCount % frame_red) != 0) {
                //console.log("Delta time updated - passed canupdate() " + this._deltaTime);
                return false;
            }
        }
        else if (quality == Quality.medium) {
            if ((this.frameCount % 8) != 0) {
                return false;
            }
        }
        else if (quality == Quality.low) {
            if ((this.frameCount % 32) != 0) {
                return false;
            }
        }
        else if (quality == Quality.hidden) {
            if ((this.frameCount % 128) != 0) {
                return false;
            }
        }
        else if (quality == Quality.disabled) {
            return false;
        }
        return true;
    }
    //  ---------------------------  MOD  ------------------------------------------  //
    updateElectricity() {
        let powerOn = this.isElectricityAvailable();
        if (this.electricity) {
            if (powerOn)
                this.electricity.setAttribute("state", "on");
            else
                this.electricity.setAttribute("state", "off");
        }
        return powerOn;
    }
    isElectricityAvailable() {
        if (this.electricalLogic) {
            return this.electricalLogic.getValue() != 0;
        }
        return SimVar.GetSimVarValue("CIRCUIT AVIONICS ON", "Bool");
    }
    playInstrumentSound(soundId) {
        if (this.isElectricityAvailable()) {
            Coherent.call("PLAY_INSTRUMENT_SOUND", soundId);
            return true;
        }
        return false;
    }
    createMainLoop() {
        this._lastTime = Date.now();
        let updateLoop = () => {
            if (!this._isConnected) {
                console.warn("Not connected. Exiting...");
                return;
            }
            try {
                if (BaseInstrument.allInstrumentsLoaded && !this.xmlConfigLoading && SimVar.IsReady()) {
                    if (!this._isInitialized)
                        this.Init();
                    this.beforeUpdate();
                    this.Update();
                    this.afterUpdate();
                }
            }
            catch (Error) {
                console.error(this.instrumentIdentifier + " : " + Error, Error.stack);
            }
            requestAnimationFrame(updateLoop);
        };
        this._isConnected = true;
        requestAnimationFrame(updateLoop);
    }
    loadXMLConfig() {
        var xmlPath;
        if (this.urlConfig.config) {
            xmlPath = "/Pages/VCockpit/Instruments/Shared/Configs/" + this.urlConfig.config + ".xml";
        }
        else if (this._xmlConfigPath) {
            xmlPath = "/VFS/" + this._xmlConfigPath.replace(/\\/g, "/");
        }
        if (xmlPath) {
            this.xmlConfigLoading = true;
            var xmlRequest = new XMLHttpRequest();
            xmlRequest.onreadystatechange = function (_NavSystem) {
                if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
                    _NavSystem.onXMLConfigLoaded(this);
                }
            }.bind(xmlRequest, this);
            xmlRequest.open("GET", xmlPath, true);
            xmlRequest.send();
        }
    }
    onXMLConfigLoaded(_xml) {
        this.xmlConfig = _xml.responseXML;
        if (this.xmlConfig) {
            let instruments = this.xmlConfig.getElementsByTagName("Instrument");
            for (let i = 0; i < instruments.length; i++) {
                let name = instruments[i].getElementsByTagName("Name")[0].textContent;
                if (name == this.instrumentIdentifier) {
                    this.instrumentXmlConfig = instruments[i];
                }
            }
            this.parseXMLConfig();
        }
        else {
            console.error("XML Config file is not well-formatted");
        }
        this.xmlConfigLoading = false;
    }
    loadURLAttributes() {
        var parsedUrl = new URL(this.getAttribute("Url").toLowerCase());
        this.urlConfig.style = parsedUrl.searchParams.get("style");
        this.urlConfig.config = parsedUrl.searchParams.get("config");
        let index = parsedUrl.searchParams.get("index");
        this.urlConfig.index = index == null ? null : parseInt(index);
        this.urlConfig.wasmModule = parsedUrl.searchParams.get("wasm_module");
        this.urlConfig.wasmGauge = parsedUrl.searchParams.get("wasm_gauge");
        this.parseURLAttributes();
    }
    getTimeSinceStart() {
        return Date.now() - this.startTime;
    }
    getAspectRatio() {
        var vpRect = this.getBoundingClientRect();
        if (vpRect) {
            var vpWidth = vpRect.width;
            var vpHeight = vpRect.height;
            var aspectRatio = vpWidth / vpHeight;
            return aspectRatio;
        }
        return 1.0;
    }
    updateHighlight() {
    }
    highlightGetState(_valueMin, _valueMax, _period) {
        let time = new Date().getTime();
        let size = _valueMax - _valueMin;
        let middle = _valueMin + size / 2;
        return middle + (Math.sin((time % _period / _period * Math.PI * 2)) * (size / 2));
    }
    wasTurnedOff() {
        return false;
    }
    initTransponder() {
        let transponderCode = ("0000" + SimVar.GetSimVarValue("TRANSPONDER CODE:1", "number")).slice(-4);
        if (transponderCode) {
            let currentCode = parseInt(transponderCode);
            if (currentCode == 0) {
                Simplane.setTransponderToRegion();
            }
        }
    }

    //  ---------------------------  MOD  ------------------------------------------  //

    loadFrameRed() {
        let f_name = "FPS_r_factor";
        let def_factor = 2;
        if (!localStorage.getItem(f_name)) {
            localStorage.setItem(f_name, def_factor)
            console.log("Refresh Factor " + def_factor);
            return def_factor;
        } else {
            let factor_str = localStorage.getItem(f_name);
            let factor = parseInt(factor_str);
            console.log("Refresh Factor " + factor);
            return factor;
        }
    }

    getFrameRed() {
        return this.frameReduce;
    }

    // Can this refresh?
    getRefresh() {
        return this._refresh;
    }
    // Make all instruments touchscreen
    //get isInteractive() { return true; }

    //  ---------------------------  MOD  ------------------------------------------  //

}
BaseInstrument.allInstrumentsLoaded = false;
class URLConfig {
}
var Quality;
(function (Quality) {
    Quality[Quality["high"] = 0] = "high";
    Quality[Quality["medium"] = 1] = "medium";
    Quality[Quality["low"] = 2] = "low";
    Quality[Quality["hidden"] = 3] = "hidden";
    Quality[Quality["disabled"] = 4] = "disabled";
})(Quality || (Quality = {}));
var GameState;
(function (GameState) {
    GameState[GameState["mainmenu"] = 0] = "mainmenu";
    GameState[GameState["loading"] = 1] = "loading";
    GameState[GameState["briefing"] = 2] = "briefing";
    GameState[GameState["ingame"] = 3] = "ingame";
})(GameState || (GameState = {}));
class HighlightedElement {
}

//  ---------------------------  MOD  ------------------------------------------  //
var Refresh;
(function (Refresh) {
Refresh[Refresh["ultra"] = 0] = "ultra";
Refresh[Refresh["high"] = 1] = "high";
Refresh[Refresh["medium"] = 2] = "medium";
Refresh[Refresh["low"] = 3] = "low";
Refresh[Refresh["hidden"] = 4] = "hidden";
Refresh[Refresh["disable"] = 5] = "disable";
})(Refresh || (Refresh = {}));
//  ---------------------------  MOD  ------------------------------------------  //


customElements.define("base-instrument", BaseInstrument);
checkAutoload();
//# sourceMappingURL=BaseInstrument.js.map
