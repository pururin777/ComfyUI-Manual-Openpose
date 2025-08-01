import { openepose_keypoints, openepose_relations, render_order, keypoint_colors, relation_colors } from "templates.js";

// Global variables.
const pair = {};
const cursor = {};
let index = null;
let total = null;
let canv_height = null;
let canv_width = null;

MIN_CONFIDENCE = 0.05;
KEYPOINT_RADIUS = 9;
EDGE_THICKNESS = 7;
 
/**
 * Whenever the frontend is called at the next generation, reset the values of the global variables.
 */
function initialize() {
    pair.image = null;
    pair.figures = [];
    cursor.figure = 0;
    cursor.key = "nose";
    index = 0;
    total = 0;
    canv_height = 1;
    canv_width = 1;
}

/**
 * Add empty figure data at the end of the array.
 */
function addFigure() {
    const emptyFigure = Object.assign({}, openepose_keypoints);
    pair.figures.push(emptyFigure);
    displayLatestFigureData();
}

/**
 * Either remove the last element or replace the only remaining element with empty figure data.
 */
function removeFigure() {
    index = pair.figures.length-1;
    children = document.querySelectorAll(`div[id^="figure_${index}"]`);

    if (pair.figures.length == 1) {
        const emptyFigure = Object.assign({}, openepose_keypoints);
        pair.figures[0] = emptyFigure;

        for (child in children) {
            child.remove();
        }

        displayFigureData();
        renderFigure();

    } else {
        pair.figures.pop();
        
        for (child in children) {
            child.remove();
        }

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

    // Render the openpose figure(s) again based on the updated vector.
    renderFigure();

    // Send the current entry div element and increment the cursor.
    const entry = document.getElementById("figure_" + figure_num + "_" + landmark + "_entry");
    incrementCursor(entry);
}

/**
 * Function that coordinates what happens in frontend.
 */
function main() {
    initialize();
    drawAppWindow();
    drawIntermission();
    drawOpenposeEditor();

    // [WIP]
    // Waiting for backend message.
    setTotal(totalImages);
    updatePair(img, figures);
    // Changing to OpenposeEditor after receiving all necessary data.
    switchToOpenposeEditor();
    displayFigureData();

}

// [WIP] A function triggered by an evenListener which receives how many images there are in total and then assigns the value to total.
// [WIP] A function triggered by an evenListener which receives figure data from backend and updates the pair object.

/**
 * Function that lays out app_window which contains the transmission or openpose editor.
 */
function drawAppWindow() {
    // Creating and setting elements and other nodes.
    const div00 = document.createElement("div");
    div00.id = "app_window";
    document.body.appendChild(div00);

    // ID related style modification.
    let appWindowHeight = screen.availHeight * 0.8;
    let appWindowWidth = screen.availWidth * 0.8;

    div00.style =
    `height: ${appWindowHeight}px;
    width: ${appWindowWidth}px;
    position: fixed;
    left: 10%;
    top: 5%;
    border-radius: 5px;
    background-color: #575555;`;
}

/**
 * Function that graphically lays out the transmission. Is shown first when frontend become active.
 */
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

/**
 * Function that displays the transmission as opposed to the openpose editor.
 */
function switchToIntermission() {
    const parent = document.getElementById("app_window");
    const newChild = document.getElementById("container_intermission");
    const oldChild = document.getElementById("container_openpose");
    parent.replaceChild(newChild, oldChild);
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

    const canv = document.createElement("canv");
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
    div09.className = "Figure_Button";
    div09.id = "next_button";
    div06.appendChild(div09);

    const p05 = document.createElement("p");
    p05.className = "Arial25";
    p05.innerText = "Next";
    div09.appendChild(p05);

    const div10 = document.createElement("div");
    div10.id = "figure_add_remove_buttons";
    div10.appendChild(div03);

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
    div11.appendChild(p07);

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
        nodeList[i].style =
        `width: auto;
        border: 3px solid #acacac;
        border-radius: 8px;
        margin: 0px 10px;
        padding: 5px;
        cursor: pointer;`;

        nodeList[i].addEventListener("mouseover", () => {
            nodeList[i].style.borderColor = "#f19224";
        });

        nodeList[i].addEventListener("mouseleave", () => {
            nodeList[i].style.borderColor = "#acacac";
        });

        nodeList[i].addEventListener("click", () => {
            nodeList[i].firstChild.style.color = "#f19224";
        });

        nodeList[i].addEventListener("mouseup", () => {
            nodeList[i].firstChild.style.color = "#acacac";
        });
    }

    nodeList = document.querySelectorAll("div.Figure_Button");
    for (let i = 0; i < nodeList.length; i++) {
        nodeList[i].style =
        `width: auto;
        border: 3px solid #acacac;
        border-radius: 8px;
        margin: 0px 10px;
        padding: 5px;
        cursor: pointer;`;

        nodeList[i].addEventListener("mouseover", () => {
            nodeList[i].style.borderColor = "#f19224";
        });

        nodeList[i].addEventListener("mouseleave", () => {
            nodeList[i].style.borderColor = "#acacac";
        });

        nodeList[i].addEventListener("click", () => {
            nodeList[i].firstChild.style.color = "#f19224";
        });

        nodeList[i].addEventListener("mouseup", () => {
            nodeList[i].firstChild.style.color = "#acacac";
        });
    }

    nodeList = document.querySelectorAll("p.Arial25");
    for (let i = 0; i < nodeList.length; i++) {
        nodeList[i].style =
        `font-family: Arial, Helvetica, sans-serif;
        font-size: 25px;
        color: white;`;
    }

    nodeList = document.querySelectorAll("p.Arial15");
    for (let i = 0; i < nodeList.length; i++) {
        nodeList[i].style =
        `font-family: Arial, Helvetica, sans-serif;
        font-size: 15px;
        color: white;`;
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

    node.addEventListener("click", event => {
        let rect = image.getBoundingClientRect();
        let x_pos = event.clientX - rect.left;
        let y_pos = event.clientY - rect.top;

        changeLandmarkEntry(cursor.figure, cursor.key, [x_pos, y_pos, 0.95]);
    });

    node = document.getElementById("openpose_canvas");
    node.style.position = "absolute";
    node.style.height = "1px";
    node.style.width = "1px";

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

    node = document.getElementById("figure_add_remove_buttons");
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
    const parent = document.getElementById("app_window");
    const newChild = document.getElementById("container_openpose");
    const oldChild = document.getElementById("container_intermission");
    parent.replaceChild(newChild, oldChild);
}

function setTotal(numberOfImages) {
    total = numberOfImages;
}

// [WIP] Function that changes the content of the pair object to what has been sent to the frontend.
function updatePair(receivedImg, receivedFigures) {
    const newFigures = [];

    for (let i = 0; i < newFigures.length; i++) {
        newFigures.push(JSON.parse(receivedFigures[i]));
    }

    pair.figures = newFigures;

    // [WIP]
    pair.img = newImg;
}

function displayFigureData() {
    const parent = document.getElementById("settings_section");
    const last = document.getElementById("figure_add_remove_buttons");

    for (let i = 0; i < pair.figures.length; i++) {
        let figure = pair.figures[i];
        let keys = Object.keys(figure);
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
            p00.className = "Entry_Text";
            p01.innerText = keys[j];
            div00.appendChild(p01);

            let p02 = document.createElement("p");
            p00.className = "Entry_Text";
            p02.id = "figure_" + i + "_" + keys[j] + "_vector";
            p02.innerText = "(" + values[j].toString() + ")";
            div00.appendChild(p02);

            div00.style =
            `width: 99%;
            border: 1px solid #acacac;
            margin: 5px 0px 0px 0px;
            display: flex;
            flex-direction: row;
            flex-shrink: 0;
            overflow: hidden;`;

            p00.style =
            `font-family: Arial, Helvetica, sans-serif;
            font-size: 20px;
            color: white;
            margin: 5px 15px 5px 10px;}`;

            p01.style =
            `font-family: Arial, Helvetica, sans-serif;
            font-size: 20px;
            color: white;
            margin: 5px 15px 5px 10px;}`;

            p02.style =
            `font-family: Arial, Helvetica, sans-serif;
            font-size: 20px;
            color: white;
            margin: 5px 15px 5px 10px;}`;

            // Make the first entry orange at the beginning.
            if (i == 0 && j == 0) {
                div00.style.borderColor = "#f19224";
                p00.style.color = "#f19224";
                p01.style.color = "#f19224";
                p02.style.color = "#f19224";

                resetCursor();
            }

            div00.addEventListener("mouseover", () => {
                div00.style.borderColor = "#f19224";
            });

            div00.addEventListener("mouseleave", () => {
                if (div00.id == "figure_" + cursor.figure + "_" + cursor.key + "_entry") {
                    return;
                }

                div00.style.borderColor = "#acacac";
            });

            // Clicking on this entry's div lights up its text and changes the cursor to this figure and landmark.
            div00.addEventListener("click", () => {
                const entry_frames = document.getElementsByClassName("Landmarks_Entry");
                const paragraphs = document.getElementsByClassName("Entry_Text");

                for (let entry_frame in entry_frames) {
                    entry_frame.style.borderColor = "#acacac";
                }

                for (let paragraph in paragraphs) {
                    paragraph.style.color = "#acacac";
                }

                div00.style.borderColor = "#f19224";
                p00.style.color = "#f19224";
                p01.style.color = "#f19224";
                p02.style.color = "#f19224";
            
                setCursor(i, keys[i]);
            });
        }
    }

    renderFigure();
}

