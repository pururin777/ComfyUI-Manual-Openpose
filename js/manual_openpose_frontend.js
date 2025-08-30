import { openpose_keypoints, openpose_relations, render_order, keypoint_colors, relation_colors, r_hand_landmarks, l_hand_landmarks } from "./templates.js"; // "./" must be added to signify relative path.

import { api } from "../../scripts/api.js"

// Global variables.
const pair = { image: null, figures: [] };
const cursor = { figure: 0, key: "nose" };
let index = 0;
let total = 0;
// These global variables are necessary to clean a previous canvas whose scale will possibly change.
let canv_height = 0;
let canv_width = 0;

const MIN_CONFIDENCE = 0.05;
const KEYPOINT_RADIUS = 4;
const EDGE_THICKNESS = 3;

// EventListener for signalling from backend.
api.addEventListener("first-call", (event) => {
    initialize(event.detail.total_number);
    drawAppWindow();
    drawIntermission();
    drawOpenposeEditor();
    fetch("/free-first-call", { method: "POST" });
})

api.addEventListener("send-next-image", (event) => {
    const encodedImage = event.detail.image_base64;
    const figuresList = event.detail.sent_figures;
    const blob = new Blob([Uint8Array.from(atob(encodedImage), c => c.charCodeAt(0))], { type: 'image/png' });
    const url = URL.createObjectURL(blob);

    updatePair(blob, figuresList);
    insertImage(url);
    removeEntries();
    displayFigureData();
    switchToOpenposeEditor();
})

api.addEventListener("terminate-frontend", (event) => {
    // "?"" because there is a chance that cancel-process already removed it so we want to avoid throwing an error.
    document.getElementById("app_window")?.remove();
})

// Cancel generation process if the window has been closed.
window.addEventListener("beforeunload", (e) => {
    document.getElementById("app_window").remove();

    // Making the beforeunload event robust, because it's likely to be dropped otherwise.
    if (!navigator.sendBeacon("/cancel-process")) {
        fetch("/cancel-process", {
            method: "POST",
            keepalive: true,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                signal: 0,
                figures: figuresListStr
            })
        })
    }
})

/**
 * Whenever the frontend is called at the next generation, reset the values of the global variables.
 */
function initialize(receivedTotal) {
    pair.image = null;
    pair.figures = [];
    cursor.figure = 0;
    cursor.key = "nose";
    index = 0;
    total = receivedTotal;
    canv_height = 0;
    canv_width = 0;
}

/**
 * Function that lays out app_window which contains the transmission or openpose editor.
 */
function drawAppWindow() {
    // Creating and setting elements and other nodes.
    const div00 = document.createElement("div");
    div00.id = "app_window";
    document.body.appendChild(div00);

    // ID related style modification.
    let appWindowHeight = screen.availHeight * 0.7;
    let appWindowWidth = screen.availWidth * 0.7;

    div00.style =
    `height: ${appWindowHeight}px;
    width: ${appWindowWidth}px;
    position: fixed;
    left: 15%;
    top: 10%;
    border-radius: 5px;
    background-color: #3F3938;`;
}

/**
 * Function that graphically lays out the transmission. Is shown first when frontend become active.
 */
function drawIntermission() {
    const div00 = document.createElement("div");
    div00.className = "Container";
    div00.id = "container_intermission";
    document.getElementById("app_window").appendChild(div00);

    const p00 = document.createElement("p");
    p00.className = "Arial25";
    p00.id = "intermission_text";
    p00.innerText = "Waiting to receive backend data..."
    div00.appendChild(p00);

    div00.style =
    `height: 94%;
    width: 95%;
    position: relative;
    left: 2.5%;
    top: 3%;
    display: flex;
    justify-content: center;
    align-items: center;`;

    p00.style =
    `font-family: Arial, Helvetica, sans-serif;
    font-size: 25px;
    color: white;
    margin: 0;`;
}

/**
 * Function that displays the transmission as opposed to the openpose editor.
 */
