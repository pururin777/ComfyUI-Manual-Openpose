import { openepose_keypoints, openepose_relations, render_order, keypoint_colors, relation_colors } from "templates.js";

// Establish global variables for access.
const pair = {};
const cursor = {};
let index = null;
let total = null;
 
// Whenever the frontend is called, reset the values of global variables.
function initialize() {
    pair.image = null;
    pair.figures = [];
    cursor.figure = 0;
    cursor.key = "nose";
    index = 0;
    total = 0;
}

// Add empty figure data at the end of the array.
function addFigure() {
    const emptyFigure = Object.assign({}, openepose_keypoints);
    pair.figures.push(emptyFigure);
    displayLatestFigureData();
}

// Either remove the last element or replace the only remaining element with empty figure data.
function removeFigure() {
    index = pair.figures.length-1;
    children = document.querySelectorAll(`[id^="figure_${index}"]`);

    if (pair.figures.length == 1) {
        const emptyFigure = Object.assign({}, openepose_keypoints);
        pair.figures[0] = emptyFigure;

        for (child in children) {
            child.remove();
        }

        displayFigureData();

    } else {
        pair.figures.pop();

        for (child in children) {
            child.remove();
        }
    }
}

function changeLandmarkEntry(vector) {

}

// Coordinates frontend functions.
function main() {
    initialize();
    drawAppWindow();
    drawIntermission();
    drawOpenposeEditor();

    // Waiting for backend message.
    setTotal(totalImages);
    updatePair(img, figures);
    displayFigureData();

}

// [WIP] A function triggered by an evenListener which receives how many images there are in total and then assigns the value to total.
// [WIP] A function triggered by an evenListener which receives figure data from backend and updates the pair object.

function drawAppWindow() {
    // Creating and setting elements and other nodes.
    const div00 = document.createElement("div");
    div00.id = "app_window";
    document.body.appendChild(div00);

    // ID related style modification.
    appWindowHeight = screen.availHeight * 0.8;
    appWindowWidth = screen.availWidth * 0.8;

    div00.style =
    `height: ${appWindowHeight}px;
    width: ${appWindowWidth}px;
    position: fixed;
    left: 10%;
    top: 5%;
    border-radius: 5px;
    background-color: #575555;`;
}

function drawIntermission() {
    const div00 = document.createElement("div");
    div00.className = "Container";
    div00.id = "container_transmission";
    document.getElementById("app_window").appendChild(div00);

    const p00 = document.createElement("p");
    p00.className = "Arial25";
    p00.id = "intermission_text";
    p00.innerText = "Waiting to receive backend data..."
    div00.appendChild(p00);
}

function switchToIntermission() {
    parent = document.getElementById("app_window");
    newChild = document.getElementById("container_intermission");
    oldChild = document.getElementById("container_openpose");
    parent.replaceChild(newChild, oldChild);
}

function setIntermissionMessage(message) {
    document.getElementById("intermission_text").innerText = message;
}

function drawOpenposeEditor() {
    const div00 = document.createElement("div");
    div00.className = "Container";
    div00.id = "container_openpose";

    const div01 = document.createElement("div");
    div01.className = "Flex_Horizontal";
    div01.id = "flex_horizontal_1";
    div00.appendChild(div01);

    const div02 = document.createElement("div");
    div02.className = "Horizontal_First";
    div02.id = "input_img_section";
    div01.appendChild(div02);

    const img00 = document.createElement("img");
    img00.id = "img_reference";
    div01.appendChild(img00);

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
    p02.innerText = `This is image ${index} out of ${total}.`;
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

    // Class related style modification.
    let nodeList = document.querySelectorAll("div.Container");
    for (let i = 0; i < nodeList.length; i++) {
        nodeList[i].style =
        `height: 94%;
        width: 95%;
        position: relative;
        left: 2.5%;
        top: 3%;`;
    }

    nodeList = document.querySelectorAll("div.Flex_Horizontal");
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
        nodeList[i].style.width = "40%";
    }

    nodeList = document.querySelectorAll("p.Arial25");
    for (let i = 0; i < nodeList.length; i++) {
        nodeList[i].style =
        `font-family: Arial, Helvetica, sans-serif;
        font-size: 25px;
        color: white;
        margin: 0;`;
    }

    // ID related style modification.
    let node = document.getElementById("container_openpose");
    node.style.display = "flex";
    node.style.flexDirection = "column";
    node.style.flexShrink = "0";
    node.style.overflow = "hidden";

    node = document.getElementById("flex_horizontal_1");
    node.style.height = "90%";

    node = document.getElementById("img_counter_section");
    node.style.display = "flex";
    node.style.justifyContent = "center";
    node.style.alignItems = "center";

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

    node = document.getElementById("settings_section");
    node.style.borderRadius = "4px";
    node.style.border = "1px solid #acacac";
    node.style.backgroundColor = "#3d3c3c";
    node.style.display = "flex";
    node.style.flexDirection = "column";
    node.style.flexShrink = "0";
    node.style.overflowY = "scroll";
    node.style.alignItems = "center";

    node = document.getElementById("flex_hozizontal_2");
    node.style.height = "10%";

    node = document.getElementById("ing_counter_section");
    node.style.display = "flex";
    node.style.justifyContent = "center";
    node.style.alignItems = "center";
}

