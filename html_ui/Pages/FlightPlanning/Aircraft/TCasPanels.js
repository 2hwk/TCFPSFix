// --------------------------
// TCasPanels
// v 1.1.3a
// --------------------------

/*
+++++++++++++++++++++++
Turbofans
+++++++++++++++++++++++
A320neo
747-8 Intercontinental
787-10 Dreamliner
Cessna Citation CJ4
Cessna Citation Longitude
+++++++++++++++++++++++
Turboprops
+++++++++++++++++++++++
TBM 930
Beechcraft King Air 350i
Cessna 208 B Grand Caravan EX
+++++++++++++++++++++++
Props
+++++++++++++++++++++++
SR22
X Cub
DA40 NG
DA40 TDI
DA62
DV20
EXTRA 330LT
Flight Design CTSL
A5
VL-3
Virus SW121
Cap10
Beechcraft Baron G58
Beechcraft Bonanza G36
++++++++++++++++++++++
*/

Include.addImport("/Templates/PanelInfoLine/PanelInfoLine.html");
Include.addScript("/JS/Services/Aircraft.js");
Include.addImport("/templates/searchElement/searchElement.html");
Include.addImport("/templates/OptionsMenu/Item/OptionsMenuItem.html");
Include.addImport("/templates/OptionsMenu/OptionsMenu.html");
Include.addImport("/Pages/World/PlaneSelection/PlaneSelection.html");
Include.addImport("/templates/FuelPayload/WM_FuelPayload.html");
Include.addImport("/Pages/World/AircraftFailures/WM_AircraftFailures.html");

const TC_DEBUG = false;