function displayLatestFigureData() {
    let index = pair.figures.length-1;
    const parent = document.getElementById("settings_section");
    const last = document.getElementById("figure_add_remove_buttons");

    const figure = pair.figures[index];
    const keys = Object.keys(figure);
    const values = Object.values(figure);

    for (let i = 0; i < keys.length; i++) {
        let div00 = document.createElement("div");
        div00.className = "Landmarks_Entry";
        div00.id = "figure_" + index + "_" + keys[i] + "_entry";
        parent.insertBefore(div00, last); 

        let p00 = document.createElement("p");
        p00.className = "Entry_Text";
        p00.innerText = "Figure " + index;
        div00.appendChild(p00);

        let p01 = document.createElement("p");
        p00.className = "Entry_Text";
        p01.innerText = keys[i];
        div00.appendChild(p01);

        let p02 = document.createElement("p");
        p00.className = "Entry_Text";
        p02.id = keys[i] + "_vector";
        p02.innerText = "(" + values[i].toString() + ")";
        div00.appendChild(p02);

        div00.style =
        `width: 99%;
        border: 1px solid #acacac;
        margin: 5px 0px 0px 0px;
        display: flex;
        flex-direction: row;
        flex-shrink: 0;
        overflow: hidden;`;

        p00.style =
        `font-family: Arial, Helvetica, sans-serif;
        font-size: 20px;
        color: white;
        margin: 5px 15px 5px 10px;}`;

        p01.style =
        `font-family: Arial, Helvetica, sans-serif;
        font-size: 20px;
        color: white;
        margin: 5px 15px 5px 10px;}`;

        p02.style =
        `font-family: Arial, Helvetica, sans-serif;
        font-size: 20px;
        color: white;
        margin: 5px 15px 5px 10px;}`;

        div00.addEventListener("mouseover", () => {
            div00.style.borderColor = "#f19224"
        });

        div00.addEventListener("mouseleave", () => {
            if (div00.id == "figure_" + cursor.figure + "_" + cursor.key + "_entry") {
                return;
            }

            div00.style.borderColor = "#acacac"
        });

        // Clicking on this entry's div lights up its text and changes the cursor to this figure and landmark.
        div00.addEventListener("click", () => {
            const entry_frames = document.getElementsByClassName("Landmarks_Entry");
            const paragraphs = document.getElementsByClassName("Entry_Text");

            for (let entry_frame in entry_frames) {
                entry_frame.style.borderColor = "#acacac";
            }

            for (let paragraph in paragraphs) {
                paragraph.style.color = "#acacac";
            }

            div00.style.borderColor = "#f19224";
            p00.style.color = "#f19224";
            p01.style.color = "#f19224";
            p02.style.color = "#f19224";

            setCursor(index, keys[i]);
        });
    }

    renderFigure();
}