function switchToIntermission() {
    const oldChild = document.getElementById("container_openpose");
    const newChild = document.getElementById("container_intermission");
 
    clearCanvas();

    // Hide the old image too, so it doesn’t flash
    const imageElement = document.getElementById("img_reference");
    if (imageElement) imageElement.style.visibility = "hidden";

    oldChild.style.display = "none";
    newChild.style.display = "flex";
}

/**
 * Function that changes what message is displayed during transmission.
* @param {String} message - Text to be displayed.
 */
function setIntermissionMessage(message) {
    document.getElementById("intermission_text").innerText = message;
}

/**
 * Function that graphically lays out the openpose editor.
 */
function drawOpenposeEditor() {
    const div00 = document.createElement("div");
    div00.className = "Container";
    div00.id = "container_openpose";
    // To access properties of elements the element in question needs to be appended to the document to be able to get its ID.
    document.getElementById("app_window").appendChild(div00);

    // Flex_Horizontal divs themselves are ordered vertically inside the Container div and differentiated with the ID flex_horizontal_1/2.
    // Horizontal_First is the first horizontally ordered div inside of a Flex_Horizontal div.
    // Horizontal_Second is the second horizontally ordered div.

    const div01 = document.createElement("div");
    div01.className = "Flex_Horizontal";
    div01.id = "flex_horizontal_1";
    div00.appendChild(div01);

    const div02 = document.createElement("div");
    div02.className = "Horizontal_First";
    div02.id = "input_img_section";
    div01.appendChild(div02);

    const img = document.createElement("img");
    img.id = "img_reference";
    div02.appendChild(img);

    const canv = document.createElement("canvas");
    canv.id = "openpose_canvas";
    div02.appendChild(canv);

    const div03 = document.createElement("div");
    div03.className = "Horizontal_Second";
    div03.id = "settings_section";
    div01.appendChild(div03);
    
    const div04 = document.createElement("div");
    div04.className = "Flex_Horizontal";
    div04.id = "flex_horizontal_2";
    div00.appendChild(div04);

    const div05 = document.createElement("div");
    div05.className = "Horizontal_First";
    div05.id = "img_counter_section";
    div04.appendChild(div05);

    const p02 = document.createElement("p");
    p02.className = "Arial25";
    p02.id = "image_counter";
    p02.innerText = `This is image ${index+1} out of ${total}.`; // This will not dynamically change, just because you set a variable.
    div05.appendChild(p02);

    const div06 = document.createElement("div");
    div06.className = "Horizontal_Second";
    div06.id = "cont_button_section";
    div04.appendChild(div06);

    const div07 = document.createElement("div");
    div07.className = "Control_Button";
    div07.id = "previous_button";
    div06.appendChild(div07);

    const p03 = document.createElement("p");
    p03.className = "Arial25";
    p03.innerText = "Previous";
    div07.appendChild(p03);

    const div08 = document.createElement("div");
    div08.className = "Control_Button";
    div08.id = "send_all_button";
    div06.appendChild(div08);

    const p04 = document.createElement("p");
    p04.className = "Arial25";
    p04.innerText = "Send All";
    div08.appendChild(p04);

    const div09 = document.createElement("div");
    div09.className = "Control_Button";
    div09.id = "next_button";
    div06.appendChild(div09);

    const p05 = document.createElement("p");
    p05.className = "Arial25";
    p05.innerText = "Next";
    div09.appendChild(p05);

    const div10 = document.createElement("div");
    div10.id = "figure_add_remove_buttons";
    div03.appendChild(div10);

    const div11 = document.createElement("div");
    div11.className = "Figure_Button";
    div11.id = "add_figure_button";
    div10.appendChild(div11);

    const p06 = document.createElement("p");
    p06.className = "Arial15";
    p06.innerText = "Add Figure";
    div11.appendChild(p06);

    const div12 = document.createElement("div");
    div12.className = "Figure_Button";
    div12.id = "remove_figure_button";
    div10.appendChild(div12);

    const p07 = document.createElement("p");
    p07.className = "Arial15";
    p07.innerText = "Remove Figure";
    div12.appendChild(p07);

    let nodeList = document.querySelectorAll("div.Flex_Horizontal");
    for (let i = 0; i < nodeList.length; i++) {
        nodeList[i].style =
        `display: flex;
        flex-direction: row;
        flex-shrink: 0;
        overflow: hidden;`;
    }

    nodeList = document.querySelectorAll("div.Horizontal_First");
    for (let i = 0; i < nodeList.length; i++) {
        nodeList[i].style.width = "60%";
    }

    nodeList = document.querySelectorAll("div.Horizontal_Second");
    for (let i = 0; i < nodeList.length; i++) {
        nodeList[i].style.width = "40%";
    }

    nodeList = document.querySelectorAll("div.Control_Button");
    for (let i = 0; i < nodeList.length; i++) {
        nodeList[i].style =
        `width: fit-content;
        border: 3px solid #acacac;
        border-radius: 8px;
        margin: 0px 10px;
        padding: 5px;
        cursor: pointer;`;

        // nodeList[i] is a variable that will change across iterations while this instantiated variable exists within the scope
        // of the iteration that created it.
        const button = nodeList[i];

        button.addEventListener("mouseover", () => {
            button.style.borderColor = "#f19224";
        });

        button.addEventListener("mouseleave", () => {
            button.style.borderColor = "white";
        });

        button.addEventListener("pointerdown", () => {
            button.firstChild.style.color = "#f19224";
        });

        button.addEventListener("pointercancel", () => {
            button.firstChild.style.color = "white";
        });

        button.addEventListener("pointerup", () => {
            button.firstChild.style.color = "white";
        });

    }

    nodeList = document.querySelectorAll("div.Figure_Button");
    for (let i = 0; i < nodeList.length; i++) {
        nodeList[i].style =
        `width: auto;
        border: 2px solid #acacac;
        border-radius: 8px;
        margin: 0px 10px;
        padding: 5px;
        cursor: pointer;`;

        const button = nodeList[i];

        button.addEventListener("mouseover", () => {
            button.style.borderColor = "#f19224";
        });

        button.addEventListener("mouseleave", () => {
            button.style.borderColor = "white";
        });

        // mousedown and mouseup is not as robust as their pointer variants.
        button.addEventListener("pointerdown", () => {
            button.firstChild.style.color = "#f19224";
        });

        button.addEventListener("pointercancel", () => {
            button.firstChild.style.color = "white";
        });

        button.addEventListener("pointerup", () => {
            button.firstChild.style.color = "white";
        });

    }

    // p elements inherently have a pre-defined margin and without it being specifically set it caused problems with align-items: center of its grandparent.
    nodeList = document.querySelectorAll("p.Arial25");
    for (let i = 0; i < nodeList.length; i++) {
        nodeList[i].style =
        `font-family: Arial, Helvetica, sans-serif;
        margin: 0px;
        font-size: 25px;
        color: white;`;
    }

    nodeList = document.querySelectorAll("p.Arial15");
    for (let i = 0; i < nodeList.length; i++) {
        nodeList[i].style =
        `font-family: Arial, Helvetica, sans-serif;
        margin: 0px;
        font-size: 15px;
        color: white;`;
    }

    let node = document.getElementById("container_openpose");
    node.style =
    `display: none;
    height: 94%;
    width: 95%;
    position: relative;
    left: 2.5%;
    top: 3%;`;

    node = document.getElementById("flex_horizontal_1");
    node.style.height = "90%";

    node = document.getElementById("flex_horizontal_2");
    node.style.height = "10%";

    node = document.getElementById("input_img_section");
    node.style.position = "relative";

    node = document.getElementById("img_reference");
    node.style =
    `max-height: 100%;
    max-width: 100%;
    height: auto;
    width: auto;
    object-fit: contain;
    display: block;
    margin: auto;
    cursor: pointer;`;

    node = document.getElementById("openpose_canvas");
    node.style.position = "absolute";
    node.style.pointerEvents = "none"; // So the canvas that is on top of the image definitely doesn't interfer.

    node = document.getElementById("settings_section");
    node.style.borderRadius = "4px";
    node.style.border = "1px solid #acacac";
    node.style.backgroundColor = "#3d3c3c";
    node.style.display = "flex";
    node.style.flexDirection = "column";
    node.style.flexShrink = "0";
    node.style.overflowY = "scroll";
    node.style.alignItems = "center";

    node = document.getElementById("img_counter_section");
    node.style.display = "flex";
    node.style.justifyContent = "center";
    node.style.alignItems = "center";

    node = document.getElementById("cont_button_section");
    node.style.display = "flex";
    node.style.flexDirection = "row";
    node.style.justifyContent = "center";
    node.style.alignItems = "center";

    // We are sending back a JSON string representing a list of former JS objects.
    node = document.getElementById("previous_button");
    node.addEventListener("click", () => {
        if (index == 0) {
            console.log("User requested the previous image but this is the first.");
            return;
        }

        setIntermissionMessage("Receiving previous image...");
        switchToIntermission();

        const figuresListStr = convertAllJSObjToStr();

        fetch("/free-send-next-image", { 
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                signal: -1,
                figures: figuresListStr
            })
        }).then(() => {
            decrementIndex();
        })
    });

    node = document.getElementById("send_all_button");
    node.addEventListener("click", () => {
        // Ask the user for confirmation, because maybe they pressed on this button by accident.
        let check = confirm("Are you sure that you've gone through every image and have set all the figures that you wanted to?");
        if (!check) {
            return;
        }

        setIntermissionMessage("Generating Openpose images in backend...");
        switchToIntermission();

        const figuresListStr = convertAllJSObjToStr();

        fetch("/free-send-next-image", { 
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                signal: 0,
                figures: figuresListStr
            })
        });
    });

    node = document.getElementById("next_button");
    node.addEventListener("click", () => {
        if (index == total-1) {
            console.log("User requested the next image but this is the last.");
            return;
        }

        setIntermissionMessage("Receiving next image...");
        switchToIntermission();

        const figuresListStr = convertAllJSObjToStr();

        fetch("/free-send-next-image", { 
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                signal: 1,
                figures: figuresListStr
            })
        }).then(() => {
            incrementIndex();
        })
    });

    node = document.getElementById("figure_add_remove_buttons");
    node.style.margin = "10px 10px";
    node.style.display = "flex";
    node.style.flexDirection = "row";
    node.style.justifyContent = "center";
    node.style.alignItems = "center";

    node = document.getElementById("add_figure_button");
    node.addEventListener("click", addFigure);

    node = document.getElementById("remove_figure_button");
    node.addEventListener("click", removeFigure);

}

