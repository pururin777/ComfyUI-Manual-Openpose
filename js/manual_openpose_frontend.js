import { openepose_keypoints, openepose_relations, render_order, keypoint_colors, relation_colors } from "templates.js";

// Establish global variables for access.
const pair = {};
let index = null;
let total = null;
 
// Whenever the frontend is called, reset the values of global variables.
function initialize() {
    pair.image = null;
    pair.figures = [];
    index = 0;
    total = 0;
}

// Add empty figure data at the end of the array.
function addFigure() {
    const emptyFigure = Object.assign({}, openepose_keypoints);
    pair.figures.push(emptyFigure);
}

// Either remove the last element or replace the only remaining element with empty figure data.
function removeFigure() {
    if (pair.figures.length == 1) {
        const emptyFigure = Object.assign({}, openepose_keypoints);
        pair.figures[0] = emptyFigure;
    } else {
        pair.figures.pop();
    }
}

// Coordinates frontend functions.
function main() {
    initialize();
    drawAppWindow();
    drawOpenposeEditor();
    drawIntermission();
}

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

function drawOpenposeEditor() {
    const div00 = document.createElement("div");
    div00.className = "Container";
    div00.id = "container_openpose";
    document.getElementById("app_window").appendChild(div00);

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
    div04.id = "settings_buttons";
    div03.appendChild(div04);

    const div05 = document.createElement("div");
    div05.className = "Control_Button";
    div05.id = "landmarks_button";
    div04.appendChild(div05);

    const p00 = document.createElement("p");
    p00.className = "Arial25";
    p00.innerText = "Landmarks Settings";
    div05.appendChild(p00);

    const div06 = document.createElement("div");
    div06.className = "Control_Button";
    div06.id = "render_order_button";
    div04.appendChild(div06);

    const p01 = document.createElement("p");
    p01.className = "Arial25";
    p01.innerText = "Render Order Settings";
    div06.appendChild(p01);

    drawLandmarksList();
    drawRenderOrderList();

    div03.appendChild(document.getElementById("landmarks_list"));
    
    const div07 = document.createElement("div");
    div07.className = "Flex_Horizontal";
    div07.id = "flex_horizontal_2";
    div00.appendChild(div07);

    const div08 = document.createElement("div");
    div08.className = "Horizontal_First";
    div08.id = "img_counter_section";
    div07.appendChild(div08);

    const p02 = document.createElement("p");
    p02.className = "Arial25";
    p02.id = "image_counter";
    p02.innerText = `This is image ${index} out of ${total}.`;
    div08.appendChild(p02);

    const div09 = document.createElement("div");
    div09.className = "Horizontal_Second";
    div09.id = "cont_button_section";
    div07.appendChild(div09);

    const div10 = document.createElement("div");
    div10.className = "Control_Button";
    div10.id = "previous_button";
    div09.appendChild(div10);

    const p03 = document.createElement("p");
    p03.className = "Arial25";
    p03.innerText = "Previous";
    div10.appendChild(p03);

    const div11 = document.createElement("div");
    div11.className = "Control_Button";
    div11.id = "send_all_button";
    div09.appendChild(div11);

    const p04 = document.createElement("p");
    p04.className = "Arial25";
    p04.innerText = "Send All";
    div11.appendChild(p04);

    const div12 = document.createElement("div");
    div12.className = "Control_Button";
    div12.id = "next_button";
    div09.appendChild(div12);

    const p05 = document.createElement("p");
    p05.className = "Arial25";
    p05.innerText = "Next";
    div12.appendChild(p05);

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

    nodeList = document.querySelectorAll("div.Openpose_Settings");
    for (let i = 0; i < nodeList.length; i++) {
        nodeList[i].style =
        `height: 90%;
        border-radius: 4px;
        border: 1px solid #acacac;
        background-color: #3d3c3c;

        display: flex;
        flex-direction: column;
        flex-shrink: 0;
        overflow-y: scroll;
        align-items: center;`;
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
    node.style.display = "flex";
    node.style.flexDirection = "column";
    node.style.flexShrink = "0";
    node.style.overflow = "hidden";

    node = document.getElementById("settings_buttons");
    node.style =
    `height: 10%;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;`;

    node = document.getElementById("flex_hozizontal_2");
    node.style.height = "10%";

    node = document.getElementById("ing_counter_section");
    node.style.display = "flex";
    node.style.justifyContent = "center";
    node.style.alignItems = "center";
}

function drawIntermission() {
    const div00 = document.createElement("div");
    div00.className = "Container";
    div00.id = "container_transmission";

    const p00 = document.createElement("p");
    p00.className = "Arial25";
    p00.id = "intermission_text";
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

function switchToOpenposeEditor() {
    parent = document.getElementById("app_window");
    newChild = document.getElementById("container_openpose");
    oldChild = document.getElementById("container_intermission");
    parent.replaceChild(newChild, oldChild);
}

function switchToLandmarksList() {
    parent = document.getElementById("settings_section");
    newChild = document.getElementById("landmarks_list");
    oldChild = document.getElementById("render_order_list");
    parent.replaceChild(newChild, oldChild);
}

function switchToRenderOrderList() {
    parent = document.getElementById("settings_section");
    newChild = document.getElementById("render_order_list");
    oldChild = document.getElementById("landmarks_list");
    parent.replaceChild(newChild, oldChild);  
}

function insertImage() {
    // Function that inserts the given image into the img tag.
}

function incrementIndex() {
    index++;
    document.getElementById("image_counter").innerText = `This is image ${index} out of ${total}.`;
}

function decrementIndex() {
    index--;
    document.getElementById("image_counter").innerText = `This is image ${index} out of ${total}.`;
}

function setTotal(numberOfImages) {
    total = numberOfImages;
}

function drawLandmarksList() {
    const div00 = document.createElement("div");
    div00.className = "Openpose_Settings";
    div00.id = "landmarks_list";
}

function drawRenderOrderList() {
    const div00 = document.createElement("div");
    div00.className = "Openpose_Settings";
    div00.id = "render_order_list";
}