function switchToOpenposeEditor() {
    parent = document.getElementById("app_window");
    newChild = document.getElementById("container_openpose");
    oldChild = document.getElementById("container_intermission");
    parent.replaceChild(newChild, oldChild);
}

function setTotal(numberOfImages) {
    total = numberOfImages;
}

// [WIP] Function that changes the content of the pair object to what has been sent to the frontend.
function updatePair(receivedImg, receivedFigures) {
    newFigures = [];

    for (let i = 0; i < newFigures.length; i++) {
        newFigures.push(JSON.parse(receivedFigures[i]));
    }

    pair.figures = newFigures;

    // [WIP]
    pair.img = newImg;
}

function displayFigureData() {
    parent = document.getElementById("settings_section");

    for (let i = 0; i < pair.figures.length; i++) {
        figure = pair.figures[i];
        keys = Object.keys(figure);
        values = Object.values(figure);

        for (let j = 0; j < keys.length; j++) {
            const div00 = document.createElement("div");
            div00.className = "Landmarks_Entry";
            div00.id = "figure_" + i + "_" + keys[j] + "_entry";
            parent.appendChild(div00);

            const p00 = document.createElement("p");
            p00.innerText = "Figure " + i;
            div00.appendChild(p00);

            const p01 = document.createElement("p");
            p01.innerText = keys[j];
            div00.appendChild(p01);

            const p02 = document.createElement("p");
            p02.id = keys[j] + "_vector";
            p02.innerText = "(" + values[j].toString() + ")";
            div00.appendChild(p02);
        }
    }
}

function displayLatestFigureData() {
    index = pair.figures.length-1;
    parent = document.getElementById("settings_section");

    figure = pair.figures[index];
    keys = Object.keys(figure);
    values = Object.values(figure);

    for (let i = 0; i < keys.length; i++) {
        const div00 = document.createElement("div");
        div00.className = "Landmarks_Entry";
        div00.id = "figure_" + index + "_" + keys[i] + "_entry";
        parent.appendChild(div00);

        const p00 = document.createElement("p");
        p00.innerText = "Figure " + index;
        div00.appendChild(p00);

        const p01 = document.createElement("p");
        p01.innerText = keys[i];
        div00.appendChild(p01);

        const p02 = document.createElement("p");
        p02.id = keys[i] + "_vector";
        p02.innerText = "(" + values[i].toString() + ")";
        div00.appendChild(p02);
    }
}

function editDisplayedLandmarkEntry(figure_num, landmark, vector) {

}

// Function that inserts the given image into the img tag.
function insertImage() {

}

function incrementCursor() {
    landmarks = Object.keys(openepose_keypoints);
    
    if (cursor.key == landmarks[landmarks.length-1]) {
        return;
    }

    for (let i = 0; i < landmarks.length-1; i++) {
        if (cursor.key == landmarks[i]) {
            cursor.key = landmarks[i+1];
        }
    }
}

function decrementCursor() {
    landmarks = Object.keys(openepose_keypoints);
    
    if (cursor.key == landmarks[0]) {
        return;
    }

    for (let i = 1; i < landmarks.length; i++) {
        if (cursor.key == landmarks[i]) {
            cursor.key = landmarks[i-1];
        }
    }
}

function setKeyOfCursor(landmark) {
    cursor.key = landmark;
}

function resetCursor() {
    cursor.figure = 0;
    cursor.key = "nose";
}

function incrementIndex() {
    index++;
    document.getElementById("image_counter").innerText = `This is image ${index} out of ${total}.`;
}

function decrementIndex() {
    index--;
    document.getElementById("image_counter").innerText = `This is image ${index} out of ${total}.`;
}