function switchToOpenposeEditor() {
    const oldChild = document.getElementById("container_intermission");
    const newChild = document.getElementById("container_openpose");
    oldChild.style.display = "none";
    newChild.style.display = "flex";
    newChild.style.flexDirection = "column";
    newChild.style.flexShrink = "0";
    newChild.style.overflow = "hidden";
}

/**
 * Add empty figure data at the end of the array.
 */
function addFigure() {
    // Use template to make a new JS object. Assigning the template directly wouldn't make a copy but assign the same reference to the samce object, which is the template.
    const emptyFigure = Object.assign({}, openpose_keypoints);
    pair.figures.push(emptyFigure);
    // Insert landmark entries in the Openpose landmarks list.
    displayLatestFigureData();
    renderFigure();
}

/**
 * Either remove the last element or replace the only remaining element with empty figure data.
 */
function removeFigure() {

    let index = pair.figures.length-1;
    const children = document.querySelectorAll(`div[id^="figure_${index}"]`);

    if (pair.figures.length == 1) {

        const emptyFigure = Object.assign({}, openpose_keypoints);
        pair.figures[0] = emptyFigure;

        for (const child of children) {
            child.removeEventListener("mouseover", highlightEntry);
            child.removeEventListener("mouseleave", dimEntry);
            child.removeEventListener("click", updateEntrySelection);
            child.remove();
        }

        // We are not only removing a figure in this case but also adding a new, empty figure. Therefore new entries must be made.
        displayFigureData();
        renderFigure();

    } else {

        pair.figures.pop();
        
        for (const child of children) {
            child.removeEventListener("mouseover", highlightEntry);
            child.removeEventListener("mouseleave", dimEntry);
            child.removeEventListener("click", updateEntrySelection);
            child.remove();
        }

        // We have no need to use displayFigureData here since no new figure is added. displayFigure would have reset the cursor's highlight.
        // Therefore we have to do it manually here by triggering the eventListener of the first landmark entry in the list.
        document.getElementById("settings_section").firstChild.dispatchEvent(new Event('click'));
        renderFigure();
    }
}

