function lightUpChildren(div_element) {
    const p_collection = div_element.children;

    for (let i = 0; i < p_collection.length; i++) {
        p_collection[i].style.color = "#f19224";
    }
}

function dimChildren(div_element) {
    const p_collection = div_element.children;

    for (let i = 0; i < p_collection.length; i++) {
        p_collection[i].style.color = "white";
    }
}

function retrieveJSON() {
    // fetch returns as Promise<Response> object that both .then and the one .catch call upon.
    // What fetch returns must here be returned by the function retrieveJSON()
    return fetch('frontend/figure1.json')
    .then(response => {
        // fetch will raise an error for network errors but not for HTTP errors, which must be covered here.
        if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    });
}

function listFigureLandmarks(JSONObj) {
    let i = 0;
    const parent = document.getElementById("landmarks_list");

    for (let key in JSONObj) {
        const entry = document.createElement("div");
        entry.className = "Landmarks_Entry";
        entry.id = "landmark_entry_" + i;

        const figure_number = document.createElement("p");
        figure_number.id = "figure_number_" + 1;
        figure_number.innerText = "Figure 1";

        const landmark = document.createElement("p");
        landmark.id = "landmark_" + i;
        landmark.innerText = key;

        const vector = document.createElement("p");
        vector.id = "vector_" + i;
        vector.innerText = JSONObj[key].toString();

        parent.appendChild(entry);
        entry.appendChild(figure_number);
        entry.appendChild(landmark);
        entry.appendChild(vector);

        // If I type in arguments, the function is run immediately. To avoid that
        // I use arror functions or anonymous functions.
        entry.addEventListener("mouseover", () => lightUpChildren(entry));
        entry.addEventListener("mouseleave", () => dimChildren(entry));

        i++;
    }
}