class TCasOptionsElement extends TemplateElement {
    constructor() {
        super();
        if (TC_DEBUG && g_modDebugMgr){
            g_modDebugMgr.AddConsole(null);
        }
        var json_obj = null;
        this.current_aircraft = null;
        // Parsing JSON string into object
        loadJSON(function(response) {
            if (response) {
                json_obj = JSON.parse(response);
            }
            if (TC_DEBUG) {
                for (let i = 0; i < json_obj.length; i++) {
                    console.log(json_obj[i].name + " = " + json_obj[i].fps);
                }
            }
        });
        this.onListenerRegistered = () => {
            this.m_gameFlightListener.requestGameFlight(this.onGameFlightUpdated);
        };
        this.onGameFlightUpdated = (flight) => {
            //Type: AircraftData
            if (TC_DEBUG) {
                console.log("aircraft ID: " + flight.aircraftData.aircraftId);
                console.log("name: [" + flight.aircraftData.name + "]");
                console.log("variation: " + flight.aircraftData.variation);
            }
            let factor = null;
            this.current_aircraft = flight.aircraftData.name;
            // Fetch from JSON
            if (json_obj) {
                for (let i = 0; i < json_obj.planes.length; i++) {
                    if (json_obj.planes[i].name === flight.aircraftData.name) {
                        if (TC_DEBUG) {
                            console.log("FPS Quality: " + json_obj.planes[i].fps);
                            console.log("QF: " + quality_factor[json_obj.planes[i].fps]);
                        }
                        factor = quality_factor[json_obj.planes[i].fps];
                        break;
                    }
                }
                // No aircraft found
                if (!factor && json_obj.default) {
                    if (TC_DEBUG) console.log("Using default: "+ json_obj.default);
                    factor = quality_factor[json_obj.default];
                    localStorage.setItem("FPS_r_factor", factor);
                    if (TC_DEBUG) console.log(localStorage.getItem("FPS_r_factor"));
                }

            }
            // Load factor variable (menus + local settings)
            if (factor) {
                localStorage.setItem("FPS_r_factor", factor);
                let index = factor_disp[factor] ? factor_disp[factor] : 0;
                this.fRedInd.setCurrentValue(index);
            } else {
                // If no factor, revert to High
                localStorage.setItem("FPS_r_factor", "2");
                this.fRedInd.setCurrentValue(1);
                if (json_obj) { json_obj.default = "High"; }
            }
        };
        // On menu change...
        this.onRateChange = () => {
            let index = this.fRedInd.getCurrentValue();
            let factor = "2";
            // Get rFactor from index
            for (let key in factor_disp) {
                if (factor_disp[key] == index) {
                    factor = key;
                    break;
                }
            }
            // Get quality from rFactor
            let quality = "High";       // Set High if nothing found
            for (let key in quality_factor) {
                if (quality_factor[key] == factor) {
                    quality = key;
                    break;
                }
            }
            // Set rFactor -> BaseInstrument
            localStorage.setItem("FPS_r_factor", factor);
            if (TC_DEBUG) console.log(localStorage.getItem("FPS_r_factor"));
            // Set quality for existing plane -> JSON
            let found = false;
            if (json_obj) {
                for (let i = 0; i < json_obj.planes.length; i++) {
                    if (!found && json_obj.planes[i].name === this.current_aircraft) {
                        json_obj.planes[i].fps = quality;       // Set quality for this plane
                        found = true;
                        if (TC_DEBUG) { console.log("Found " + json_obj.planes[i].name); }
                        //console.log(json_obj.planes[i].name + " = " + json_obj.planes[i].fps);
                    }
                }
                // Create new plane  -> JSON
                if (!found) {
                    if (TC_DEBUG) { console.log(">>> Creating new: " + this.current_aircraft); }
                    let new_plane = {
                        name: this.current_aircraft,
                        fps: quality
                    }
                    if (TC_DEBUG) { "JSON: " +json_obj.planes.push(new_plane); }
                    //console.log("Created" + new_plane.name + " = " + new_plane.fps);
                }
            console.log(JSON.stringify(json_obj));
            //console.log("FPS_r_factor set to " + factor);
            }
        };
        this.copyToClipboard = () => {
            console.log(">>>> To Clipboard");
            const element = document.createElement('textarea');
            element.value = JSON.stringify(json_obj);
            element.setAttribute('readonly', '');
            element.style.position = 'absolute';
            element.style.left = '-9999px';
            document.body.appendChild(element);
            const selected =
              document.getSelection().rangeCount > 0
                ? document.getSelection().getRangeAt(0)
                : false;
            element.select();
            document.execCommand('copy');
            document.body.removeChild(element);
            if (selected) {
              document.getSelection().removeAllRanges();
              document.getSelection().addRange(selected);
            }
        };
    }
    get templateID() { return "TCasOptionsTemplate"; }
    ;
    connectedCallback() {
        super.connectedCallback();
        this.fRedInd = this.querySelector(".WM_TCOPTIONS_DISPLAY_RATE");
        this.fRedInd.addEventListener("OnValidate", this.onRateChange);
        this.fRedCopy = this.querySelector(".WM_TCOPTIONS_COPY");
        this.fRedCopy.addEventListener("OnValidate", this.copyToClipboard);
        if (!this.m_gameFlightListener)
            this.m_gameFlightListener = RegisterGameFlightListener(this.onListenerRegistered);
        this.m_gameFlightListener.onGameFlightUpdated(this.onGameFlightUpdated);
    }
    get canBeSelected() { return true; }
    getKeyNavigationStayInside(keycode) { return true; }
    getKeyNavigationDirection() { return KeyNavigationDirection.KeyNavigation_Vertical; }
    getAllFocusableChildren() {
        return [ this.fRedInd, this.fRedCopy ];
    }

}

function loadJSON(callback) {
    if (TC_DEBUG) console.log("Loading JSON");
    let xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
    xobj.open("GET", "/FPS_Setting.json", true);
    xobj.onreadystatechange = function () {
          if (xobj.readyState == 4 && xobj.status == "200") {
            callback(xobj.responseText);
          }
    };
    xobj.send(null);
}

function saveJSON(json) {

    const filename =  "FPS_Setting.json";
    let text = JSON.stringify(json);
    if (TC_DEBUG) {
        console.log("Saved to : " + filename);
        console.log(text);
    }

    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

/*
// :(
function saveJSON(filename, text) {
    console.log("Saved to : " + filename);
    console.log(text);
    var a = document.createElement("a");
    var file = new Blob([text], {type: "text/plain"});
    a.href = URL.createObjectURL(file);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
*/

var factor_disp = {
    "1" : 0,        // Ultra
    "2" : 1,        // High
    "3" : 2,        // Medium
    "4" : 3,        // Low
    "16" : 4        // Very Low
};
var quality_factor = {
    "Ultra"    : "1",
    "High"     : "2",
    "Medium"   : "3",
    "Low"      : "4",
    "Very Low" : "16"
};

window.customElements.define("aircraft-tcas-framerate", TCasOptionsElement);
checkAutoload();
//# sourceMappingURL=AircraftPanels.js.map
