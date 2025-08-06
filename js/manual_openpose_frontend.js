import { openpose_keypoints, openpose_relations, render_order, keypoint_colors, relation_colors } from "./templates.js"; // "./" must be added to signify relative path.

import { api } from "../../scripts/api.js"

// Global variables.
const pair = { image: null, figures: [] };
const cursor = { figure: 0, key: "nose" };
let index = 0;
let total = 0;
// These global variables are necessary to clean a previous canvas whose scale will possibly change.
let canv_height = 1;
let canv_width = 1;

const MIN_CONFIDENCE = 0.05;
const KEYPOINT_RADIUS = 9;
const EDGE_THICKNESS = 7;

// EventListener for signalling from backend.
api.addEventListener("first-call", (event) => {
    console.log("Reached the start of first-call.");
    initialize();
    drawAppWindow();
    drawIntermission();
    drawOpenposeEditor();
    setTotal(event.detail.total_imgs);
    console.log("Reached the end of first-call.");
})

api.addEventListener("send-next-image", (event) => {
    console.log("Reached the start of send-next-image.");
    const encodedImage = event.detail.image_base64;
    const figuresList = event.detail.sent_figures;
    const blob = new Blob([Uint8Array.from(atob(encodedImage), c => c.charCodeAt(0))], { type: 'image/png' })
    const url = URL.createObjectURL(blob)

    updatePair(blob, figuresList);
    insertImage(url);

    if (document.getElementById("app_window").firstChild == document.getElementById("container_intermission")) {
        console.log("Reached inside equivalent checker.");
        switchToOpenposeEditor();
    }

    displayFigureData();
    console.log("Reached the end of send-next-image.");
})

api.addEventListener("terminate-frontend", () => {
    document.getElementById("app_window").remove();
    document.getElementById("container_openpose").remove();
    document.getElementById("container_intermission").remove();
})

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
    div00.id = "container_intermission";
    document.getElementById("app_window").appendChild(div00);

    const p00 = document.createElement("p");
    p00.className = "Arial25";
    p00.id = "intermission_text";
    p00.innerText = "Waiting to receive backend data..."
    div00.appendChild(p00);

    div00.style =
    `display: flex;
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

    // Flex_Horizontal divs themselves are ordered vertically inside the Container div and differentiated with the ID flex_horizontal_1/2.
    // Horizontal_First is the horizontally ordered first div inside of a Flex_Horizontal div.
    // Horizontal_Second in the horizontally ordered second div.

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
    p02.innerText = `This is image ${index+1} out of ${total}.`;
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
        let rect = node.getBoundingClientRect();
        let x_pos = event.clientX - rect.left;
        let y_pos = event.clientY - rect.top;

        changeLandmarkEntry(cursor.figure, cursor.key, [x_pos, y_pos, 0.95]);
    });

    node = document.getElementById("openpose_canvas");
    node.style.position = "absolute";
    node.style.pointerEvents = "none"; // So the canvas that is on top of the image definitely doesn't interfer.
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

    node = document.getElementById("flex_horizontal_2");
    node.style.height = "10%";

    node = document.getElementById("img_counter_section");
    node.style.display = "flex";
    node.style.justifyContent = "center";
    node.style.alignItems = "center";

    node = document.getElementById("previous_button");
    node.addEventListener("click", () => {
        if (index == 0) {
            return;
        }

        fetch("/free-block", { 
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                signal: -1,
                figures: pair.figures
            })
        }).then(() => {
            decrementIndex();
        })
    });

    node = document.getElementById("send_all_button");
    node.addEventListener("click", () => {
        fetch("/free-block", { 
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                signal: 0,
                figures: pair.figures
            })
        }).then(() => {
            setIntermissionMessage("Generating Openpose images in backend...")
            switchToIntermission();
        })
    });

    node = document.getElementById("next_button");
    node.addEventListener("click", () => {
        if (index == total-1) {
            return;
        }

        fetch("/free-block", { 
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                signal: 1,
                figures: pair.figures
            })
        }).then(() => {
            decrementIndex();
        })
    });

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

/**
 * Add empty figure data at the end of the array.
 */
function addFigure() {
    // Use template to make a new JS object. Assigning the template directly wouldn't make a copy but assign the same reference to the samce object, which is the template.
    const emptyFigure = Object.assign({}, openpose_keypoints);
    pair.figures.push(emptyFigure);
    // Insert landmark entries in the Openpose landmarks list.
    displayLatestFigureData();
}

/**
 * Either remove the last element or replace the only remaining element with empty figure data.
 */
function removeFigure() {
    index = pair.figures.length-1;
    children = document.querySelectorAll(`div[id^="figure_${index}"]`);

    if (pair.figures.length == 1) {
        const emptyFigure = Object.assign({}, openpose_keypoints);
        pair.figures[0] = emptyFigure;

        for (let child of children) {
            child.remove();
        }

        // We are not only removing a figure in this case but also adding a new, empty figure. Therefore new entries must be made.
        displayFigureData();
        // renderFigure because rendered canvas must be made empty.
        renderFigure();

    } else {
        pair.figures.pop();
        
        for (let child of children) {
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

            div00.addEventListener("mouseover", () => {
                div00.style.borderColor = "#f19224";
            });

            // If an entry is already active then "mouseleave" shouldn't turn it dim again.
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
            
                setCursor(i, keys[j]);
            });
        }
    }

    renderFigure();
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

            setCursor(latestIndex, keys[i]);
        });
    }

    renderFigure();
}

/**
 * Function that inserts the recently received image.
 */
function insertImage(url) {
    const imageElement = document.getElementById("img_reference");
    imageElement.src = url;
}

/**
 * Function create a canvas laid on top of the current image and render an openpose figure on top of it.
 * Due to this being a pixel based method, the entire canvas must be deleten and rendered again if you want to alter parts of it.
 */
function renderFigure() {
    const img_element = document.getElementById("img_reference");
    const canv_element = document.getElementById("openpose_canvas");
    const context = canv_element.getContext("2d");

    // Canvas height/width is not the same as style.height/width. The former changes the resolution while the latter only its size, leading to warping.
    // Resizing canvas wipes previous content also.
    canv_element.height = pair.image.height;
    canv_element.width = pair.image.width;
    canv_element.style.top = `${img_element.offsetTop}px`;
    canv_element.style.left = `${img_element.offsetLeft}px`;

    // Clean previous canvas which may be necessary if the size remained the same.
    context.clearRect(0, 0, canv_width, canv_height);

    // Update new canvis scale.
    canv_height = pair.image.height;
    canv_width = pair.image.width;

    for (let i = 0; i < pair.figures.length; i++) {

        const figure = pair.figures[i];

        for (let j = 0; j < render_order.length; j++) {

            const element = render_order[j];

            if (element.includes("-")) {
                let [kp1, kp2] = openpose_relations.get(element);

                if (figure[kp1][2] < MIN_CONFIDENCE || figure[kp2][2] < MIN_CONFIDENCE) {
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

/**
 * Function meant to increment the cursor unless we are already at the end of the landmarks list.
 * @param {div} entry The current entry that the cursor points to.
 */
function incrementCursor(entry) {
    const nextSibling = entry.nextElementSibling;
    const lastChild = document.getElementById("figure_add_remove_buttons");

    // How to react if it was the last entry in the list.
    if (nextSibling == lastChild) {
        return;
    }

    nextSibling.dispatchEvent(new Event('click'));
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