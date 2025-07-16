import cv2
import glob
import json
import numpy as np
from PIL import Image

from template import OPENPOSE_KEYPOINTS, KEYPOINT_COLORS, OPENPOSE_RELATIONS, RELATION_COLORS, RENDER_ORDER

# Global variables
EDGE_THICKNESS = 2
VERTEX_RADIUS = 4
VERTEX_THICKNESS = -1
MIN_CONFIDENCE = 0.05

CURRENT_INDEX = 0

# Function that is not a placeholder. Images must be retrieved from input_batch to imitate receiving images as input.
def retrieveImages():
    image_list = []
    
    for filename in glob.glob('node_input/*.png'): #assuming gif
        img = Image.open(filename)
        image_list.append(img)

    return image_list

# A function that will be directly used in the node. Converts python format for openpsoe_data and render_order into .json files for transmission.
def convertToJSON(dict):
    return json.dumps(dict, indent=4)

# A function that will be directly used in the node. Converts .json to python format. Will be necessary once "Send All" has been clicked and confirmed.
def convertToDict(json_file):
    return json.load(json_file)

# A function that will be directly used in the node. Creates new list that contains lists of three elements: [image, openpose_data, render_order]
def pairWithOpenposeAndRenderData(truples, ref_imgs):
    keypoints_json = convertToJSON(OPENPOSE_KEYPOINTS)

    for img in ref_imgs:
        truples.append([img,[keypoints_json,],RENDER_ORDER])

    return truples

# A function that will be directly used in the node. Renders a relation. Checks if both vertices have been rendered.
def renderRelation(op_img, relation):
    x1, y1 = OPENPOSE_KEYPOINTS[OPENPOSE_RELATIONS[relation][0]][0], OPENPOSE_KEYPOINTS[OPENPOSE_RELATIONS[relation][0]][1]
    x2, y2 = OPENPOSE_KEYPOINTS[OPENPOSE_RELATIONS[relation][1]][0], OPENPOSE_KEYPOINTS[OPENPOSE_RELATIONS[relation][1]][1]
    cv2.line(op_img, (x1, y1), (x2, y2), RELATION_COLORS[relation], EDGE_THICKNESS)

# A function that will be directly used in the node. Renders a vertex. Dosn't render when c < 0.05 and if out of bounds.
def renderKeypoint(op_img, landmark):
    x, y = OPENPOSE_KEYPOINTS[landmark][0], OPENPOSE_KEYPOINTS[landmark][1]
    cv2.circle(op_img, (x, y), VERTEX_RADIUS, KEYPOINT_COLORS[landmark], VERTEX_THICKNESS)

# A function that will be directly used in the node. Removes all graphical elements from the render order that shouldn't be rendered.
def cleanUpRenderList(width, height, truples):
    # Go through all the figures that exist.
    for i in range(0, len(truples[1])):
        # For figure i, go through each keypoint.
        for key in truples[1][i]:
            # If the keypount is outside of the image or has too low confidence then remove it from the render order.
            if key[0] >= width or key[1] >= height or key[2] < MIN_CONFIDENCE:
                # Go through render order and remove every entry of the figure in question with the useless keypoint.
                for entry in truples[2]:
                    if entry[0] == i and key in entry[1]:
                        truples[2].remove(entry)
    
    return truples[2]

# A function that will be directly used in the node. Goes through the render order and renders all figures based on openpose_data.
def renderOpenposeImage(width, height, truples):
    op_img = np.zeros((width, height, 3), dtype=np.uint8)
    render_order = truples[2]
    
    for entry in render_order:
        if "-" in entry:
            renderRelation(op_img, entry[1])
        else:
            renderKeypoint(op_img, entry[1])
    
    return op_img

# A placeholder function that imitates sending over to the frontend.
def sendToFrontend(truple, index, total_imgs):
    pass

# A placeholder function that imitates receiving the edited truple from frontend.
def receiveFromFrontend():
    pass

# A placeholder function that imitates getting the "Send All" request.
def sendAllMessage():
    pass

# A function that will be directly used in the node. Updates truples.
def updateTruples(index, truples, figures, render_order):
    truples[index][1], truples[index][2] = figures, render_order
    return truples

# A function that will be directly used in the node. The main function of the node that coordinates the other functions and will return a batch of
# reference images and a batch of openpose images as the node's output.
def manualOpenposeMain():
    # Node is reached. You will receive the node input. Imitating.
    ref_imgs = retrieveImages()

    # Prepare the lists that you will need.
    CURRENT_INDEX = 0
    truples = []
    total_imgs = len(truples)

    pairWithOpenposeAndRenderData(truples, ref_imgs)
    sendToFrontend(truples[CURRENT_INDEX], CURRENT_INDEX, total_imgs)
    # Small issue with old and new index at this point.
    figures, render_order = receiveFromFrontend()
    truples = updateTruples(CURRENT_INDEX, truples, figures, render_order)

    cv2.imwrite('node_output/openpose_rendered.png', canvas)