/**
 * Function meant to the change the coordinates and confidence of a landmark for a given figure. Also changes the entry as seen in the GUI.
 * @param {Number} figure_num - Index of figure.
 * @param {String} landmark - Name of the landmark.
 * @param {Array(Number)} vector - Coordinates and confidence value for landmark of referenced figure.
 */
function changeLandmarkEntry(figure_num, landmark, vector) {
    // Update coordinate values and confidence based on args.
    pair.figures[figure_num][landmark] = vector;
    document.getElementById("figure_" + figure_num + "_" + landmark + "_vector").innerText = "(" + vector.toString() + ")";

    // Render the Openpose figure(s) again based on the updated vector.
    renderFigure();

    // Send the current entry div element and increment the cursor.
    const entry = document.getElementById("figure_" + figure_num + "_" + landmark + "_entry");
    incrementCursor(entry);
}

/**
 * Function to update global variable pair based on sent data from backend.
 */
function updatePair(receivedImg, receivedFigures) {
    const newFigures = [];

    // Convert the figure list made up of JSON string into JS objects.
    for (let i = 0; i < receivedFigures.length; i++) {
        newFigures.push(JSON.parse(receivedFigures[i]));
    }

    pair.figures = newFigures;
    pair.img = receivedImg;
}

/**
 * Function to create a list of all entries in settings_section with the figure data present.
 */