// Function that inserts the given image into the img tag.
function insertImage() {

}

function renderFigure() {
    const img_element = document.getElementById("img_reference");
    const canv_element = document.getElementById("openpose_canvas");
    const context = canv_element.getContext("2d");

    context.clearRect(0, 0, canv_width, canv_height);

    canv_element.style.top = img_element.offsetTop;
    canv_element.style.left = img_element.offsetLeft;
    canv_element.style.height = pair.image.height;
    canv_element.style.width = pair.image.width;

    canv_height = pair.image.height;
    canv_width = pair.image.width;

    for (let figure in pair.figures) {
        for (let element in render_order) {

            if (element.includes("-")) {
                let [kp1, kp2] = openepose_relations.get(element);

                if (figure[kp1][2] < MIN_CONFIDENCE || figure[kp2][2 < MIN_CONFIDENCE]) {
                    continue;
                }

                let [red, green, blue] = relation_colors.get(element);

                context.beginPath();
                context.moveTo(figure[kp1][0], figure[kp1][1]);
                context.lineTo(figure[kp2][0], figure[kp2][1]);
                context.lineWidth = EDGE_THICKNESS;
                context.strokeStyle = `rgb(${red}, ${green}, ${blue})`;
                context.stroke();

            } else {
                if (figure[element][2] < MIN_CONFIDENCE) {
                    continue;
                }

                let [red, green, blue] = keypoint_colors.get(element);

                context.beginPath();
                context.arc(figure[element][0], figure[element][1], KEYPOINT_RADIUS, 0, 2 * Math.PI);
                context.fillStyle = `rgb(${red}, ${green}, ${blue})`;
                context.fill();

            }
        }
    }
}

function incrementCursor(entry) {
    const nextSibling = entry.nextElementSibling;
    const lastChild = document.getElementById("figure_add_remove_buttons");

    // How to react if it was the last entry in the list.
    if (nextSibling == lastChild) {
        return;
    }

    nextSibling.dispatchEvent(new Event('click'));
}

function setCursor(figure_num, landmark) {
    cursor.figure = figure_num;
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