function displayFigureData() {
    const parent = document.getElementById("settings_section");
    const last = document.getElementById("figure_add_remove_buttons");

    for (let i = 0; i < pair.figures.length; i++) {
        let figure = pair.figures[i];
        let keys = Object.keys(figure); // Alternatively, the Openpose figure template would have been appropriate here as well.
        let values = Object.values(figure);

        for (let j = 0; j < keys.length; j++) {
            let div00 = document.createElement("div");
            div00.className = "Landmarks_Entry";
            div00.id = "figure_" + i + "_" + keys[j] + "_entry";
            parent.insertBefore(div00, last); 

            let p00 = document.createElement("p");
            p00.className = "Entry_Text";
            p00.innerText = "Figure " + i;
            div00.appendChild(p00);

            let p01 = document.createElement("p");
            p01.className = "Entry_Text";
            p01.innerText = keys[j];
            div00.appendChild(p01);

            let p02 = document.createElement("p");
            p02.className = "Entry_Text";
            p02.id = `figure_${i}_${keys[j]}_vector`;
            p02.innerText = "(" + values[j].toString() + ")";
            div00.appendChild(p02);

            div00.style =
            `width: 99%;
            border: 1px solid #acacac;
            margin: 5px 0px 0px 0px;
            cursor: pointer;
            display: flex;
            flex-direction: row;
            flex-shrink: 0;
            overflow: hidden;`;

            p00.style =
            `font-family: Arial, Helvetica, sans-serif;
            font-size: 20px;
            color: white;
            margin: 5px 15px 5px 10px;`;

            p01.style =
            `font-family: Arial, Helvetica, sans-serif;
            font-size: 20px;
            color: white;
            margin: 5px 15px 5px 10px;`;

            p02.style =
            `font-family: Arial, Helvetica, sans-serif;
            font-size: 20px;
            color: white;
            margin: 5px 15px 5px 10px;`;

            // Make the first entry orange at the beginning.
            if (i == 0 && j == 0) {
                div00.style.borderColor = "#f19224";
                p00.style.color = "#f19224";
                p01.style.color = "#f19224";
                p02.style.color = "#f19224";

                resetCursor();
            }

            div00.addEventListener("mouseover", highlightEntry);

            // If an entry is already active then "mouseleave" shouldn't turn it dim again.
            div00.addEventListener("mouseleave", dimEntry);

            // Clicking on this entry's div lights up its text and changes the cursor to this figure and landmark.
            div00.addEventListener("click", updateEntrySelection);
        }
    }
}

/**
 * Function to add to the list of entries in settings_section the data of the last figure.
 */
function displayLatestFigureData() {
    let latestIndex = pair.figures.length-1;
    const parent = document.getElementById("settings_section");
    const last = document.getElementById("figure_add_remove_buttons");

    const figure = pair.figures[latestIndex];
    const keys = Object.keys(figure);
    const values = Object.values(figure);

    for (let i = 0; i < keys.length; i++) {
        let div00 = document.createElement("div");
        div00.className = "Landmarks_Entry";
        div00.id = "figure_" + latestIndex + "_" + keys[i] + "_entry";
        parent.insertBefore(div00, last); 

        let p00 = document.createElement("p");
        p00.className = "Entry_Text";
        p00.innerText = "Figure " + latestIndex;
        div00.appendChild(p00);

        let p01 = document.createElement("p");
        p00.className = "Entry_Text";
        p01.innerText = keys[i];
        div00.appendChild(p01);

        let p02 = document.createElement("p");
        p00.className = "Entry_Text";
        p02.id = `figure_${latestIndex}_${keys[i]}_vector`;
        p02.innerText = "(" + values[i].toString() + ")";
        div00.appendChild(p02);

        div00.style =
        `width: 99%;
        border: 1px solid #acacac;
        margin: 5px 0px 0px 0px;
        cursor: pointer;
        display: flex;
        flex-direction: row;
        flex-shrink: 0;
        overflow: hidden;`;

        p00.style =
        `font-family: Arial, Helvetica, sans-serif;
        font-size: 20px;
        color: white;
        margin: 5px 15px 5px 10px;`;

        p01.style =
        `font-family: Arial, Helvetica, sans-serif;
        font-size: 20px;
        color: white;
        margin: 5px 15px 5px 10px;`;

        p02.style =
        `font-family: Arial, Helvetica, sans-serif;
        font-size: 20px;
        color: white;
        margin: 5px 15px 5px 10px;`;

        div00.addEventListener("mouseover", highlightEntry);

        div00.addEventListener("mouseleave", dimEntry);

        // Clicking on this entry's div lights up its text and changes the cursor to this figure and landmark.
        div00.addEventListener("click", updateEntrySelection);
    }
}

/**
 * Function to empty the list of entries.
 */
function removeEntries() {
    const parent = document.getElementById("settings_section");
    const last = document.getElementById("figure_add_remove_buttons");

    // For the iterable to be parent.children is problematic because it would dynamically change per iteration in which elements are deleten.
    // With Array.from() a static snapshot is made that references the original elements that will be deleten while itself remaining the same.
    // const only acts block-wise. Each iteration will create a new const variable of the stated name.
    for (const child of Array.from(parent.children)) {
        if (child != last) {
            child.removeEventListener("mouseover", highlightEntry);
            child.removeEventListener("mouseleave", dimEntry);
            child.removeEventListener("click", updateEntrySelection);
            child.remove();
        }
    }
}

/**
 * Function for the EventListener when someone clicks on an entry.
 */
function updateEntrySelection() {
    const entry_frames = document.getElementsByClassName("Landmarks_Entry");
    const paragraphs = document.getElementsByClassName("Entry_Text");

    for (const entry_frame of entry_frames) {
        entry_frame.style.borderColor = "#acacac";
    }

    for (const paragraph of paragraphs) {
        paragraph.style.color = "white";
    }
    // Make the current entry highlit and place the cursor on it.
    let figureIndex = null;
    let landmark = null;

    this.style.borderColor = "#f19224";

    for (let i = 0; i < this.children.length; i++) {
        this.children[i].style.color = "#f19224";

        if (i == 0) {
            figureIndex = Number(this.children[i].innerText.match("[0-9]+")[0]);
        } else if (i == 1) {
            landmark = this.children[i].innerText;
        } else {
            this.children[i].innerText = "(" + [0,0,0].toString() + ")";
        }
    }
    
    setCursor(figureIndex, landmark);
    // The entry that has been selected should also be reset.
    pair.figures[figureIndex][landmark] = [0,0,0];
    renderFigure();
}

function highlightEntry() {
    this.style.borderColor = "#f19224";
}

function dimEntry() {
    if (this.id == "figure_" + cursor.figure + "_" + cursor.key + "_entry") {
        return;
    }

    this.style.borderColor = "#acacac";
}

/**
 * Function that inserts the recently received image.
 */
function insertImage(url) {
    const imageElement = document.getElementById("img_reference");
    const canvElement = document.getElementById("openpose_canvas");
    // Hide and clear overlay to avoid flicker. "hidden" is not the same as "none". We actually still have dimensions to call upon.
    imageElement.style.visibility = "hidden";
    canvElement.style.visibility = "hidden;"

    clearCanvas();

    const prevUrl = imageElement.dataset.url || null;

    // Because this is a property and not an addEventListener function we are not adding more EventListeners
    // when this function is called, it's merely overriden.
    imageElement.onload = () => {
        // We will definitely only render when the image is already loaded.
        renderFigure();
        canvElement.style.visibility = "visible";
        imageElement.style.visibility = "visible";

        // Revoke the previous object URL to prevent memory leaks.
        if (prevUrl) URL.revokeObjectURL(prevUrl);
        imageElement.dataset.url = url;
    };

    // Handle failed loads gracefully.
    imageElement.onerror = () => {
        console.error("Failed to load image:", url);
        setIntermissionMessage("Dealing with error on image loading...");
        switchToIntermission();
    };

    // Trigger loading
    imageElement.src = url;

    imageElement.removeEventListener("click", trackCoordinates);
    imageElement.addEventListener("click", trackCoordinates);
}

/**
 * Function for the EventListener in case the image has been clicked to derive coordinates from.
 */
function trackCoordinates(event) {
    const rect = this.getBoundingClientRect();
    const img = document.getElementById("img_reference");
    let x_scale = img.naturalWidth/img.clientWidth; // Coordinate must be rescaled to what the original image's size was.
    let y_scale = img.naturalHeight/img.clientHeight;

    let x_pos = Math.round((event.clientX - rect.left) * x_scale);
    let y_pos = Math.round((event.clientY - rect.top) * y_scale);

    changeLandmarkEntry(cursor.figure, cursor.key, [x_pos, y_pos, 0.95]);
}

/**
 * Function create a canvas laid on top of the current image and render an openpose figure on top of it.
 * Due to this being a pixel based method, the entire canvas must be deleten and rendered again if you want to alter parts of it.
 */
function renderFigure() {
    const img_element = document.getElementById("img_reference");

    // In case there there is no loaded image yet and therefore we would deal with a zero-size image.
    if (!img_element.naturalWidth || !img_element.naturalHeight) {
        return;
    }

    const canv_element = document.getElementById("openpose_canvas");
    const context = canv_element.getContext("2d");

    let x_scale = img_element.clientWidth/img_element.naturalWidth; // Coordinate must be rescaled to the image's adjusted size now.
    let y_scale = img_element.clientHeight/img_element.naturalHeight;

    // Clean previous canvas which may be necessary if the size remained the same.
    context.clearRect(0, 0, canv_width, canv_height);

    // Canvas height/width is not the same as style.height/width. The former changes the resolution while the latter only its size, leading to warping.
    // Resizing canvas wipes previous content also.
    canv_element.style.top = `${img_element.offsetTop}px`;
    canv_element.style.left = `${img_element.offsetLeft}px`;
    canv_element.style.height = `${img_element.clientHeight}px`;
    canv_element.style.width = `${img_element.clientWidth}px`;
    canv_element.height = img_element.clientHeight;
    canv_element.width = img_element.clientWidth;

    // Update new canvis scale.
    canv_height = img_element.clientHeight;
    canv_width = img_element.clientWidth;

    for (let i = 0; i < pair.figures.length; i++) {

        let figure = pair.figures[i];

        for (let j = 0; j < render_order.length; j++) {

            let element = render_order[j];

            if (element.includes("-")) {

                let [kp1, kp2] = openpose_relations.get(element);

                if (figure[kp1][2] < MIN_CONFIDENCE || figure[kp2][2] < MIN_CONFIDENCE) {
                    continue;
                }

                let [red, green, blue] = relation_colors.get(element);

                context.beginPath();
                context.moveTo(figure[kp1][0] * x_scale, figure[kp1][1] * y_scale);
                context.lineTo(figure[kp2][0] * x_scale, figure[kp2][1] * y_scale);
                context.lineWidth = EDGE_THICKNESS;
                context.strokeStyle = `rgb(${red}, ${green}, ${blue})`;
                context.stroke();

            } else {
                if (figure[element][2] < MIN_CONFIDENCE) {
                    continue;
                }

                let [red, green, blue] = keypoint_colors.get(element);

                if (element == "r_wrist") {
                    for (const landmark of r_hand_landmarks) {
                        if (figure[landmark][2] >= MIN_CONFIDENCE) {
                            [red, green, blue] = [0, 0, 255];
                            break;
                        }
                    }
                } else if (element == "l_wrist") {
                    for (const landmark of l_hand_landmarks) {
                        if (figure[landmark][2] >= MIN_CONFIDENCE) {
                            [red, green, blue] = [0, 0, 255];
                            break;
                        }
                    }
                }

                context.beginPath();
                context.arc(figure[element][0] * x_scale, figure[element][1] * y_scale, KEYPOINT_RADIUS, 0, 2 * Math.PI);
                context.fillStyle = `rgb(${red}, ${green}, ${blue})`;
                context.fill();

            }
        }
    }
}

/**
 * Function to clear the canvas.
 */
function clearCanvas() {
    const canv = document.getElementById("openpose_canvas");

    if (canv) {
        const context = canv.getContext("2d");
        context.clearRect(0, 0, canv_width, canv_height);
    }
}

/**
 * Function meant to increment the cursor unless we are already at the end of the landmarks list.
 * @param {div} entry The current entry that the cursor points to.
 */
function incrementCursor(entry) {
    const nextSibling = entry.nextElementSibling;
    const lastSibling = document.getElementById("figure_add_remove_buttons");

    // How to react if it was the last entry in the list.
    if (nextSibling == lastSibling) {
        return;
    }

    // Default the appearance of all entries.
    const entry_frames = document.getElementsByClassName("Landmarks_Entry");
    const paragraphs = document.getElementsByClassName("Entry_Text");

    for (const entry_frame of entry_frames) {
        entry_frame.style.borderColor = "#acacac";
    }

    for (const paragraph of paragraphs) {
        paragraph.style.color = "white";
    }

    // Make the current entry highlit and place the cursor on it.
    let figureIndex = null;
    let landmark = null;

    nextSibling.style.borderColor = "#f19224";

    for (let i = 0; i < nextSibling.children.length; i++) {
        nextSibling.children[i].style.color = "#f19224";

        if (i == 0) {
            figureIndex = Number(nextSibling.children[i].innerText.match("[0-9]+")[0]);
        } else if (i == 1) {
            landmark = nextSibling.children[i].innerText;
        }
    }
    
    setCursor(figureIndex, landmark);
}

/**
 * Function that sets the cursor specifically.
 * @param {Number} figure_num Index of the figure that the cursor should point to.
 * @param {Strong} landmark String of the landmark that the cursor should point to.
 */
function setCursor(figure_num, landmark) {
    cursor.figure = figure_num;
    cursor.key = landmark;
}

/**
 * Function to set the cursor to its initial state.
 */
function resetCursor() {
    cursor.figure = 0;
    cursor.key = "nose";
}

/**
 * Function to increment the index.
 */
function incrementIndex() {
    index++;
    document.getElementById("image_counter").innerText = `This is image ${index+1} out of ${total}.`;
}

/**
 * Function to decrement the index.
 */
function decrementIndex() {
    index--;
    document.getElementById("image_counter").innerText = `This is image ${index+1} out of ${total}.`;
}

/**
 * Function to convert all the listed figures that are JS objects into JSON formatted strings.
 */
function convertAllJSObjToStr() {
    const figuresList = [];

    for (const figure of pair.figures) {
        let figureStr = JSON.stringify(figure);
        figuresList.push(figureStr);
    }

    return figuresList;
}